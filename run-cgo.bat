@echo off
echo Starting DriveGram with CGO enabled...
set CGO_ENABLED=1
go run main.go
pause
