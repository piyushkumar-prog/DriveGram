package services

import (
	"context"
	"drivegram/internal/models"
	"io"
	"os"
	"path/filepath"
	"strings"

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
	// Create temporary file path
	tempPath := filepath.Join("./data/temp", filename)
	if err := os.MkdirAll("./data/temp", 0755); err != nil {
		return nil, err
	}

	// Save file temporarily
	tempFile, err := os.Create(tempPath)
	if err != nil {
		return nil, err
	}
	defer tempFile.Close()

	_, err = tempFile.ReadFrom(file)
	if err != nil {
		return nil, err
	}

	// Get user info for Telegram
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	// Upload to Telegram
	telegramFile, err := s.telegramService.UploadFile(ctx, tempPath, user.TelegramID)
	if err != nil {
		os.Remove(tempPath) // Clean up temp file
		return nil, err
	}

	// Clean up temp file
	os.Remove(tempPath)

	// Save file metadata to database
	fileRecord := &models.File{
		Name:           sanitizeFilename(filename),
		OriginalName:   filename,
		Size:           size,
		MimeType:       getMimeType(filename),
		TelegramFileID: telegramFile.TelegramFileID,
		TelegramMsgID:  telegramFile.TelegramMsgID,
		UserID:         userID,
		FolderID:       folderID,
	}

	if err := s.db.Create(fileRecord).Error; err != nil {
		return nil, err
	}

	return fileRecord, nil
}

func (s *FileService) GetFiles(userID uint, folderID *uint) ([]models.File, error) {
	var files []models.File
	query := s.db.Where("user_id = ?", userID)

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

	// Download from Telegram to temporary location
	tempPath := filepath.Join("./data/downloads", file.OriginalName)
	if err := os.MkdirAll("./data/downloads", 0755); err != nil {
		return "", err
	}

	err = s.telegramService.DownloadFile(ctx, file.TelegramFileID, tempPath)
	if err != nil {
		return "", err
	}

	return tempPath, nil
}

func (s *FileService) StreamFile(ctx context.Context, userID uint, fileID uint) (interface {
	io.ReadCloser
}, int64, error) {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return nil, 0, err
	}

	reader, size, err := s.telegramService.StreamFile(ctx, file.TelegramFileID)
	if err != nil {
		return nil, 0, err
	}

	return reader, size, nil
}

func (s *FileService) DeleteFile(ctx context.Context, userID uint, fileID uint) error {
	file, err := s.GetFile(userID, fileID)
	if err != nil {
		return err
	}

	// Delete from Telegram
	if err := s.telegramService.DeleteFile(ctx, file.TelegramMsgID); err != nil {
		return err
	}

	// Delete from database
	return s.db.Delete(file).Error
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

	if err := s.db.Where("user_id = ? AND (LOWER(name) LIKE ? OR LOWER(original_name) LIKE ?)",
		userID, searchQuery, searchQuery).
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
