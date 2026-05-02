#!/bin/bash

echo "🚀 Installing DriveGram - Telegram Cloud Storage"
echo "=================================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18 or higher."
    exit 1
fi

# Check Go
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup environment
echo "📝 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📄 Created .env file from template"
    echo "⚠️  Please edit .env file with your Telegram API credentials"
fi

# Install Go dependencies
echo "📦 Installing Go dependencies..."
go mod download

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data

echo "✅ Installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env file with your Telegram API credentials"
echo "2. Run 'make dev' for development or 'make run' for production"
echo ""
echo "📚 For detailed instructions, see FRONTEND_SETUP.md"
