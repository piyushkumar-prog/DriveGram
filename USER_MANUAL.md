# DriveGram User Manual
## Your Personal Cloud Storage Powered by Telegram

---

## 📖 Table of Contents
1. [What is DriveGram?](#what-is-drivegram)
2. [Getting Started](#getting-started)
3. [First Login](#first-login)
4. [Main Dashboard](#main-dashboard)
5. [Uploading Files](#uploading-files)
6. [Managing Files](#managing-files)
7. [Using Folders](#using-folders)
8. [Search Functionality](#search-functionality)
9. [Settings & Preferences](#settings--preferences)
10. [Tips & Tricks](#tips--tricks)
11. [Troubleshooting](#troubleshooting)

---

## 🌟 What is DriveGram?

DriveGram is a **free cloud storage service** that uses your Telegram account as storage space. Think of it as having your own personal Google Drive, but instead of paying for storage, you use Telegram's "Saved Messages" feature.

### Key Benefits:
- **🆓 Completely Free** - No subscription fees
- **📱 Access Anywhere** - Works on any device with a web browser
- **🔒 Secure** - Your files are stored in your private Telegram account
- **📁 Easy Organization** - Create folders and organize files
- **🎬 Media Streaming** - Watch videos and listen to music directly
- **🌙 Dark Mode** - Easy on the eyes at night

---

## 🚀 Getting Started

### Step 1: Start DriveGram Locally
Before using DriveGram, you need to start the application on your computer:

**Option A: Using Makefile (Recommended)**
```bash
# Navigate to DriveGram folder
cd drivegram

# Build and run
make run
```

**Option B: Using Go directly**
```bash
# Navigate to DriveGram folder
cd drivegram

# Run the application
go run main.go
```

**Option C: Development Mode**
```bash
# For development with hot reload
make dev
```

**Success Message:** You should see "Server started on port 8080" in your terminal.

### Step 2: Access DriveGram
Open your web browser and go to `http://localhost:8080`

### Step 3: Prepare Your Telegram Account
- Make sure you have an active Telegram account
- Have your phone number ready for verification
- **For local testing**: No actual Telegram setup required - use demo code `12345`

---

## 🔐 First Login

### Logging In:
1. **Enter Your Phone Number**
   - Type your phone number with country code (e.g., +1234567890)
   - Click "Send Verification Code"

2. **Enter Verification Code**
   - Check your Telegram app for the verification code
   - **For local testing**: Use code `12345` (this works without actual Telegram setup)
   - Enter the code and click "Verify"

3. **Welcome!** 
   - You're now logged into your personal DriveGram dashboard

> 💡 **Tip:** Your login session stays active. You only need to verify once per browser session.

---

## 📊 Main Dashboard

Once logged in, you'll see the main dashboard with these sections:

### 1. **Header Bar** (Top)
- **DriveGram Logo** - Click to go to home
- **Search Button** 🔍 - Find your files quickly
- **Dark/Light Mode Toggle** 🌙 - Switch themes
- **User Menu** 👤 - Your account info and logout

### 2. **Sidebar** (Left)
- **Home** - All your files and folders
- **Folders** - Quick access to your folders
- **Storage Info** - Shows your usage overview

### 3. **Main Area** (Center)
- **File Grid** - Your files displayed as cards
- **Upload Button** - Add new files
- **New Folder Button** - Create folders

---

## 📤 Uploading Files

### Method 1: Drag & Drop (Easiest)
1. Click the **Upload** button
2. A window opens - simply drag files from your computer into this window
3. Files will upload automatically

### Method 2: Click to Browse
1. Click the **Upload** button
2. Click "Choose Files" in the upload window
3. Select files from your computer
4. Click "Upload X Files"

### Upload Features:
- **Multiple Files** - Upload many files at once
- **Progress Indicators** - See upload progress
- **File Previews** - Images show thumbnails
- **Large Files** - Supports files up to 2GB

> 📝 **Note:** Upload speed depends on your internet connection and Telegram's servers.

---

## 📁 Managing Files

### Viewing Files:
- **Grid View** - Files shown as cards with icons
- **File Icons** - Different icons for different file types:
  - 📷 Images (photos, pictures)
  - 🎬 Videos (movies, clips)
  - 🎵 Audio (music, podcasts)
  - 📄 Documents (PDF, Word, etc.)
  - 📊 Spreadsheets (Excel files)
  - 📦 Archives (ZIP, RAR)

### File Actions:
Hover over any file to see action buttons:

#### **Download** ⬇️
- Click to download the file to your computer
- Original filename is preserved

#### **Delete** 🗑️
- Click to remove the file
- **⚠️ Warning:** This permanently deletes the file from Telegram
- You'll be asked to confirm before deletion

### File Information:
Each file card shows:
- **File Name** - Truncated if too long
- **File Size** - In KB, MB, or GB
- **File Type** - Based on the file extension

---

## 📂 Using Folders

### Creating a Folder:
1. Click the **New Folder** button
2. Type a name for your folder
3. Press Enter or click "Create"

### Folder Features:
- **Organization** - Group related files together
- **Navigation** - Click folders to open them
- **Breadcrumb Trail** - See your current location
- **Back Button** - Return to previous folder

### Folder Tips:
- **Meaningful Names** - Use descriptive names like "Work Documents" or "Vacation Photos"
- **Nested Folders** - Create folders inside folders
- **Quick Access** - Frequently used folders appear in the sidebar

---

## 🔍 Search Functionality

### How to Search:
1. Click the **Search** button 🔍 in the header
2. Type what you're looking for
3. Results appear as you type

### Search Features:
- **Real-time** - See results instantly
- **File Names** - Searches file names
- **Folder Names** - Searches folder names
- **No Results?** - Try different keywords or check spelling

### Search Tips:
- **Partial Matches** - "doc" finds "document" and "doctor"
- **Case Insensitive** - "Photo" and "photo" are the same
- **Quick Clear** - Click the X to clear search

---

## ⚙️ Settings & Preferences

### Dark Mode Toggle:
- **Light Mode** ☀️ - Bright interface for daytime use
- **Dark Mode** 🌙 - Dark interface for nighttime use
- **Memory** - Your preference is saved for next time

### User Account:
- **View Profile** - Click your name/username in the top-right
- **Logout** - Sign out of your account
- **Auto-logout** - Happens when you close the browser

---

## 💡 Tips & Tricks

### File Management:
- **Batch Upload** - Select multiple files at once
- **Organize First** - Create folders before uploading
- **Descriptive Names** - Rename files for easier searching
- **Regular Cleanup** - Delete files you no longer need

### Performance:
- **WiFi Recommended** - Use WiFi for large file uploads
- **Browser Tabs** - Close other tabs for faster uploads
- **Refresh Page** - If something seems stuck, try refreshing

### Security:
- **Private Browsing** - Your files are still accessible in private mode
- **Shared Computers** - Always logout when using public computers
- **Secure Connection** - Look for 🔒 in your browser address bar

---

## � Local Setup Requirements

### Before You Start:
- **Go 1.21+** - Install from [golang.org](https://golang.org)
- **Node.js 18+** - Install from [nodejs.org](https://nodejs.org)
- **Git** - For cloning the repository

### Quick Setup Commands:
```bash
# Clone the repository
git clone <repository-url>
cd drivegram

# Install frontend dependencies
cd frontend
npm install
cd ..

# Set up environment
cp .env.example .env
# Edit .env with your settings (optional for local testing)

# Run the application
make run
```

---

## �️ Troubleshooting

### Common Issues:

#### **"Cannot access localhost:8080"**
- **Check if DriveGram is running**: Look for "Server started on port 8080" message
- **Port already in use**: Another application might be using port 8080
- **Solution**: Stop other applications or change port in `.env` file

#### **"Login Failed"**
- Check your phone number format (include country code)
- Use demo code `12345` for local testing
- **Note**: Local version works without actual Telegram setup

#### **"Application won't start"**
- **Check Go installation**: Run `go version` in terminal
- **Check dependencies**: Run `go mod download`
- **Check permissions**: Ensure you can write to the `data/` directory

#### **"Frontend not loading"**
- **Install frontend dependencies**: `cd frontend && npm install`
- **Build frontend**: `npm run build`
- **Clear browser cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)

#### **"Upload Stuck"**
- Check your internet connection
- Try a smaller file first
- Refresh the page and try again
- Check terminal for error messages

#### **"Can't Find Files"**
- Use the search function
- Check different folders
- Try refreshing the page
- Files are stored locally in SQLite database

#### **"Download Not Working"**
- Check your browser's download settings
- Try right-clicking and "Save Link As"
- Ensure you have enough disk space
- Check browser console for errors

#### **"Page Not Loading / White Screen"**
- **Check terminal**: Look for error messages
- **Restart application**: Stop and restart DriveGram
- **Clear browser data**: Clear cache and cookies
- **Try different browser**: Chrome, Firefox, Safari

### Getting Help:
- **Check Terminal** - Look for error messages when starting DriveGram
- **Refresh Browser** - Many issues are fixed by refreshing the page
- **Restart Application** - Stop and restart DriveGram completely
- **Check Dependencies** - Ensure Go and Node.js are properly installed
- **Review Setup** - Follow the setup commands above carefully

---

## 📱 Mobile Usage

### Accessing DriveGram on Mobile:
Since DriveGram runs locally on your computer, you can access it from your mobile device when connected to the same WiFi network:

1. **Find your computer's local IP address:**
   - **Windows**: Open Command Prompt and type `ipconfig`
   - **Mac**: Open Terminal and type `ifconfig` or `ip a`
   - **Linux**: Open Terminal and type `ip addr show`

2. **Access from mobile browser:**
   - Use `http://YOUR_IP_ADDRESS:8080` (e.g., `http://192.168.1.100:8080`)
   - Make sure your computer's firewall allows port 8080

### Mobile Features:
- **Touch Friendly** - All buttons work with touch
- **Responsive Design** - Interface adapts to your screen size
- **Mobile Upload** - Upload photos and videos directly from your device
- **Swipe Navigation** - Use gestures to navigate

### Mobile Tips:
- **Same WiFi Required** - Your mobile device must be on the same network as your computer
- **Firewall Settings** - Ensure port 8080 is not blocked by your computer's firewall
- **WiFi Uploads** - Use WiFi for large files to save mobile data
- **Browser Fullscreen** - Rotate your device for better viewing
- **Pin to Home** - Save DriveGram to your home screen for quick access

### Mobile Troubleshooting:
- **"Cannot connect"**: Check if both devices are on the same WiFi network
- **"Connection refused"**: Verify DriveGram is running on your computer
- **"Timeout"**: Check your computer's firewall settings

---

## 🔒 Privacy & Security (Local Usage)

### Your Data is Safe Because:
- **Local Storage** - Everything runs on your own computer
- **No External Servers** - Files are stored in your local database
- **No Data Sharing** - Nothing is sent to external services
- **You Control Everything** - Complete control over your data

### Local Data Storage:
- **Database Location**: `data/drivegram.db` (SQLite database)
- **File Metadata**: Stored locally in the database
- **Actual Files**: In demo mode, files are simulated (not actually stored in Telegram)
- **Session Data**: Stored in browser's local storage

### Security Best Practices:
- **Computer Security** - Keep your computer secure with password/lock screen
- **Local Network** - Only access from devices on your trusted network
- **Regular Backups** - Backup the `data/` folder regularly
- **Database Access** - Protect the `data/` folder from unauthorized access
- **Firewall Settings** - Configure firewall to only allow trusted devices

### For Production with Real Telegram:
If you configure real Telegram integration:
- **Telegram Security** - Your files are as secure as your Telegram account
- **Enable 2FA** - Use two-factor authentication in Telegram
- **Strong Password** - Use a strong password for your Telegram account

---

## 📞 Need Help?

### Self-Service:
- **This Manual** - Keep this guide handy for reference
- **Check Terminal** - Look for error messages when DriveGram starts
- **Search Function** - Use search to find files quickly
- **Try Again** - Many issues resolve themselves

### Local Development Resources:
- **Setup Guide**: See `README.md` for technical setup
- **TypeScript Issues**: See `README_TS_FIX.md` for frontend setup
- **Installation Scripts**: Use `install.sh` or `install.bat` for automated setup
- **Makefile Commands**: Run `make help` to see all available commands

---

## 🎉 Enjoy Your Personal Cloud Storage!

Congratulations! You now have a personal cloud storage system running on your own computer. Here's what you can do:

✅ **Upload photos, videos, and documents**  
✅ **Organize everything in folders**  
✅ **Access files from any device on your network**  
✅ **Stream media without downloading**  
✅ **Search and find anything instantly**  
✅ **Enjoy a beautiful, modern interface**  
✅ **Complete control over your data**  

**DriveGram gives you a powerful cloud storage solution - running locally and completely under your control!**

### Next Steps:
- **Explore Features** - Try uploading different file types
- **Organize Files** - Create folders for better organization
- **Mobile Access** - Set up mobile access using your local IP
- **Regular Backups** - Backup your `data/` folder regularly
- **Share with Family** - Help family members set up their own DriveGram

---

**Happy storing! 🚀**
