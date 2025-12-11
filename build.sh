#!/bin/bash
# Render.com build script - installs system dependencies

# Install yt-dlp
pip install yt-dlp

# Install FFmpeg (if not present)
if ! command -v ffmpeg &> /dev/null; then
    apt-get update && apt-get install -y ffmpeg
fi

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
cd backend
npm install --only=production
cd ..

echo "Build complete!"
