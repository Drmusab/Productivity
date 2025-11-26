#!/bin/bash

# Build script for n8n custom node
# Make this script executable: chmod +x build.sh

set -e

echo "Building n8n Kanban App Custom Node..."

# Navigate to n8n directory
cd "$(dirname "$0")"

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

echo "Build complete! The custom node is ready in the dist/ folder."
echo ""
echo "To build the Docker image, run:"
echo "  docker build -t kanban-n8n -f Dockerfile ."
echo ""
echo "To use with an existing n8n installation, copy this package to:"
echo "  ~/.n8n/custom/n8n-nodes-kanban-app/"
