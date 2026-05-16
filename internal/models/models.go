package models

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TelegramID  int64     `gorm:"uniqueIndex" json:"telegram_id"`
	Username    string    `gorm:"unique" json:"username"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Phone       string    `json:"phone"`
	AuthKey     string    `json:"auth_key"`
	SessionData string    `gorm:"type:text" json:"session_data"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Folder struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Path      string    `gorm:"uniqueIndex" json:"path"`
	UserID    uint      `json:"user_id"`
	ParentID  *uint     `json:"parent_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	User   User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Parent *Folder `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Files  []File  `gorm:"foreignKey:FolderID" json:"files,omitempty"`
}

type File struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	Name            string     `json:"name"`
	OriginalName    string     `json:"original_name"`
	Size            int64      `json:"size"`
	MimeType        string     `json:"mime_type"`
	TelegramFileID     string  `gorm:"uniqueIndex" json:"telegram_file_id"`
	TelegramAccessHash int64   `json:"telegram_access_hash"`
	TelegramMsgID      int     `json:"telegram_msg_id"`
	UserID          uint       `json:"user_id"`
	FolderID        *uint      `json:"folder_id"`
	FilePath        string     `json:"file_path"`
	ThumbnailPath   string     `json:"thumbnail_path"`
	IsTrashed       bool       `gorm:"default:false" json:"is_trashed"`
	TrashedAt       *time.Time `json:"trashed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	
	User   User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Folder *Folder `gorm:"foreignKey:FolderID" json:"folder,omitempty"`
}

// BeforeCreate hook to generate unique path for folders
func (f *Folder) BeforeCreate(tx *gorm.DB) error {
	if f.Path == "" {
		if f.ParentID != nil {
			var parent Folder
			tx.First(&parent, f.ParentID)
			f.Path = parent.Path + "/" + f.Name
		} else {
			f.Path = "/" + f.Name
		}
	}
	return nil
}
