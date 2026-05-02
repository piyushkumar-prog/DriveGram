# Windows Setup Guide for DriveGram

## 🚀 Quick Start for Windows Users

### Option 1: Use the Windows Scripts (Recommended)

1. **Double-click `start.bat`**
   - This will install dependencies, build, and run DriveGram
   - Access at: http://localhost:8080

2. **Or use PowerShell:**
   ```powershell
   .\run.ps1
   ```

### Option 2: Manual Commands

Open PowerShell or Command Prompt and run:

```powershell
# Step 1: Install dependencies
go mod download

# Step 2: Build the application
go build -o drivegram.exe main.go

# Step 3: Run the application
.\drivegram.exe
```

## 🔧 Common Windows Issues

### "make command not found"
- **Solution**: Use `start.bat` or `run.ps1` instead
- Windows doesn't have `make` by default

### "go.sum malformed"
- **Solution**: Run `go mod tidy` to regenerate go.sum
- Or delete go.sum and run `go mod download`

### PowerShell execution policy
If you get "cannot be loaded because running scripts is disabled":
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📋 Prerequisites

1. **Install Go**: https://golang.org/dl/
2. **Install Node.js**: https://nodejs.org/ (for frontend)
3. **Install Git**: https://git-scm.com/ (optional)

## 🌐 Accessing DriveGram

Once running, open your browser and go to:
- **Local**: http://localhost:8080
- **From other devices**: http://YOUR_IP:8080

## 📱 Mobile Access

1. Find your IP address:
   ```powershell
   ipconfig
   ```
2. Look for "IPv4 Address" (e.g., 192.168.1.100)
3. On mobile, use: http://192.168.1.100:8080

## 🛠️ Troubleshooting

### Port 8080 already in use
- Close other applications using port 8080
- Or change port in `.env` file

### Build fails
- Check Go installation: `go version`
- Run `go mod download` again
- Check for error messages

### Can't access from mobile
- Check Windows Firewall settings
- Ensure both devices are on same WiFi network
- Verify DriveGram is running

## 🚀 Development Mode

For development with hot reload:
```powershell
# Install Air (hot reload tool)
go install github.com/cosmtrek/air@latest

# Run with hot reload
air -c .air.toml
```

## 📁 File Structure (Windows)

```
DriveGram/
├── start.bat          # Windows startup script
├── run.ps1            # PowerShell script
├── drivegram.exe      # Built application (after running)
├── data/              # Database folder (created automatically)
├── frontend/          # Next.js frontend
└── ...other files
```

## 🎯 Success Indicators

You should see:
```
Server started on port 8080
DriveGram is ready!
Access at: http://localhost:8080
```

If you see this, DriveGram is running successfully! 🎉
