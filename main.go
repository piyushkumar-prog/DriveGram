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
	authService := services.NewAuthService(db, cfg.JWTSecret, cfg)
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
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Range")
		c.Header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, Content-Disposition")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Serve Next.js static files
	r.Static("/_next", "./frontend/out/_next")
	r.StaticFile("/", "./frontend/out/index.html")
	r.StaticFile("/favicon.svg", "./frontend/out/favicon.svg")
	r.StaticFile("/favicon.png", "./frontend/out/favicon.png")
	r.StaticFile("/logo-light.png", "./frontend/out/logo-light.png")
	r.StaticFile("/logo-dark.png", "./frontend/out/logo-dark.png")
	r.StaticFile("/logo.svg", "./frontend/out/logo.svg")

	// Serve all Next.js routes
	r.NoRoute(func(c *gin.Context) {
		// Check if the request is for a file that might exist in the out directory
		// (This is a simple way to serve other root-level static files)
		filePath := "./frontend/out" + c.Request.URL.Path
		if _, err := os.Stat(filePath); err == nil {
			c.File(filePath)
			return
		}
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
			files.DELETE("/:id", fileHandler.TrashFile)           // Move to trash
			files.DELETE("/:id/permanent", fileHandler.DeleteFile) // Permanent delete (from trash)
			files.POST("/:id/restore", fileHandler.RestoreFile)    // Restore from trash
			files.GET("/trash/list", fileHandler.GetTrashedFiles)  // List trash
			files.DELETE("/trash/empty", fileHandler.EmptyTrash)   // Empty trash
			files.POST("/mkdir", fileHandler.CreateDirectory)
			files.PUT("/:id", fileHandler.RenameFile)
			files.POST("/sync", fileHandler.SyncFiles)
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
