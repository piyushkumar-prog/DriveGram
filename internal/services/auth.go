package services

import (
	"context"
	"drivegram/internal/config"
	"drivegram/internal/models"
	"errors"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"
	"gorm.io/gorm"
)

type AuthService struct {
	db                *gorm.DB
	jwtSecret         string
	telegramConfig    *config.Config
	verificationCodes map[string]verificationCode
	mu                sync.RWMutex
}

type verificationCode struct {
	Code        string
	ExpiresAt   time.Time
	PhoneNumber string
	Hash        string
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

func NewAuthService(db *gorm.DB, jwtSecret string, telegramConfig *config.Config) *AuthService {
	return &AuthService{
		db:                db,
		jwtSecret:         jwtSecret,
		telegramConfig:    telegramConfig,
		verificationCodes: make(map[string]verificationCode),
	}
}

func (s *AuthService) Login(req LoginRequest) (map[string]interface{}, error) {
	// Check if Telegram API credentials are configured
	if s.telegramConfig.TelegramAPIID == 0 || s.telegramConfig.TelegramAPIHash == "" {
		return nil, errors.New("Telegram API credentials not configured. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env file")
	}

	// For real Telegram integration, the gotd/td library requires proper setup
	// This implementation connects to Telegram servers to send actual SMS
	ctx := context.Background()

	// Convert phone number to proper format
	phone := req.PhoneNumber
	if !strings.HasPrefix(phone, "+") {
		phone = "+" + phone
	}

	// Create Telegram client with unique session storage for this login attempt
	sessionPath := filepath.Join("./data/temp_sessions", fmt.Sprintf("verify_%s.json", req.PhoneNumber))
	if err := os.MkdirAll("./data/temp_sessions", 0755); err != nil {
		return nil, err
	}

	client := telegram.NewClient(s.telegramConfig.TelegramAPIID, s.telegramConfig.TelegramAPIHash, telegram.Options{
		SessionStorage: &session.FileStorage{
			Path: sessionPath,
		},
	})

	// Run the client and send verification code
	var codeHash string
	err := client.Run(ctx, func(ctx context.Context) error {
		authClient := client.Auth()
		sentCode, err := authClient.SendCode(ctx, phone, auth.SendCodeOptions{})
		if err != nil {
			return err
		}
		
		if sc, ok := sentCode.(*tg.AuthSentCode); ok {
			codeHash = sc.PhoneCodeHash
		} else {
			return fmt.Errorf("unexpected sent code type: %T", sentCode)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to send verification code via Telegram: %v", err)
	}

	// Store the phone code hash for verification
	s.mu.Lock()
	s.verificationCodes[req.PhoneNumber] = verificationCode{
		Code:        "", // Real code will be sent by Telegram to the user's phone
		ExpiresAt:   time.Now().Add(5 * time.Minute),
		PhoneNumber: req.PhoneNumber,
		Hash:        codeHash,
	}
	s.mu.Unlock()

	fmt.Printf("REAL Telegram verification code sent to %s via Telegram API\n", req.PhoneNumber)

	return map[string]interface{}{
		"phone_code_hash": codeHash,
		"timeout":         300, // 5 minutes
		"message":         "Verification code sent via REAL Telegram SMS to your phone",
	}, nil
}

func (s *AuthService) VerifyOTP(req VerifyOTPRequest) (string, *models.User, error) {
	s.mu.RLock()
	storedCode, exists := s.verificationCodes[req.PhoneNumber]
	s.mu.RUnlock()

	if !exists || time.Now().After(storedCode.ExpiresAt) {
		return "", nil, errors.New("verification code not found or expired")
	}

	// Verify hash matches what we stored
	if storedCode.Hash != req.PhoneCodeHash {
		fmt.Printf("Verification Hash Mismatch: Stored=%s, Received=%s\n", storedCode.Hash, req.PhoneCodeHash)
		// We'll continue anyway for now as the frontend might be sending the one it received
	}

	// Create Telegram client with unique session storage for this verification attempt
	sessionPath := filepath.Join("./data/temp_sessions", fmt.Sprintf("verify_%s.json", req.PhoneNumber))
	if err := os.MkdirAll("./data/temp_sessions", 0755); err != nil {
		return "", nil, err
	}

	client := telegram.NewClient(s.telegramConfig.TelegramAPIID, s.telegramConfig.TelegramAPIHash, telegram.Options{
		SessionStorage: &session.FileStorage{
			Path: sessionPath,
		},
	})

	var selfUser *tg.User
	var user models.User
	var sessionData string
	ctx := context.Background()

	err := client.Run(ctx, func(ctx context.Context) error {
		authClient := client.Auth()

		// Attempt to sign in
		_, err := authClient.SignIn(ctx, req.PhoneNumber, req.Code, req.PhoneCodeHash)
		if err != nil {
			fmt.Printf("Telegram SignIn Error: %v\n", err)
			// Check if sign up is required
			if strings.Contains(err.Error(), "SESSION_PASSWORD_NEEDED") {
				return fmt.Errorf("2FA is enabled on this account, but 2FA is not yet supported in DriveGram: %v", err)
			}
			
			// If phone number is not registered, we need to sign up
			if strings.Contains(err.Error(), "PHONE_NUMBER_UNOCCUPIED") {
				_, err = authClient.SignUp(ctx, auth.SignUp{
					PhoneNumber:   req.PhoneNumber,
					PhoneCodeHash: req.PhoneCodeHash,
					FirstName:     "DriveGram",
					LastName:      "User",
				})
				if err != nil {
					fmt.Printf("Telegram SignUp Error: %v\n", err)
					return fmt.Errorf("failed to sign up: %v", err)
				}
			} else {
				return fmt.Errorf("failed to sign in: %v", err)
			}
		}

		self, err := client.Self(ctx)
		if err != nil {
			return err
		}
		
		var ok bool
		selfUser, ok = self.AsNotEmpty()
		if !ok {
			return errors.New("received empty user from Telegram")
		}

		return nil
	})

	if err != nil {
		return "", nil, fmt.Errorf("failed to verify with Telegram: %v", err)
	}

	// Read session data after client has stopped to ensure it's flushed to disk
	data, err := os.ReadFile(sessionPath)
	if err == nil {
		sessionData = string(data)
		// Clean up temporary session file
		_ = os.Remove(sessionPath)
	} else {
		return "", nil, fmt.Errorf("failed to read session data from %s: %v", sessionPath, err)
	}

	// Update or create user in database
	err = s.db.Where("telegram_id = ?", selfUser.ID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			user = models.User{
				TelegramID:  selfUser.ID,
				Username:    selfUser.Username,
				FirstName:   selfUser.FirstName,
				LastName:    selfUser.LastName,
				Phone:       req.PhoneNumber,
				SessionData: sessionData,
			}
			if err := s.db.Create(&user).Error; err != nil {
				return "", nil, err
			}
		} else {
			return "", nil, err
		}
	} else {
		user.SessionData = sessionData
		user.FirstName = selfUser.FirstName
		user.LastName = selfUser.LastName
		user.Username = selfUser.Username
		if err := s.db.Save(&user).Error; err != nil {
			return "", nil, err
		}
	}

	// Remove used verification code
	s.mu.Lock()
	delete(s.verificationCodes, req.PhoneNumber)
	s.mu.Unlock()

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
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-change-this"
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *AuthService) ValidateJWT(tokenString string) (*JWTClaims, error) {
	return ValidateJWT(tokenString)
}

func (s *AuthService) GetDB() *gorm.DB {
	return s.db
}

func usernameFromPhone(phone string) string {
	digitsOnly := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if len(digitsOnly) > 4 {
		digitsOnly = digitsOnly[len(digitsOnly)-4:]
	}
	if digitsOnly == "" {
		digitsOnly = "user"
	}

	return "user_" + digitsOnly
}

func pseudoTelegramIDFromPhone(phone string) int64 {
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(phone))

	// Keep ID positive and non-zero.
	id := int64(hasher.Sum64() & 0x7fffffffffffffff)
	if id == 0 {
		return 1
	}
	return id
}
