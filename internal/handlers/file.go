package handlers

import (
	"drivegram/internal/services"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	fileService *services.FileService
}

func NewFileHandler(fileService *services.FileService) *FileHandler {
	return &FileHandler{
		fileService: fileService,
	}
}

type FileResponse struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	OriginalName string `json:"original_name"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mime_type"`
	CreatedAt    string `json:"created_at"`
	FolderID     *uint  `json:"folder_id"`
}

type FolderResponse struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Path     string `json:"path"`
	ParentID *uint  `json:"parent_id"`
}

func (h *FileHandler) GetFiles(c *gin.Context) {
	userID := c.GetUint("user_id")
	folderIDStr := c.Query("folder_id")

	var folderID *uint
	if folderIDStr != "" {
		if id, err := strconv.ParseUint(folderIDStr, 10, 32); err == nil {
			fid := uint(id)
			folderID = &fid
		}
	}

	files, err := h.fileService.GetFiles(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get folders
	folders, err := h.fileService.GetFolders(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	fileResponses := make([]FileResponse, len(files))
	for i, file := range files {
		fileResponses[i] = FileResponse{
			ID:           file.ID,
			Name:         file.Name,
			OriginalName: file.OriginalName,
			Size:         file.Size,
			MimeType:     file.MimeType,
			CreatedAt:    file.CreatedAt.Format("2006-01-02T15:04:05Z"),
			FolderID:     file.FolderID,
		}
	}

	folderResponses := make([]FolderResponse, len(folders))
	for i, folder := range folders {
		folderResponses[i] = FolderResponse{
			ID:       folder.ID,
			Name:     folder.Name,
			Path:     folder.Path,
			ParentID: folder.ParentID,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"files":   fileResponses,
		"folders": folderResponses,
	})
}

func (h *FileHandler) UploadFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	folderIDStr := c.PostForm("folder_id")

	var folderID *uint
	if folderIDStr != "" {
		if id, err := strconv.ParseUint(folderIDStr, 10, 32); err == nil {
			fid := uint(id)
			folderID = &fid
		}
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Upload file
	uploadedFile, err := h.fileService.UploadFile(c.Request.Context(), userID, folderID, file, header.Size, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := FileResponse{
		ID:           uploadedFile.ID,
		Name:         uploadedFile.Name,
		OriginalName: uploadedFile.OriginalName,
		Size:         uploadedFile.Size,
		MimeType:     uploadedFile.MimeType,
		CreatedAt:    uploadedFile.CreatedAt.Format("2006-01-02T15:04:05Z"),
		FolderID:     uploadedFile.FolderID,
	}

	c.JSON(http.StatusCreated, response)
}

func (h *FileHandler) DownloadFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileIDStr := c.Param("id")

	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	file, err := h.fileService.GetFile(userID, uint(fileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Get file path from Telegram service
	filePath, err := h.fileService.DownloadFile(c.Request.Context(), userID, uint(fileID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Set headers for download/inline preview
	disposition := "attachment"
	if c.Query("inline") == "1" || c.Query("inline") == "true" {
		disposition = "inline"
	}
	c.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, file.OriginalName))
	c.Header("Content-Type", file.MimeType)
	c.File(filePath)
}

func (h *FileHandler) SyncFiles(c *gin.Context) {
	userID := c.GetUint("user_id")

	err := h.fileService.SyncTelegramFiles(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sync completed successfully"})
}

func (h *FileHandler) StreamFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileIDStr := c.Param("id")

	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	file, err := h.fileService.GetFile(userID, uint(fileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	totalSize := file.Size
	mimeType := file.MimeType

	// Parse Range header — browser sends "bytes=0-", "bytes=1024-2047", etc.
	rangeHeader := c.GetHeader("Range")
	start := int64(0)
	end := totalSize - 1

	if rangeHeader != "" {
		// Trim "bytes=" prefix
		rangeStr := strings.TrimPrefix(rangeHeader, "bytes=")
		parts := strings.SplitN(rangeStr, "-", 2)
		if len(parts) == 2 {
			if parts[0] != "" {
				if n, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
					start = n
				}
			}
			if parts[1] != "" {
				if n, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
					end = n
				}
			}
		}
	}

	if start > end || start >= totalSize {
		c.Header("Content-Range", fmt.Sprintf("bytes */%d", totalSize))
		c.Status(http.StatusRequestedRangeNotSatisfiable)
		return
	}
	if end >= totalSize {
		end = totalSize - 1
	}

	length := end - start + 1

	// Set headers before writing any body
	c.Header("Content-Type", mimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.OriginalName))
	c.Header("Accept-Ranges", "bytes")
	c.Header("Content-Length", strconv.FormatInt(length, 10))

	if rangeHeader != "" {
		c.Header("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, totalSize))
		c.Status(http.StatusPartialContent)
	} else {
		c.Status(http.StatusOK)
	}

	// Flush headers immediately so browser can render the video player
	c.Writer.WriteHeader(c.Writer.Status())

	// Stream the requested range live from Telegram (or local cache if available)
	if err := h.fileService.StreamRange(c.Request.Context(), userID, uint(fileID), start, length, c.Writer); err != nil {
		// Client disconnected mid-stream — normal for video seeking, not an error
		return
	}
}

// TrashFile moves a file to the trash (soft-delete).
func (h *FileHandler) TrashFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}
	if err := h.fileService.TrashFile(userID, uint(fileID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "File moved to trash"})
}

// DeleteFile permanently deletes a file (only from the trash view).
func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}
	if err := h.fileService.DeleteFile(c.Request.Context(), userID, uint(fileID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "File permanently deleted"})
}

// RestoreFile moves a file from the trash back to its original location.
func (h *FileHandler) RestoreFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}
	if err := h.fileService.RestoreFile(userID, uint(fileID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "File restored"})
}

// GetTrashedFiles returns all files in the trash.
func (h *FileHandler) GetTrashedFiles(c *gin.Context) {
	userID := c.GetUint("user_id")
	files, err := h.fileService.GetTrashedFiles(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": files})
}

// EmptyTrash permanently deletes all files in the trash.
func (h *FileHandler) EmptyTrash(c *gin.Context) {
	userID := c.GetUint("user_id")
	if err := h.fileService.EmptyTrash(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Trash emptied"})
}



func (h *FileHandler) CreateDirectory(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Name     string `json:"name" binding:"required"`
		ParentID *uint  `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder, err := h.fileService.CreateFolder(userID, req.Name, req.ParentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := FolderResponse{
		ID:       folder.ID,
		Name:     folder.Name,
		Path:     folder.Path,
		ParentID: folder.ParentID,
	}

	c.JSON(http.StatusCreated, response)
}

func (h *FileHandler) RenameFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileIDStr := c.Param("id")

	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.fileService.RenameFile(userID, uint(fileID), req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File renamed successfully"})
}

func (h *FileHandler) SearchFiles(c *gin.Context) {
	userID := c.GetUint("user_id")
	query := c.Query("q")

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query required"})
		return
	}

	files, err := h.fileService.SearchFiles(userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	fileResponses := make([]FileResponse, len(files))
	for i, file := range files {
		fileResponses[i] = FileResponse{
			ID:           file.ID,
			Name:         file.Name,
			OriginalName: file.OriginalName,
			Size:         file.Size,
			MimeType:     file.MimeType,
			CreatedAt:    file.CreatedAt.Format("2006-01-02T15:04:05Z"),
			FolderID:     file.FolderID,
		}
	}

	c.JSON(http.StatusOK, gin.H{"files": fileResponses})
}
