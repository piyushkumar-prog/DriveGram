package main

import (
	"fmt"
	"log"
	"os"

	"drivegram/internal/config"
	"drivegram/internal/database"
	"drivegram/internal/handlers"
	"drivegram/internal/middleware"
	"drivegram/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Initialize(cfg.DBPath)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize services
	telegramService := services.NewTelegramService(cfg)
	authService := services.NewAuthService(db, cfg.JWTSecret)
	fileService := services.NewFileService(db, telegramService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	fileHandler := handlers.NewFileHandler(fileService)

	// Setup Gin router
	if cfg.ServerHost == "localhost" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Serve Next.js static files
	r.Static("/static", "./frontend/out/_next/static")
	r.StaticFile("/", "./frontend/out/index.html")
	r.StaticFile("/favicon.ico", "./frontend/out/favicon.ico")

	// Serve all Next.js routes
	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/out/index.html")
	})

	// Routes
	api := r.Group("/api/v1")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/verify", authHandler.VerifyOTP)
			auth.POST("/logout", middleware.AuthRequired(), authHandler.Logout)
			auth.GET("/me", middleware.AuthRequired(), authHandler.GetMe)
		}

		// File routes
		files := api.Group("/files")
		files.Use(middleware.AuthRequired())
		{
			files.GET("/", fileHandler.GetFiles)
			files.POST("/upload", fileHandler.UploadFile)
			files.GET("/:id/download", fileHandler.DownloadFile)
			files.GET("/:id/stream", fileHandler.StreamFile)
			files.DELETE("/:id", fileHandler.DeleteFile)
			files.POST("/mkdir", fileHandler.CreateDirectory)
			files.PUT("/:id", fileHandler.RenameFile)
		}

		// Search route
		api.GET("/search", middleware.AuthRequired(), fileHandler.SearchFiles)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Create data directory if it doesn't exist
	if _, err := os.Stat("./data"); os.IsNotExist(err) {
		os.MkdirAll("./data", 0755)
	}

	log.Printf("Server starting on %s:%d", cfg.ServerHost, cfg.ServerPort)
	if err := r.Run(fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
