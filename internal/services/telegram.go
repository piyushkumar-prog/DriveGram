package services

import (
	"context"
	"crypto/sha256"
	"drivegram/internal/config"
	"drivegram/internal/models"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/telegram/uploader"
	"github.com/gotd/td/tg"
)

type TelegramService struct {
	config *config.Config
}

func NewTelegramService(cfg *config.Config) *TelegramService {
	return &TelegramService{
		config: cfg,
	}
}

func (s *TelegramService) GetClient(sessionData string) (*telegram.Client, error) {
	// Use a hash of the session data for the filename to avoid long paths
	h := sha256.New()
	h.Write([]byte(sessionData))
	sessionHash := hex.EncodeToString(h.Sum(nil))
	
	sessionPath := filepath.Join("./data/sessions", fmt.Sprintf("%s.json", sessionHash))
	if err := os.MkdirAll("./data/sessions", 0755); err != nil {
		return nil, err
	}

	if sessionData != "" {
		// Only write if file doesn't exist or is different
		if _, err := os.Stat(sessionPath); os.IsNotExist(err) {
			if err := os.WriteFile(sessionPath, []byte(sessionData), 0644); err != nil {
				return nil, err
			}
		}
	}

	options := telegram.Options{
		SessionStorage: &session.FileStorage{
			Path: sessionPath,
		},
	}

	return telegram.NewClient(s.config.TelegramAPIID, s.config.TelegramAPIHash, options), nil
}

func (s *TelegramService) UploadFile(ctx context.Context, sessionData string, filePath string) (*models.File, error) {
	client, err := s.GetClient(sessionData)
	if err != nil {
		return nil, err
	}

	var result *models.File
	err = client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		u := uploader.NewUploader(api)

		upload, err := u.FromPath(ctx, filePath)
		if err != nil {
			return fmt.Errorf("failed to upload file: %w", err)
		}

		fileName := filepath.Base(filePath)
		mimeType := mime.TypeByExtension(filepath.Ext(filePath))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		// Send as document to self
		msg, err := api.MessagesSendMedia(ctx, &tg.MessagesSendMediaRequest{
			Peer: &tg.InputPeerSelf{},
			Media: &tg.InputMediaUploadedDocument{
				File:     upload,
				MimeType: mimeType,
				Attributes: []tg.DocumentAttributeClass{
					&tg.DocumentAttributeFilename{FileName: fileName},
				},
			},
			RandomID: time.Now().UnixNano(),
		})
		if err != nil {
			return fmt.Errorf("failed to send media: %w", err)
		}

		updates, ok := msg.(*tg.Updates)
		if !ok {
			return fmt.Errorf("unexpected updates type")
		}

		for _, update := range updates.Updates {
			if u, ok := update.(*tg.UpdateNewMessage); ok {
				if m, ok := u.Message.(*tg.Message); ok {
					result = s.extractFileFromMedia(m)
					if result != nil {
						result.FilePath = filePath
						return nil
					}
				}
			}
		}

		return fmt.Errorf("could not extract file info from updates")
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *TelegramService) DownloadFile(ctx context.Context, sessionData string, file models.File, outputPath string) error {
	client, err := s.GetClient(sessionData)
	if err != nil {
		return err
	}

	return client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		// Fetch the message dynamically to get a fresh FileReference
		history, err := api.MessagesGetMessages(ctx, []tg.InputMessageClass{
			&tg.InputMessageID{ID: file.TelegramMsgID},
		})
		if err != nil {
			return fmt.Errorf("failed to fetch fresh message: %w", err)
		}

		var freshMedia tg.MessageMediaClass
		if msgs, ok := history.AsModified(); ok {
			for _, msg := range msgs.GetMessages() {
				if m, ok := msg.(*tg.Message); ok && m.ID == file.TelegramMsgID {
					freshMedia = m.Media
					break
				}
			}
		}

		if freshMedia == nil {
			return fmt.Errorf("message or media not found")
		}

		var location tg.InputFileLocationClass

		switch media := freshMedia.(type) {
		case *tg.MessageMediaDocument:
			doc, ok := media.Document.AsNotEmpty()
			if !ok {
				return fmt.Errorf("document is empty")
			}
			location = &tg.InputDocumentFileLocation{
				ID:            doc.ID,
				AccessHash:    doc.AccessHash,
				FileReference: doc.FileReference,
			}
		case *tg.MessageMediaPhoto:
			photo, ok := media.Photo.AsNotEmpty()
			if !ok {
				return fmt.Errorf("photo is empty")
			}
			// Find largest size for thumb
			var thumbSize string
			var largestSize int64
			for _, size := range photo.Sizes {
				switch s := size.(type) {
				case *tg.PhotoSize:
					if int64(s.Size) > largestSize {
						largestSize = int64(s.Size)
						thumbSize = s.Type
					}
				case *tg.PhotoSizeProgressive:
					if int64(s.W*s.H) > largestSize {
						largestSize = int64(s.W * s.H)
						thumbSize = s.Type
					}
				}
			}
			if thumbSize == "" {
				thumbSize = "x"
			}
			
			location = &tg.InputPhotoFileLocation{
				ID:            photo.ID,
				AccessHash:    photo.AccessHash,
				FileReference: photo.FileReference,
				ThumbSize:     thumbSize,
			}
		default:
			return fmt.Errorf("unsupported media type")
		}

		d := downloader.NewDownloader()
		_, err = d.Download(api, location).ToPath(ctx, outputPath)
		return err
	})
}

// StreamToWriter streams file bytes from Telegram directly into w, starting at byteOffset.
// If limit <= 0, it streams until EOF. This enables true progressive HTTP streaming.
func (s *TelegramService) StreamToWriter(ctx context.Context, sessionData string, file models.File, byteOffset int64, limit int64, w io.Writer) error {
	client, err := s.GetClient(sessionData)
	if err != nil {
		return err
	}

	return client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		// Fetch fresh FileReference to avoid FILE_REFERENCE_EXPIRED errors
		history, err := api.MessagesGetMessages(ctx, []tg.InputMessageClass{
			&tg.InputMessageID{ID: file.TelegramMsgID},
		})
		if err != nil {
			return fmt.Errorf("failed to fetch fresh message: %w", err)
		}

		var freshMedia tg.MessageMediaClass
		if msgs, ok := history.AsModified(); ok {
			for _, msg := range msgs.GetMessages() {
				if m, ok := msg.(*tg.Message); ok && m.ID == file.TelegramMsgID {
					freshMedia = m.Media
					break
				}
			}
		}
		if freshMedia == nil {
			return fmt.Errorf("message or media not found")
		}

		var location tg.InputFileLocationClass
		switch media := freshMedia.(type) {
		case *tg.MessageMediaDocument:
			doc, ok := media.Document.AsNotEmpty()
			if !ok {
				return fmt.Errorf("document is empty")
			}
			location = &tg.InputDocumentFileLocation{
				ID:            doc.ID,
				AccessHash:    doc.AccessHash,
				FileReference: doc.FileReference,
			}
		case *tg.MessageMediaPhoto:
			photo, ok := media.Photo.AsNotEmpty()
			if !ok {
				return fmt.Errorf("photo is empty")
			}
			var thumbSize string
			var largestSize int64
			for _, size := range photo.Sizes {
				switch s := size.(type) {
				case *tg.PhotoSize:
					if int64(s.Size) > largestSize {
						largestSize = int64(s.Size)
						thumbSize = s.Type
					}
				case *tg.PhotoSizeProgressive:
					if int64(s.W*s.H) > largestSize {
						largestSize = int64(s.W * s.H)
						thumbSize = s.Type
					}
				}
			}
			if thumbSize == "" {
				thumbSize = "x"
			}
			location = &tg.InputPhotoFileLocation{
				ID:            photo.ID,
				AccessHash:    photo.AccessHash,
				FileReference: photo.FileReference,
				ThumbSize:     thumbSize,
			}
		default:
			return fmt.Errorf("unsupported media type")
		}

		d := downloader.NewDownloader()
		dl := d.Download(api, location)
		if limit > 0 {
			// Stream exactly `limit` bytes starting at `byteOffset` by piping
			// through an io.LimitedReader on top of the full sequential stream.
			// We do this by streaming to a pipe and discarding bytes before byteOffset.
			pr, pw := io.Pipe()
			errCh := make(chan error, 1)
			go func() {
				_, err := dl.Stream(ctx, pw)
				pw.CloseWithError(err)
				errCh <- err
			}()

			// Discard bytes before the requested range start
			if byteOffset > 0 {
				if _, err := io.CopyN(io.Discard, pr, byteOffset); err != nil {
					pr.CloseWithError(err)
					return fmt.Errorf("seek to offset %d failed: %w", byteOffset, err)
				}
			}

			// Copy only the requested number of bytes
			if _, err := io.CopyN(w, pr, limit); err != nil && err != io.EOF {
				pr.CloseWithError(err)
				return err
			}
			pr.Close()
			return nil
		}

		// No limit — stream the entire file from byteOffset to EOF via pipe
		pr, pw := io.Pipe()
		errCh := make(chan error, 1)
		go func() {
			_, err := dl.Stream(ctx, pw)
			pw.CloseWithError(err)
			errCh <- err
		}()

		if byteOffset > 0 {
			if _, err := io.CopyN(io.Discard, pr, byteOffset); err != nil {
				pr.CloseWithError(err)
				return fmt.Errorf("seek to offset %d failed: %w", byteOffset, err)
			}
		}

		if _, err := io.Copy(w, pr); err != nil && err != io.EOF {
			pr.CloseWithError(err)
			return err
		}
		pr.Close()
		return <-errCh
	})
}

func (s *TelegramService) StreamFile(ctx context.Context, sessionData string, file models.File) (io.ReadCloser, int64, error) {
	if _, err := s.GetClient(sessionData); err != nil {
		return nil, 0, err
	}

	// For streaming, we'll download to a temporary file first
	// github.com/gotd/td/telegram/downloader also supports streaming but it's more complex
	tempDir := os.TempDir()
	tempPath := filepath.Join(tempDir, fmt.Sprintf("stream_%s", file.TelegramFileID))

	if _, err := os.Stat(tempPath); os.IsNotExist(err) {
		if err := s.DownloadFile(ctx, sessionData, file, tempPath); err != nil {
			return nil, 0, err
		}
	}

	f, err := os.Open(tempPath)
	if err != nil {
		return nil, 0, err
	}

	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, 0, err
	}

	return f, info.Size(), nil
}

func (s *TelegramService) DeleteFile(ctx context.Context, sessionData string, msgID int) error {
	client, err := s.GetClient(sessionData)
	if err != nil {
		return err
	}

	return client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		_, err := api.MessagesDeleteMessages(ctx, &tg.MessagesDeleteMessagesRequest{
			ID:     []int{msgID},
			Revoke: true,
		})
		return err
	})
}

func (s *TelegramService) GetUserFiles(ctx context.Context, sessionData string) ([]*models.File, error) {
	client, err := s.GetClient(sessionData)
	if err != nil {
		return nil, err
	}

	var files []*models.File
	err = client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		// Get messages from "Saved Messages" (PeerSelf)
		history, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer:  &tg.InputPeerSelf{},
			Limit: 100, // Fetch last 100 messages
		})
		if err != nil {
			return fmt.Errorf("failed to get history: %w", err)
		}

		msgs, ok := history.AsModified()
		if !ok {
			return fmt.Errorf("unexpected history response type")
		}

		for _, msg := range msgs.GetMessages() {
			m, ok := msg.AsNotEmpty()
			if !ok {
				continue
			}

			message, ok := m.(*tg.Message)
			if !ok || message.Media == nil {
				continue
			}

			file := s.extractFileFromMedia(message)
			if file != nil {
				files = append(files, file)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}

func (s *TelegramService) extractFileFromMedia(msg *tg.Message) *models.File {
	switch media := msg.Media.(type) {
	case *tg.MessageMediaDocument:
		doc, ok := media.Document.AsNotEmpty()
		if !ok {
			return nil
		}

		fileName := "unnamed_file"
		mimeType := doc.MimeType
		for _, attr := range doc.Attributes {
			if fileAttr, ok := attr.(*tg.DocumentAttributeFilename); ok {
				fileName = fileAttr.FileName
				break
			}
		}

		return &models.File{
			Name:               fileName,
			OriginalName:       fileName,
			Size:               doc.Size,
			MimeType:           mimeType,
			TelegramFileID:     fmt.Sprintf("%d", doc.ID),
			TelegramAccessHash: doc.AccessHash,
			TelegramMsgID:      msg.ID,
			CreatedAt:          time.Unix(int64(msg.Date), 0),
		}

	case *tg.MessageMediaPhoto:
		photo, ok := media.Photo.AsNotEmpty()
		if !ok {
			return nil
		}

		// Find largest photo size
		var largestSize int64
		for _, size := range photo.Sizes {
			switch s := size.(type) {
			case *tg.PhotoSize:
				if int64(s.Size) > largestSize {
					largestSize = int64(s.Size)
				}
			case *tg.PhotoSizeProgressive:
				if int64(s.W*s.H) > largestSize { // rough estimate
					largestSize = int64(s.W * s.H)
				}
			}
		}

		fileName := fmt.Sprintf("photo_%d.jpg", photo.ID)
		return &models.File{
			Name:               fileName,
			OriginalName:       fileName,
			Size:               largestSize,
			MimeType:           "image/jpeg",
			TelegramFileID:     fmt.Sprintf("%d", photo.ID),
			TelegramAccessHash: photo.AccessHash,
			TelegramMsgID:      msg.ID,
			CreatedAt:          time.Unix(int64(msg.Date), 0),
		}
	}

	return nil
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
