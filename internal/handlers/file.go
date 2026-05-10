package handlers

import (
	"drivegram/internal/models"
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

	// Handle range requests for streaming
	rangeHeader := c.GetHeader("Range")
	if rangeHeader != "" {
		h.handleRangeRequest(c, file, rangeHeader)
		return
	}

	reader, size, err := h.fileService.StreamFile(c.Request.Context(), userID, uint(fileID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(size, 10))
	c.Header("Accept-Ranges", "bytes")

	// Stream the file
	buf := make([]byte, 32*1024) // 32KB buffer
	for {
		n, err := reader.Read(buf)
		if n > 0 {
			c.Writer.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}
}

func (h *FileHandler) handleRangeRequest(c *gin.Context, file *models.File, rangeHeader string) {
	// Parse range header: "bytes=start-end"
	ranges := strings.Split(strings.TrimPrefix(rangeHeader, "bytes="), "-")
	if len(ranges) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid range header"})
		return
	}

	start, err := strconv.ParseInt(ranges[0], 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid range start"})
		return
	}

	var end int64
	if ranges[1] == "" {
		end = file.Size - 1
	} else {
		end, err = strconv.ParseInt(ranges[1], 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid range end"})
			return
		}
	}

	if start > end || start >= file.Size {
		c.JSON(http.StatusRequestedRangeNotSatisfiable, gin.H{"error": "Invalid range"})
		return
	}

	contentLength := end - start + 1
	c.Header("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, file.Size))
	c.Header("Content-Length", strconv.FormatInt(contentLength, 10))
	c.Header("Content-Type", file.MimeType)
	c.Status(http.StatusPartialContent)

	// In a real implementation, you would stream the specific range
	// For now, we'll send the whole file (mock implementation)
	reader, _, err := h.fileService.StreamFile(c.Request.Context(), c.GetUint("user_id"), file.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	// Skip to start position
	buf := make([]byte, start)
	reader.Read(buf)

	// Send the requested range
	remaining := contentLength
	buf = make([]byte, 32*1024)
	for remaining > 0 {
		toRead := int64(len(buf))
		if toRead > remaining {
			toRead = remaining
		}

		n, err := reader.Read(buf[:toRead])
		if n > 0 {
			c.Writer.Write(buf[:n])
			remaining -= int64(n)
		}
		if err != nil {
			break
		}
	}
}

func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	fileIDStr := c.Param("id")

	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	err = h.fileService.DeleteFile(c.Request.Context(), userID, uint(fileID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
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
