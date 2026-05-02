# DriveGram - Telegram Cloud Storage

![DriveGram Logo](https://via.placeholder.com/150x150/4299e1/ffffff?text=DriveGram)

A full-stack open-source web application that transforms your Telegram account into an unlimited personal cloud storage system. Built with Golang backend and modern web frontend.

> **⚠️ Educational Purpose Only**: This project is strictly for educational purposes. Please respect Telegram's Terms of Service and use responsibly.

## ✨ Features

### Core Features
- 🔐 **Telegram Authentication**: Login using your Telegram account via OTP
- 📁 **Google Drive-like Interface**: Clean, modern, and intuitive file management
- ⬆️ **File Upload**: Upload large files with chunking support
- 📥 **File Download**: Download files anytime from Telegram storage
- 🎬 **Media Streaming**: Stream video/audio files directly with range request support
- 🔍 **Search**: Powerful search functionality across your files
- 📂 **Folder Structure**: Virtual folders for better organization
- 🌙 **Dark Mode**: Toggle between light and dark themes

### Advanced Features
- 🎯 **Drag & Drop**: Intuitive file upload with drag-and-drop support
- 👁️ **File Previews**: Quick preview for images and videos
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🔄 **Real-time Updates**: Live file status updates
- 🔗 **Shareable Links**: Generate shareable download links (coming soon)
- ⚛️ **Next.js Frontend**: Modern React-based frontend with TypeScript
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS and shadcn/ui components

## 🏗️ Architecture

```
DriveGram/
├── internal/
│   ├── config/          # Configuration management
│   ├── database/        # Database initialization and migrations
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # Authentication and CORS middleware
│   ├── models/          # Database models
│   └── services/        # Business logic (Telegram, Auth, File services)
├── frontend/            # Next.js frontend application
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and API client
│   ├── package.json     # Frontend dependencies
│   └── next.config.js   # Next.js configuration
├── data/                # SQLite database and temporary files
├── docker-compose.yml   # Docker configuration
├── Dockerfile          # Docker build configuration
├── Makefile            # Build automation
└── main.go             # Application entry point
```

## 🚀 Quick Start

### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- npm or yarn
- Telegram API credentials (get from [my.telegram.org](https://my.telegram.org))
- SQLite3

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/drivegram.git
cd drivegram
```

### 2. Get Telegram API Credentials
1. Visit [my.telegram.org](https://my.telegram.org)
2. Sign in with your Telegram account
3. Go to "API development tools"
4. Create a new application
5. Note down your **API ID** and **API Hash**

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Telegram API Credentials
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
SERVER_PORT=8080
SERVER_HOST=localhost

# Database
DB_PATH=./data/drivegram.db

# File Upload Settings
MAX_FILE_SIZE=2097152000  # 2GB
UPLOAD_CHUNK_SIZE=1048576  # 1MB

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 4. Install Dependencies
```bash
# Install Go dependencies
go mod download

# Install frontend dependencies
make deps-frontend
# or
cd frontend && npm install
```

### 5. Build the Frontend
```bash
# Build Next.js frontend
make frontend-build
# or
cd frontend && npm run build
```

### 6. Run the Application
```bash
# Build and run everything
make build-all
make run

# Or run in development mode
make dev-full
```

Visit `http://localhost:8080` in your browser.

### Development Mode
For development, you can run the frontend and backend separately:

```bash
# Terminal 1: Run backend with hot reload
make dev

# Terminal 2: Run frontend development server
make frontend-dev
```

Then visit `http://localhost:3000` for the frontend development server.

## 🐳 Docker Setup

### Using Docker Compose (Recommended)
```bash
# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Run with Docker Compose
docker-compose up -d
```

### Using Docker directly
```bash
# Build the image
docker build -t drivegram .

# Run the container
docker run -d \
  -p 8080:8080 \
  -e TELEGRAM_API_ID=your_api_id \
  -e TELEGRAM_API_HASH=your_api_hash \
  -e JWT_SECRET=your_jwt_secret \
  -v $(pwd)/data:/app/data \
  --name drivegram \
  drivegram
```

## 📖 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone_number": "+1234567890"
}
```

#### Verify OTP
```http
POST /api/v1/auth/verify
Content-Type: application/json

{
  "phone_number": "+1234567890",
  "code": "12345",
  "phone_code_hash": "received_hash"
}
```

#### Get User Info
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### File Management Endpoints

#### List Files
```http
GET /api/v1/files?folder_id=<optional>
Authorization: Bearer <token>
```

#### Upload File
```http
POST /api/v1/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file_data>
folder_id: <optional_folder_id>
```

#### Download File
```http
GET /api/v1/files/<file_id>/download
Authorization: Bearer <token>
```

#### Stream File
```http
GET /api/v1/files/<file_id>/stream
Authorization: Bearer <token>
Range: bytes=0-1023  # For partial content
```

#### Delete File
```http
DELETE /api/v1/files/<file_id>
Authorization: Bearer <token>
```

#### Create Folder
```http
POST /api/v1/files/mkdir
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Folder",
  "parent_id": null
}
```

#### Search Files
```http
GET /api/v1/search?q=<query>
Authorization: Bearer <token>
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TELEGRAM_API_ID` | Telegram API ID | - | ✅ |
| `TELEGRAM_API_HASH` | Telegram API Hash | - | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `SERVER_PORT` | Server port | 8080 | ❌ |
| `SERVER_HOST` | Server host | localhost | ❌ |
| `DB_PATH` | SQLite database path | ./data/drivegram.db | ❌ |
| `MAX_FILE_SIZE` | Maximum file size (bytes) | 2097152000 (2GB) | ❌ |
| `UPLOAD_CHUNK_SIZE` | Upload chunk size (bytes) | 1048576 (1MB) | ❌ |

## 🔒 Security Considerations

- **API Credentials**: Never expose your Telegram API credentials in client-side code
- **JWT Secret**: Use a strong, random JWT secret key
- **Rate Limiting**: Be mindful of Telegram's API rate limits
- **File Validation**: Always validate file types and sizes
- **HTTPS**: Use HTTPS in production environments

## 📊 Limitations

- **Telegram API Limits**: Subject to Telegram's API rate limits and file size restrictions
- **Storage**: Actual storage is provided by Telegram's "Saved Messages"
- **Concurrent Uploads**: Limited by Telegram Bot API concurrent request limits
- **File Types**: Some file types may not be supported for preview

## 🛠️ Development

### Project Structure
```
internal/
├── config/      # Configuration management
├── database/    # Database setup and migrations
├── handlers/    # HTTP handlers for API endpoints
├── middleware/  # Authentication, CORS, logging
├── models/      # GORM models for database entities
└── services/    # Business logic services

web/
├── static/      # JavaScript, CSS, images
└── templates/   # HTML templates
```

### Adding New Features
1. Create/update models in `internal/models/`
2. Implement business logic in `internal/services/`
3. Add API endpoints in `internal/handlers/`
4. Update frontend in `web/static/app.js`

### Running Tests
```bash
go test ./...
```

### Building for Production
```bash
# Build binary
CGO_ENABLED=1 go build -o drivegram main.go

# Create release
mkdir -p release
cp drivegram release/
cp -r web release/
cp .env.example release/.env.example
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow Go conventions and best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Educational Purpose Only**: This project is intended for educational purposes only. Users are responsible for:

- Complying with Telegram's Terms of Service
- Ensuring they have proper rights to upload and store files
- Understanding the security implications of storing data on third-party platforms
- Using this software responsibly and ethically

The developers are not responsible for any misuse of this software or any violations of Telegram's terms.

## 🆘 Support

- 📧 Email: support@drivegram.dev
- 💬 Discord: [Join our community](https://discord.gg/drivegram)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/drivegram/issues)
- 📖 Wiki: [Documentation](https://github.com/yourusername/drivegram/wiki)

## 🙏 Acknowledgments

- [Telegram](https://telegram.org) for providing the API
- [Gin](https://gin-gonic.com) for the web framework
- [GORM](https://gorm.io) for the ORM
- [Tailwind CSS](https://tailwindcss.com) for the styling
- The open-source community for inspiration and tools

---

**Made with ❤️ for the educational community**
