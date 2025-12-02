# 🎵 Spotify to MP3 Converter

A fast, responsive, and aesthetically pleasing web application that converts Spotify tracks to downloadable MP3 files. Built with a mobile-first approach for an outstanding iOS/Android experience.

![Mobile-First Design](https://img.shields.io/badge/Design-Mobile--First-1DB954)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC)

## ✨ Features

- **Mobile-First UI**: Sleek, dark-themed design optimized for touch devices
- **One-Tap Paste**: Quick paste button for easy URL input
- **Real-Time Progress**: Animated progress indicator with status updates
- **High-Quality Audio**: Converts to 320kbps MP3 with full ID3 tags
- **Album Artwork**: Embeds cover art directly into MP3 files
- **iOS Support**: Special instructions modal for iPhone users
- **Auto-Cleanup**: Temporary files are automatically purged

## 🛠️ Tech Stack

### Frontend

- React 18 with Vite
- Tailwind CSS for styling
- PWA-ready configuration

### Backend

- Node.js + Express
- Spotify Web API for metadata
- yt-search for audio matching
- ytdl-core for audio download
- fluent-ffmpeg for MP3 conversion
- node-id3 for metadata tagging

## 📋 Prerequisites

- **Node.js** 18+
- **FFmpeg** installed and available in PATH
- **Spotify Developer Account** (for API credentials)

### Installing FFmpeg

**Windows:**

```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**

```bash
brew install ffmpeg
```

**Linux:**

```bash
sudo apt update && sudo apt install ffmpeg
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
cd "Spotify alt"

# Install all dependencies
npm run install:all
```

### 2. Configure Environment

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Copy your Client ID and Client Secret
4. Edit `backend/.env`:

```env
SPOTIFY_CLIENT_ID=your_actual_client_id
SPOTIFY_CLIENT_SECRET=your_actual_client_secret
```

> **Note:** The app works without Spotify credentials using the oEmbed API fallback, but metadata will be limited.

### 3. Run Development Servers

```bash
# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 📱 Usage

1. **Copy** a Spotify track URL (e.g., `https://open.spotify.com/track/...`)
2. **Paste** into the input field (use the Paste button on mobile)
3. **Click** "Convert & Download"
4. **Wait** for the conversion (usually 5-10 seconds)
5. **Download** your MP3 file

### iOS Users

After downloading, look for the blue download arrow in Safari's address bar. Files are saved to the Downloads folder in the Files app.

## 🏗️ Project Structure

```
spotify-mp3-converter/
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── App.jsx          # Main app component
│   │   └── index.css        # Tailwind styles
│   ├── public/              # Static assets
│   └── vite.config.js       # Vite configuration
│
├── backend/                 # Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   └── .env                 # Environment variables
│
└── package.json             # Root package.json
```

## 🔧 API Endpoints

| Method | Endpoint               | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| POST   | `/api/convert`         | Start conversion (body: `{ spotifyUrl }`) |
| GET    | `/api/status/:jobId`   | Check conversion status                   |
| GET    | `/downloads/:filename` | Download converted MP3                    |
| GET    | `/health`              | Health check                              |

## 🚢 Deployment

### Build for Production

```bash
# Build frontend
cd frontend && npm run build

# The dist folder can be served by the backend
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### Deploy to Cloud

The app is ready for deployment to:

- **Heroku**: Add `Procfile` with `web: npm start`
- **Railway**: Connect GitHub repo
- **Render**: Configure as Web Service
- **DigitalOcean App Platform**: Use Dockerfile or buildpack

## ⚠️ Legal Notice

This tool is for **personal use only**. Users are responsible for ensuring they have the right to download and convert content. This project is not affiliated with Spotify.

## 🐛 Troubleshooting

### "FFmpeg not found"

Ensure FFmpeg is installed and in your system PATH. Run `ffmpeg -version` to verify.

### "Could not find audio source"

Some tracks may not have matching audio available. Try popular/mainstream tracks.

### CORS Errors

Make sure `FRONTEND_URL` in `.env` matches your frontend's URL.

## 📝 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for music lovers
