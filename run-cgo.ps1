# DriveGram Runner with CGO enabled for SQLite3
Write-Host "Starting DriveGram with CGO enabled..." -ForegroundColor Green

$env:CGO_ENABLED = "1"
go run main.go
