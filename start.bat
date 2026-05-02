@echo off
echo DriveGram - Windows Startup Script
echo ==================================

echo Checking Go installation...
go version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Go is not installed or not in PATH
    echo Please install Go from https://golang.org/dl/
    pause
    exit /b 1
)

echo Installing dependencies...
go mod download
if errorlevel 1 (
    echo ERROR: Failed to download dependencies
    pause
    exit /b 1
)

echo Building DriveGram...
go build -o drivegram.exe main.go
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo Starting DriveGram server...
echo Access at: http://localhost:8080
echo Press Ctrl+C to stop
echo.

drivegram.exe

pause
