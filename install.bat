@echo off
echo 🚀 Installing DriveGram - Telegram Cloud Storage
echo ==================================================

:: Check prerequisites
echo 📋 Checking prerequisites...

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

:: Check Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go is not installed. Please install Go 1.21 or higher.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

:: Setup environment
echo 📝 Setting up environment...
if not exist .env (
    copy .env.example .env >nul
    echo 📄 Created .env file from template
    echo ⚠️  Please edit .env file with your Telegram API credentials
)

:: Install Go dependencies
echo 📦 Installing Go dependencies...
go mod download

:: Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

:: Build frontend
echo 🔨 Building frontend...
cd frontend
call npm run build
cd ..

:: Create necessary directories
echo 📁 Creating directories...
if not exist data mkdir data

echo ✅ Installation complete!
echo.
echo 🎯 Next steps:
echo 1. Edit .env file with your Telegram API credentials
echo 2. Run 'make dev' for development or 'make run' for production
echo.
echo 📚 For detailed instructions, see FRONTEND_SETUP.md
pause
