![DriveGram](frontend/public/drivegram.png)  
  
# DriveGram

DriveGram is a full-stack application that transforms your Telegram **Saved Messages** into a personal, high-performance cloud storage workspace. It enables you to manage your files with a modern UI while leveraging Telegram's secure and unlimited infrastructure.

> [!IMPORTANT]
> **Educational Purpose**: This project is built strictly for educational purposes to demonstrate MTProto integration with modern web stacks. All resources and libraries used are publicly available. 
> 
> **Requirement**: A Telegram User API (API ID + API Hash) is required to run this application. Get yours at [my.telegram.org](https://my.telegram.org).

## Key Features
- **Real-time Sync**: Automatically syncs with your Telegram **Saved Messages** in real-time.
- **Secure Login**: Authentication via official Telegram phone OTP.
- **File Management**: Upload, download, rename, and delete files with ease.
- **Modern UI**: Theme-aware dashboard with both Grid and List view modes.
- **Media Preview**: Integrated support for previewing images, videos, and audio directly in the browser.

## Tech Stack
- **Backend**: Go + Gin (MTProto integration via `gotd/td`)
- **Frontend**: Next.js + React + Tailwind CSS
- **Database**: SQLite (via GORM)

---

## Detailed Setup Guide (Step-by-Step)

### 1. Install Required Tools

Install these first:
- Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Go: [https://go.dev/dl/](https://go.dev/dl/)
- Node.js LTS: [https://nodejs.org/](https://nodejs.org/)

Verify installation:

```bash
git --version
go version
node -v
npm -v
```

### 2. Create Telegram API Credentials

1. Open [https://my.telegram.org](https://my.telegram.org)
2. Login with your Telegram account
3. Go to **API development tools**
4. Create an app
5. Copy:
- `api_id`
- `api_hash`

You will use them in `.env`.

### 3. Clone the Repository

```bash
git clone <your-repo-url>
cd DriveGram
```

### 4. Configure Environment Variables

Create `.env` from example:

```bash
cp .env.example .env
```

If you're on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and fill all required values:

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
JWT_SECRET=your_long_random_secret
SERVER_PORT=8088
SERVER_HOST=localhost
DB_PATH=./data/drivegram.db
MAX_FILE_SIZE=2097152000
UPLOAD_CHUNK_SIZE=1048576
```

Notes:
- `JWT_SECRET` should be long and random.
- Keep `.env` private (already ignored by git).

### 5. Install Backend Dependencies

```bash
go mod tidy
go mod download
```

### 6. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 7. Build Frontend Static Output

Backend serves files from `frontend/out`, so build/export frontend first.

```bash
cd frontend
npm run build
cd ..
```

### 8. Run Backend Server

```bash
go run main.go
```

Expected server:
- API + app on `http://localhost:8088`

### 9. Use the App

1. Open `http://localhost:8088`
2. Enter Telegram phone number
3. Enter OTP received in Telegram/SMS
4. Start using DriveGram:
- Upload files
- Sync Telegram files
- Preview/download/delete

### 10. Important Runtime Notes

- If login fails, regenerate OTP and retry.
- If sync fails with auth/session errors, logout and login again.
- When frontend changes, rebuild frontend:

```bash
cd frontend
npm run build
cd ..
```

Then restart backend.

---

## Project Structure

```text
DriveGram/
+- internal/
  +- config/
  +- database/
  +- handlers/
  +- middleware/
  +- models/
  +- services/
+- frontend/
  +- app/
  +- components/
  +- hooks/
  +- lib/
  +- public/
+- .env.example
+- go.mod
+- main.go
```

---

## Troubleshooting

### OTP verify returns 401
- Make sure you are entering the latest OTP.
- Request a fresh OTP and try again.
- Ensure `.env` Telegram credentials are correct.

### Sync shows Telegram auth/session error
- Logout and login again (refresh session).
- Restart server after changing auth code.

---

## Security Notes

- Never commit `.env`.
- Use strong `JWT_SECRET`.
- Telegram account access should be used only on trusted systems.

---

## Short Guide (Quick Start)

```bash
git clone <your-repo-url>
cd DriveGram
cp .env.example .env
# Fill TELEGRAM_API_ID, TELEGRAM_API_HASH, JWT_SECRET in .env

go mod tidy
go mod download

cd frontend
npm install
npm run build
cd ..

go run main.go
```

Open: `http://localhost:8088`

---

## License

This project is licensed under the terms in `LICENSE`.
