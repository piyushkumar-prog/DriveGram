package services

import (
	"context"
	"drivegram/internal/config"
	"drivegram/internal/models"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
)

type TelegramService struct {
	client *telegram.Client
	config *config.Config
}

func NewTelegramService(cfg *config.Config) *TelegramService {
	return &TelegramService{
		config: cfg,
	}
}

func (s *TelegramService) InitializeClient(sessionData string) error {
	options := telegram.Options{
		SessionStorage: &session.FileStorage{
			Path: "./data/session.json",
		},
	}

	client := telegram.NewClient(s.config.TelegramAPIID, s.config.TelegramAPIHash, options)
	s.client = client

	return nil
}

func (s *TelegramService) UploadFile(ctx context.Context, filePath string, userID int64) (*models.File, error) {
	if s.client == nil {
		return nil, fmt.Errorf("telegram client not initialized")
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Get file info
	fileInfo, err := file.Stat()
	if err != nil {
		return nil, err
	}

	// Determine mime type
	mimeType := mime.TypeByExtension(filepath.Ext(filePath))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Upload file to Telegram
	fileName := filepath.Base(filePath)
	size := fileInfo.Size()

	// For demonstration, we'll mock the Telegram upload
	// In a real implementation, you would use the actual Telegram API
	mockFile := &models.File{
		Name:           fileName,
		OriginalName:   fileName,
		Size:           size,
		MimeType:       mimeType,
		TelegramFileID: fmt.Sprintf("mock_file_%d_%d", userID, size),
		TelegramMsgID:  int(size % 1000000), // Mock message ID
		FilePath:       filePath,
	}

	return mockFile, nil
}

func (s *TelegramService) DownloadFile(ctx context.Context, fileID string, outputPath string) error {
	if s.client == nil {
		return fmt.Errorf("telegram client not initialized")
	}

	// Mock download - in real implementation, download from Telegram
	return nil
}

func (s *TelegramService) StreamFile(ctx context.Context, fileID string) (io.ReadCloser, int64, error) {
	if s.client == nil {
		return nil, 0, fmt.Errorf("telegram client not initialized")
	}

	// Mock streaming - in real implementation, stream from Telegram
	file, err := os.Open("./mock_file.txt")
	if err != nil {
		// Create a mock file for demonstration
		mockContent := "This is a mock file content for demonstration purposes."
		file, err = os.CreateTemp("", "mock_stream_*.txt")
		if err != nil {
			return nil, 0, err
		}
		file.WriteString(mockContent)
		file.Seek(0, 0)
	}

	info, _ := file.Stat()
	return file, info.Size(), nil
}

func (s *TelegramService) DeleteFile(ctx context.Context, msgID int) error {
	if s.client == nil {
		return fmt.Errorf("telegram client not initialized")
	}

	// Mock deletion - in real implementation, delete message from Telegram
	return nil
}

func (s *TelegramService) GetUserFiles(ctx context.Context, userID int64) ([]*models.File, error) {
	if s.client == nil {
		return nil, fmt.Errorf("telegram client not initialized")
	}

	// Mock getting files - in real implementation, fetch from Telegram saved messages
	return []*models.File{}, nil
}

// Helper function to determine file type from MIME type
func getFileType(mimeType string) string {
	if strings.HasPrefix(mimeType, "image/") {
		return "image"
	}
	if strings.HasPrefix(mimeType, "video/") {
		return "video"
	}
	if strings.HasPrefix(mimeType, "audio/") {
		return "audio"
	}
	if strings.Contains(mimeType, "document") || strings.Contains(mimeType, "pdf") {
		return "document"
	}
	return "other"
}
