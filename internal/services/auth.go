package services

import (
	"drivegram/internal/models"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
}

type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	TelegramID int64  `json:"telegram_id"`
	Username   string `json:"username"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	PhoneNumber string `json:"phone_number" binding:"required"`
}

type VerifyOTPRequest struct {
	PhoneNumber   string `json:"phone_number" binding:"required"`
	Code          string `json:"code" binding:"required"`
	PhoneCodeHash string `json:"phone_code_hash" binding:"required"`
}

func NewAuthService(db *gorm.DB, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Login(req LoginRequest) (map[string]interface{}, error) {
	// In a real implementation, you would initiate Telegram auth here
	// For now, we'll return a mock response
	return map[string]interface{}{
		"phone_code_hash": "mock_hash_" + req.PhoneNumber,
		"timeout":         60,
	}, nil
}

func (s *AuthService) VerifyOTP(req VerifyOTPRequest) (string, *models.User, error) {
	// Mock verification - in real implementation, verify with Telegram API
	if req.Code != "12345" { // Mock OTP
		return "", nil, errors.New("invalid verification code")
	}

	// Find or create user
	var user models.User
	err := s.db.Where("telegram_id = ?", 123456789).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new user
			user = models.User{
				TelegramID: 123456789,
				Username:   "test_user",
				FirstName:  "Test",
				LastName:   "User",
				Phone:      req.PhoneNumber,
			}
			if err := s.db.Create(&user).Error; err != nil {
				return "", nil, err
			}
		} else {
			return "", nil, err
		}
	}

	// Generate JWT token
	token, err := s.generateJWT(&user)
	if err != nil {
		return "", nil, err
	}

	return token, &user, nil
}

func (s *AuthService) generateJWT(user *models.User) (string, error) {
	claims := JWTClaims{
		UserID:     user.ID,
		TelegramID: user.TelegramID,
		Username:   user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func ValidateJWT(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte("default-secret-change-this"), nil // In production, use the actual JWT secret
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *AuthService) GetDB() *gorm.DB {
	return s.db
}
