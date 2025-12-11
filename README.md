# 🎵 Riff - Spotify & YouTube to MP3 Converter

A fast, responsive, and production-ready web application that converts Spotify tracks/playlists and YouTube videos to downloadable MP3 files. Built with a mobile-first approach for an outstanding iOS/Android experience.

![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC)

## ✨ Features

- **Spotify & YouTube Support**: Convert tracks from both platforms
- **Playlist Downloads**: Download entire Spotify playlists as ZIP files
- **Parallel Processing**: 4 concurrent downloads for faster playlist conversion
- **Mobile-First UI**: Sleek, dark-themed design optimized for touch devices
- **High-Quality Audio**: Converts to 320kbps MP3 with full ID3 tags
- **Album Artwork**: Embeds cover art directly into MP3 files
- **Job Persistence**: SQLite database stores conversion jobs across restarts
- **Production Security**: Rate limiting, helmet, CORS protection
- **Auto-Cleanup**: Temporary files and expired jobs are automatically purged

## 🛠️ Tech Stack

### Frontend

- React 18 with Vite
- Tailwind CSS for styling
- PWA-ready configuration

### Backend

- Node.js + Express
- SQLite for job persistence
- Spotify Web API for metadata
- yt-dlp for audio download
- fluent-ffmpeg for MP3 conversion
- Rate limiting & security headers

## 📋 Prerequisites

- **Node.js** 18+
- **FFmpeg** installed and available in PATH
- **yt-dlp** installed (or youtube-dl-exec will handle it)
- **Spotify Developer Account** (for API credentials)

### Installing Dependencies

**Windows:**

```bash
# FFmpeg - using Chocolatey
choco install ffmpeg

# yt-dlp
pip install yt-dlp
```

**macOS:**

```bash
brew install ffmpeg yt-dlp
```

**Linux:**

```bash
sudo apt update && sudo apt install ffmpeg
pip install yt-dlp
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/JAISE04/Riff.git
cd Riff
npm run install:all
```

### 2. Configure Environment

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app and get your credentials
3. Create `backend/.env`:

```env
NODE_ENV=development
PORT=3001
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
FRONTEND_URL=http://localhost:5173
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## 🚢 Production Deployment

### Option 1: Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. Connect your GitHub repo to Railway
2. Set environment variables:
   - `NODE_ENV=production`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `FRONTEND_URL` (your Railway app URL)
3. Railway will auto-deploy using `railway.toml`

### Option 2: Render

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set build command: `chmod +x build.sh && ./build.sh`
4. Set start command: `cd backend && npm start`
5. Add environment variables

### Option 3: Docker

```bash
# Build the image
npm run docker:build

# Run with your .env file
npm run docker:run

# Or manually
docker run -p 3001:3001 \
  -e SPOTIFY_CLIENT_ID=xxx \
  -e SPOTIFY_CLIENT_SECRET=xxx \
  -e NODE_ENV=production \
  riff
```

### Option 4: VPS (DigitalOcean, AWS, etc.)

```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm ffmpeg python3-pip
pip install yt-dlp

# Clone and setup
git clone https://github.com/JAISE04/Riff.git
cd Riff
npm run install:all
npm run build

# Start with PM2 (recommended)
npm install -g pm2
cd backend
NODE_ENV=production pm2 start src/server.js --name riff
pm2 save
pm2 startup
```

## 🔧 Environment Variables

| Variable                  | Description                            | Required | Default                 |
| ------------------------- | -------------------------------------- | -------- | ----------------------- |
| `NODE_ENV`                | Environment mode                       | No       | `development`           |
| `PORT`                    | Server port                            | No       | `3001`                  |
| `SPOTIFY_CLIENT_ID`       | Spotify API client ID                  | Yes      | -                       |
| `SPOTIFY_CLIENT_SECRET`   | Spotify API secret                     | Yes      | -                       |
| `FRONTEND_URL`            | Allowed CORS origins (comma-separated) | No       | `http://localhost:5173` |
| `TEMP_FILES_PATH`         | Temp files directory                   | No       | `./temp`                |
| `FILE_EXPIRATION_MINUTES` | Auto-cleanup after minutes             | No       | `30`                    |

## 📊 API Endpoints

| Endpoint             | Method | Description                        |
| -------------------- | ------ | ---------------------------------- |
| `/api/convert`       | POST   | Start a conversion job             |
| `/api/status/:jobId` | GET    | Check conversion status            |
| `/api/stats`         | GET    | Get server statistics              |
| `/health`            | GET    | Health check with memory/job stats |
| `/downloads/:file`   | GET    | Download converted file            |

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 req/15min general, 10 conversions/min
- **CORS**: Configurable allowed origins
- **Input Validation**: URL pattern validation
- **Error Sanitization**: No stack traces in production

## 📁 Project Structure

```
Riff/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── routes/
│   │   │   └── conversion.js  # API routes
│   │   ├── services/
│   │   │   ├── spotifyService.js
│   │   │   ├── youtubeService.js
│   │   │   └── conversionService.js
│   │   └── utils/
│   │       ├── database.js    # SQLite job store
│   │       └── fileManager.js # Temp file cleanup
│   ├── temp/                  # Converted files
│   └── riff.db               # SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── dist/                 # Production build
├── Dockerfile
├── railway.toml
├── render.yaml
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Note**: This application is for personal use only. Please respect copyright laws and only download content you have the right to access.
