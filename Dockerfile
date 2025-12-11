# Build stage for frontend
# Updated: Force rebuild
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

# Install system dependencies (ffmpeg, yt-dlp, python for yt-dlp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    && pip3 install --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/src ./src

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create temp directory
RUN mkdir -p temp

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV TEMP_FILES_PATH=./temp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "src/server.js"]
