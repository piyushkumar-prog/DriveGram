# DriveGram Runner Script for Windows PowerShell

Write-Host "Starting DriveGram..." -ForegroundColor Green

# Check if Go is installed
try {
    $goVersion = go version
    Write-Host "Found Go: $goVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Go is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Go from https://golang.org/dl/" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "Installing Go dependencies..." -ForegroundColor Cyan
go mod download

# Build the application
Write-Host "Building DriveGram..." -ForegroundColor Cyan
go build -o drivegram.exe main.go

if ($?) {
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Starting DriveGram server..." -ForegroundColor Cyan
    Write-Host "Access at: http://localhost:8080" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
    
    # Start the application
    .\drivegram.exe
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
