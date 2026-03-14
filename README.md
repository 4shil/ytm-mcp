# YouTube Music MCP Server

A modular MCP (Media Control Protocol) server for YouTube Music — history extraction, playlist control, search, playback, and downloads.

## Features
- 🎵 **History Extraction** — Scrape your YT Music history
- 🔍 **Search** — Search via yt-dlp or YouTube Data API
- 📋 **Playlist Control** — Create, add, remove, export playlists
- ▶️ **Playback Control** — Play/pause/skip via browser automation
- ⬇️ **Downloader** — Batch download songs in Opus/MP3 via yt-dlp

## Tech Stack
- Node.js + TypeScript
- Playwright + Chromium (browser automation)
- yt-dlp (search + download)
- YouTube Data API v3
- SQLite (local database)
- Zod (validation)

## Setup

```bash
# Install dependencies
npm install

# Install Chromium
npx playwright install chromium

# Copy env file
cp .env.example .env
# Fill in your YouTube API key and cookie path

# Build
npm run build

# Run
npm start
```

## Environment Variables

```env
YOUTUBE_API_KEY=your_api_key_here
CHROMIUM_COOKIES_PATH=./cookies.json
DB_PATH=./db/ytm.db
DOWNLOAD_DIR=./downloads
```

## Project Structure

```
src/
├── browser/       # Chromium automation (login, navigation)
├── api/           # YouTube Data API wrapper
├── downloader/    # yt-dlp wrapper
├── playlist/      # Playlist CRUD
├── history/       # History scraping
├── tools/         # MCP tool definitions
└── index.ts       # Entry point
```

## Phases
- [x] Phase 1: Foundation Setup
- [ ] Phase 2: History Module
- [ ] Phase 3: Search Module
- [ ] Phase 4: Playlist Control
- [ ] Phase 5: Playback Control
- [ ] Phase 6: Downloader
- [ ] Phase 7: Testing & Polish
