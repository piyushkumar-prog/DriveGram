#!/bin/bash

echo "Setting up Next.js frontend dependencies..."

# Install dependencies
npm install

# Create missing directories
mkdir -p out
mkdir -p .next

echo "Frontend setup complete!"
echo "Run 'npm run dev' to start the development server"
