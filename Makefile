.PHONY: help build run test clean docker-build docker-run deps tidy fmt lint frontend-build frontend-dev

# Default target
help:
	@echo "DriveGram - Telegram Cloud Storage"
	@echo ""
	@echo "Available commands:"
	@echo "  help           Show this help message"
	@echo "  deps           Download Go dependencies"
	@echo "  deps-frontend  Install frontend dependencies"
	@echo "  tidy           Tidy go modules"
	@echo "  fmt            Format Go code"
	@echo "  lint           Run linter"
	@echo "  test           Run tests"
	@echo "  build          Build the Go backend"
	@echo "  frontend-build Build the Next.js frontend"
	@echo "  build-all      Build both backend and frontend"
	@echo "  run            Run the Go backend"
	@echo "  frontend-dev   Run Next.js development server"
	@echo "  dev            Run in development mode (backend only)"
	@echo "  clean          Clean build artifacts"
	@echo "  docker-build   Build Docker image"
	@echo "  docker-run     Run Docker container"

# Dependencies
deps:
	go mod download

deps-frontend:
	cd frontend && npm install

tidy:
	go mod tidy

# Code quality
fmt:
	go fmt ./...

lint:
	golangci-lint run

# Testing
test:
	go test -v ./...

# Build
build:
	CGO_ENABLED=1 go build -o drivegram main.go

frontend-build:
	cd frontend && npm run build

build-all: clean build frontend-build

# Run
run: build
	./drivegram

frontend-dev:
	cd frontend && npm run dev

# Development mode with hot reload (requires air)
dev:
	air -c .air.toml

# Full development (both frontend and backend)
dev-full: 
	@echo "Starting backend in development mode..."
	@echo "Start frontend with 'make frontend-dev' in another terminal"
	air -c .air.toml

# Clean
clean:
	rm -f drivegram main
	rm -rf data/
	rm -rf release/
	rm -rf frontend/out/
	rm -rf frontend/.next/

# Docker
docker-build:
	docker build -t drivegram .

docker-run:
	docker run -d \
		-p 8080:8080 \
		-e TELEGRAM_API_ID=${TELEGRAM_API_ID} \
		-e TELEGRAM_API_HASH=${TELEGRAM_API_HASH} \
		-e JWT_SECRET=${JWT_SECRET} \
		-v $(PWD)/data:/app/data \
		--name drivegram \
		drivegram

# Release
release: clean build-all
	mkdir -p release
	CGO_ENABLED=1 go build -o release/drivegram main.go
	cp -r frontend/out release/frontend
	cp .env.example release/.env.example
	cp README.md release/
	cp LICENSE release/
	cp docker-compose.yml release/
	cp Dockerfile release/

# Setup development environment
setup:
	cp .env.example .env
	@echo "Please edit .env file with your Telegram API credentials"
	@echo "Get your API credentials from https://my.telegram.org"
	@echo "Run 'make deps-frontend' to install frontend dependencies"
