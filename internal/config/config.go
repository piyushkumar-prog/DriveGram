package config

import (
	"os"
	"strconv"
)

type Config struct {
	TelegramAPIID    int
	TelegramAPIHash  string
	JWTSecret        string
	ServerHost       string
	ServerPort       int
	DBPath           string
	MaxFileSize      int64
	UploadChunkSize  int64
}

func Load() *Config {
	apiID, _ := strconv.Atoi(getEnv("TELEGRAM_API_ID", "0"))
	port, _ := strconv.Atoi(getEnv("SERVER_PORT", "8080"))
	maxFileSize, _ := strconv.ParseInt(getEnv("MAX_FILE_SIZE", "2097152000"), 10, 64) // 2GB
	chunkSize, _ := strconv.ParseInt(getEnv("UPLOAD_CHUNK_SIZE", "1048576"), 10, 64) // 1MB

	return &Config{
		TelegramAPIID:   apiID,
		TelegramAPIHash: getEnv("TELEGRAM_API_HASH", ""),
		JWTSecret:       getEnv("JWT_SECRET", "default-secret-change-this"),
		ServerHost:      getEnv("SERVER_HOST", "localhost"),
		ServerPort:      port,
		DBPath:          getEnv("DB_PATH", "./data/drivegram.db"),
		MaxFileSize:     maxFileSize,
		UploadChunkSize: chunkSize,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
