package services

import (
	"context"
	"drivegram/internal/models"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
)

type FileService struct {
	db              *gorm.DB
	telegramService *TelegramService
}

func NewFileService(db *gorm.DB, telegramService *TelegramService) *FileService {
	return &FileService{
		db:              db,
		telegramService: telegramService,
	}
}

func (s *FileService) UploadFile(ctx context.Context, userID uint, folderID *uint, file io.Reader, size int64, filename string) (*models.File, error) {
	safeName := sanitizeFilename(filepath.Base(filename))

	// Create temporary file path
	tempPath := filepath.Join("./data/temp", safeName)
	if err := os.MkdirAll("./data/temp", 0755); err != nil {
		return nil, err
	}

	// Save file temporarily
	tempFile, err := os.Create(tempPath)
	if err != nil {
		return nil, err
	}

	_, err = tempFile.ReadFrom(file)
	if err != nil {
		tempFile.Close()
		return nil, err
	}
	if err := tempFile.Close(); err != nil {
		return nil, err
	}

	// Get user info for Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	// Upload to Telegram
	telegramFile, err := s.telegramService.UploadFile(ctx, user.SessionData, tempPath)
	if err != nil {
		os.Remove(tempPath) // Clean up temp file
		return nil, err
	}

	// Persist a local copy so download/stream works reliably in mock mode.
	storageDir := filepath.Join("./data/storage", fmt.Sprintf("%d", userID))
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		os.Remove(tempPath)
		return nil, err
	}
	storedFilePath := filepath.Join(storageDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeName))
	if err := moveFileWithRetry(tempPath, storedFilePath); err != nil {
		os.Remove(tempPath)
		return nil, err
	}

	// Save file metadata to database
	fileRecord := &models.File{
		Name:               safeName,
		OriginalName:       filename,
		Size:               size,
		MimeType:           getMimeType(filename),
		TelegramFileID:     telegramFile.TelegramFileID,
		TelegramAccessHash: telegramFile.TelegramAccessHash,
		TelegramMsgID:      telegramFile.TelegramMsgID,
		UserID:             userID,
		FolderID:           folderID,
		FilePath:           storedFilePath,
	}

	if err := s.db.Create(fileRecord).Error; err != nil {
		return nil, err
	}

	return fileRecord, nil
}

func (s *FileService) GetFiles(userID uint, folderID *uint) ([]models.File, error) {
	var files []models.File
	query := s.db.Where("user_id = ? AND is_trashed = ?", userID, false)

	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	} else {
		query = query.Where("folder_id IS NULL")
	}

	if err := query.Order("created_at DESC").Find(&files).Error; err != nil {
		return nil, err
	}

	return files, nil
}

func (s *FileService) GetFile(userID uint, fileID uint) (*models.File, error) {
	var file models.File
	if err := s.db.Where("id = ? AND user_id = ?", fileID, userID).First(&file).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (s *FileService) DownloadFile(ctx context.Context, userID uint, fileID uint) (string, error) {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return "", err
	}

	// Prefer local persisted copy when available.
	if file.FilePath != "" {
		if _, err := os.Stat(file.FilePath); err == nil {
			return file.FilePath, nil
		}
	}

	if err := os.MkdirAll("./data/downloads", 0755); err != nil {
		return "", err
	}

	// Cache path using file ID to ensure uniqueness
	cachePath := filepath.Join("./data/downloads", fmt.Sprintf("%d_%s", file.ID, file.OriginalName))
	
	// If it's already fully downloaded, serve from cache immediately!
	if info, err := os.Stat(cachePath); err == nil && info.Size() == file.Size {
		return cachePath, nil
	}

	// Download to a .tmp file to avoid Windows file lock errors if multiple 
	// range requests (like from a <video> tag) try to download simultaneously.
	tempPath := fmt.Sprintf("%s_%d.tmp", cachePath, time.Now().UnixNano())

	// Get user info for Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return "", err
	}

	err = s.telegramService.DownloadFile(ctx, user.SessionData, *file, tempPath)
	if err != nil {
		_ = os.Remove(tempPath)
		return "", err
	}

	if info, err := os.Stat(tempPath); err != nil || info.Size() == 0 {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("downloaded file not found or empty")
	}

	// Rename the temp file to the final cache path
	_ = os.Remove(cachePath) // ignore error if it doesn't exist
	if err := os.Rename(tempPath, cachePath); err != nil {
		// If rename fails (e.g. locked), just serve the temp file this one time
		return tempPath, nil
	}

	return cachePath, nil
}

func (s *FileService) StreamFile(ctx context.Context, userID uint, fileID uint) (interface {
	io.ReadCloser
}, int64, error) {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return nil, 0, err
	}

	// Prefer local persisted copy when available.
	if file.FilePath != "" {
		localFile, err := os.Open(file.FilePath)
		if err == nil {
			info, statErr := localFile.Stat()
			if statErr != nil {
				localFile.Close()
				return nil, 0, statErr
			}
			return localFile, info.Size(), nil
		}
	}

	// Get user info for Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, 0, err
	}

	reader, size, err := s.telegramService.StreamFile(ctx, user.SessionData, *file)
	if err != nil {
		return nil, 0, err
	}

	return reader, size, nil
}

// StreamRange streams a byte range of the file into w.
// If the file is already cached on disk, it reads the range from disk.
// Otherwise it streams directly from Telegram at the given offset.
func (s *FileService) StreamRange(ctx context.Context, userID uint, fileID uint, start int64, length int64, w io.Writer) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}

	// If fully cached on disk, serve range from local file — instant & O(1) seeks
	servePaths := []string{}
	if file.FilePath != "" {
		servePaths = append(servePaths, file.FilePath)
	}
	cachePath := filepath.Join("./data/downloads", fmt.Sprintf("%d_%s", file.ID, file.OriginalName))
	if info, err := os.Stat(cachePath); err == nil && info.Size() >= file.Size {
		servePaths = append([]string{cachePath}, servePaths...)
	}

	for _, p := range servePaths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		defer f.Close()
		if _, err := f.Seek(start, io.SeekStart); err != nil {
			continue
		}
		if length > 0 {
			_, err = io.CopyN(w, f, length)
		} else {
			_, err = io.Copy(w, f)
		}
		return err
	}

	// Not cached — stream the range live from Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	return s.telegramService.StreamToWriter(ctx, user.SessionData, *file, start, length, w)
}

// TrashFile moves a file to the trash (soft-delete only — Telegram message is NOT deleted).
func (s *FileService) TrashFile(userID uint, fileID uint) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}
	now := time.Now()
	return s.db.Model(file).Updates(map[string]interface{}{
		"is_trashed": true,
		"trashed_at": now,
	}).Error
}

// RestoreFile moves a file out of the trash back to its original location.
func (s *FileService) RestoreFile(userID uint, fileID uint) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}
	return s.db.Model(file).Updates(map[string]interface{}{
		"is_trashed": false,
		"trashed_at": nil,
	}).Error
}

// GetTrashedFiles returns all files in the trash for a user.
func (s *FileService) GetTrashedFiles(userID uint) ([]*models.File, error) {
	var files []*models.File
	if err := s.db.Where("user_id = ? AND is_trashed = ?", userID, true).
		Order("trashed_at DESC").Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

// DeleteFile permanently deletes a file — deletes from Telegram + database.
// Only called from EmptyTrash or explicit permanent-delete from trash.
func (s *FileService) DeleteFile(ctx context.Context, userID uint, fileID uint) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}

	// Get user info for Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	// Delete message from Telegram
	if err := s.telegramService.DeleteFile(ctx, user.SessionData, file.TelegramMsgID); err != nil {
		return err
	}

	// Best-effort cleanup of local persisted file
	if file.FilePath != "" {
		_ = os.Remove(file.FilePath)
	}

	return s.db.Delete(file).Error
}

// EmptyTrash permanently deletes all trashed files for a user.
func (s *FileService) EmptyTrash(ctx context.Context, userID uint) error {
	trashedFiles, err := s.GetTrashedFiles(userID)
	if err != nil {
		return err
	}
	for _, f := range trashedFiles {
		// Ignore errors on individual files — best effort
		_ = s.DeleteFile(ctx, userID, f.ID)
	}
	return nil
}

func (s *FileService) SyncTelegramFiles(ctx context.Context, userID uint) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	tgFiles, err := s.telegramService.GetUserFiles(ctx, user.SessionData)
	if err != nil {
		return err
	}

	for _, tgFile := range tgFiles {
		// Check if file already exists
		var existing models.File
		err := s.db.Where("user_id = ? AND telegram_file_id = ?", userID, tgFile.TelegramFileID).First(&existing).Error
		if err == nil {
			continue // Already exists
		}

		// Save new file record
		tgFile.UserID = userID
		if err := s.db.Create(tgFile).Error; err != nil {
			fmt.Printf("Error saving synced file: %v\n", err)
		}
	}

	return nil
}

func (s *FileService) CreateFolder(userID uint, name string, parentID *uint) (*models.Folder, error) {
	folder := &models.Folder{
		Name:     sanitizeFilename(name),
		UserID:   userID,
		ParentID: parentID,
	}

	if err := s.db.Create(folder).Error; err != nil {
		return nil, err
	}

	return folder, nil
}

func (s *FileService) GetFolders(userID uint, parentID *uint) ([]models.Folder, error) {
	var folders []models.Folder
	query := s.db.Where("user_id = ?", userID)

	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}

	if err := query.Order("name ASC").Find(&folders).Error; err != nil {
		return nil, err
	}

	return folders, nil
}

func (s *FileService) SearchFiles(userID uint, query string) ([]models.File, error) {
	var files []models.File
	searchQuery := "%" + strings.ToLower(query) + "%"

	if err := s.db.Where("user_id = ? AND is_trashed = ? AND (LOWER(name) LIKE ? OR LOWER(original_name) LIKE ?)",
		userID, false, searchQuery, searchQuery).
		Order("created_at DESC").
		Find(&files).Error; err != nil {
		return nil, err
	}

	return files, nil
}

func (s *FileService) RenameFile(userID uint, fileID uint, newName string) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}

	return s.db.Model(file).Update("name", sanitizeFilename(newName)).Error
}

// Helper functions
func sanitizeFilename(filename string) string {
	// Remove or replace invalid characters
	invalid := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	sanitized := filename
	for _, char := range invalid {
		sanitized = strings.ReplaceAll(sanitized, char, "_")
	}
	return sanitized
}

func getMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeTypes := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".mp4":  "video/mp4",
		".avi":  "video/avi",
		".mov":  "video/quicktime",
		".mp3":  "audio/mpeg",
		".wav":  "audio/wav",
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".txt":  "text/plain",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
	}

	if mimeType, exists := mimeTypes[ext]; exists {
		return mimeType
	}
	return "application/octet-stream"
}

func moveFileWithRetry(src, dst string) error {
	var lastErr error
	for i := 0; i < 8; i++ {
		if err := os.Rename(src, dst); err == nil {
			return nil
		} else {
			lastErr = err
			time.Sleep(120 * time.Millisecond)
		}
	}

	if err := copyFileWithRetry(src, dst); err != nil {
		if lastErr != nil {
			return fmt.Errorf("%w (copy fallback failed: %v)", lastErr, err)
		}
		return err
	}

	_ = os.Remove(src)
	return nil
}

func copyFileWithRetry(src, dst string) error {
	var lastErr error
	for i := 0; i < 8; i++ {
		in, err := os.Open(src)
		if err != nil {
			lastErr = err
			time.Sleep(120 * time.Millisecond)
			continue
		}

		out, err := os.Create(dst)
		if err != nil {
			in.Close()
			lastErr = err
			time.Sleep(120 * time.Millisecond)
			continue
		}

		_, copyErr := io.Copy(out, in)
		closeOutErr := out.Close()
		closeInErr := in.Close()
		if copyErr == nil && closeOutErr == nil && closeInErr == nil {
			return nil
		}

		if copyErr != nil {
			lastErr = copyErr
		} else if closeOutErr != nil {
			lastErr = closeOutErr
		} else {
			lastErr = closeInErr
		}
		time.Sleep(120 * time.Millisecond)
	}

	return lastErr
}
