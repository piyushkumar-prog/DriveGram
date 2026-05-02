# Frontend Setup Instructions

## Issue Resolution

The TypeScript errors you're seeing are because the Next.js dependencies haven't been installed yet. Follow these steps to resolve all issues:

## Quick Setup

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2. Build the Frontend
```bash
npm run build
```

### 3. Start Development Server
```bash
npm run dev
```

## Alternative: Using Makefile

From the root directory:
```bash
# Install frontend dependencies
make deps-frontend

# Build frontend
make frontend-build

# Start frontend development server
make frontend-dev
```

## Complete Development Setup

For full development with both frontend and backend:

### Terminal 1 - Backend:
```bash
make dev
```

### Terminal 2 - Frontend:
```bash
make frontend-dev
```

Then visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Production Build

```bash
# Build everything
make build-all

# Run production server
make run
```

Then visit: http://localhost:8080

## Troubleshooting

### If you still see TypeScript errors:

1. **Clear node_modules and reinstall:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

2. **Check Node.js version:**
```bash
node --version  # Should be 18 or higher
npm --version   # Should be 9 or higher
```

3. **Restart TypeScript server:**
- In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

### Common Issues:

- **Module not found errors**: Run `npm install` in the frontend directory
- **TypeScript errors**: Will resolve after dependencies are installed
- **Build fails**: Check that all dependencies are installed correctly

## Dependencies Installed

The frontend uses these key packages:
- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **React Dropzone** - File uploads

All dependencies are automatically installed when you run `npm install`.
