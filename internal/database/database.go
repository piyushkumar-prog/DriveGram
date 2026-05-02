package database

import (
	"drivegram/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
)

func Initialize(dbPath string) (*gorm.DB, error) {
	// Create data directory if it doesn't exist
	if _, err := os.Stat("./data"); os.IsNotExist(err) {
		os.MkdirAll("./data", 0755)
	}

	// Configure GORM
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	// Open database connection
	db, err := gorm.Open(sqlite.Open(dbPath), config)
	if err != nil {
		return nil, err
	}

	// Auto migrate the schema
	err = db.AutoMigrate(
		&models.User{},
		&models.File{},
		&models.Folder{},
	)
	if err != nil {
		return nil, err
	}

	return db, nil
}
