# ytm-mcp 🎵

A Model Context Protocol (MCP) server for YouTube Music — control playback, browse history, manage playlists, and download songs, all from Claude or any MCP-compatible AI.

## Features

- 🎧 **History** — Scrape your YouTube Music listening history with song titles, artists, albums, and URLs
- 🔍 **Search** — Search YouTube Music for any song or artist
- ▶️ **Playback Control** — Play, pause, skip, seek, set volume, like/dislike, shuffle, repeat
- 📥 **Downloads** — Download songs as Opus or MP3 via yt-dlp with embedded metadata
- 📋 **Playlists** — Create, manage, and export local playlists
- 💾 **Database** — All history and downloads persisted to SQLite

---

## Requirements

- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed (`which yt-dlp`)
- Python `mutagen` library: `pip install mutagen`
- Chromium browser (for playback control)
- An active YouTube Music session in the openclaw browser profile

---

## Installation

```bash
git clone https://github.com/4shil/ytm-mcp.git
cd ytm-mcp
npm install
npm run build
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

```env
# Path to browser profile with YouTube Music logged in
BROWSER_PROFILE=/home/ashil/.openclaw/browser/openclaw/user-data

# Directory to save downloaded songs
DOWNLOAD_DIR=./downloads

# SQLite database path
DB_PATH=./db/ytm.db
```

---

## Setup

### Claude Desktop

**Config file:**
- Linux: `~/.config/Claude/claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ytm-mcp": {
      "command": "node",
      "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
        "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
        "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

### OpenClaw

Add to `~/.openclaw/config.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "ytm-mcp",
        "command": "node",
        "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
        "env": {
          "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
          "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
          "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
        }
      }
    ]
  }
}
```

Or use the mcporter CLI:

```bash
mcporter add ytm-mcp --command "node /home/ashil/Coding/ytm-mcp/dist/index.js"
```

---

### Cursor

Add to `.cursor/mcp.json` in your project root, or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "ytm-mcp": {
      "command": "node",
      "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
        "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
        "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
      }
    }
  }
}
```

---

### VS Code (Copilot / MCP extension)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "ytm-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
        "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
        "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
      }
    }
  }
}
```

---

### Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "ytm-mcp": {
      "command": {
        "path": "node",
        "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
        "env": {
          "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
          "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
          "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
        }
      }
    }
  }
}
```

---

### Continue.dev

Add to `~/.continue/config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "node",
          "args": ["/home/ashil/Coding/ytm-mcp/dist/index.js"],
          "env": {
            "BROWSER_PROFILE": "/home/ashil/.openclaw/browser/openclaw/user-data",
            "DOWNLOAD_DIR": "/home/ashil/Coding/ytm-mcp/downloads",
            "DB_PATH": "/home/ashil/Coding/ytm-mcp/db/ytm.db"
          }
        }
      }
    ]
  }
}
```

---

### Any MCP-Compatible Tool (Generic)

The server uses **stdio transport** (standard MCP). Run it with:

```bash
node /home/ashil/Coding/ytm-mcp/dist/index.js
```

Any tool that supports MCP stdio servers can connect using:
- **Command:** `node`
- **Args:** `["/home/ashil/Coding/ytm-mcp/dist/index.js"]`
- **Transport:** `stdio`

---

## Available Tools

### 🎧 History

| Tool | Description |
|------|-------------|
| `get_history` | Scrape last N songs from YTM history (default 20). Use `use_cache: true` to skip browser. |

```
get_history(limit: 12)
get_history(limit: 20, use_cache: true)
```

---

### 🔍 Search & Download

| Tool | Description |
|------|-------------|
| `search_song` | Search YouTube Music, returns title + URL + duration + channel |
| `download_song` | Download a song by URL as opus or mp3 |
| `download_history` | Batch download your last N history songs |
| `list_downloads` | List all downloaded files with sizes |

```
search_song(query: "Stars Ultra Slowed")
download_song(url: "https://music.youtube.com/watch?v=4Z8LwuQ3zao", format: "opus")
download_history(limit: 12, format: "opus")
list_downloads()
```

---

### ▶️ Playback

| Tool | Description |
|------|-------------|
| `play_song` | Search and play a song, or play by direct URL |
| `playback_control` | Full playback control |
| `get_current_song` | Get now-playing with time, volume, like status |

**`playback_control` actions:**

| Action | Effect |
|--------|--------|
| `play` | Resume playback |
| `pause` | Pause playback |
| `toggle` | Toggle play/pause |
| `next` | Next track |
| `previous` | Previous track |
| `shuffle` | Toggle shuffle |
| `repeat` | Toggle repeat |
| `like` | Like current song ❤️ |
| `dislike` | Dislike current song |
| `volume` | Set volume (0-100) |
| `seek` | Seek to seconds |

```
play_song(query: "INSONAMIA ZYZZCVNT")
play_song(url: "https://music.youtube.com/watch?v=lJDMLwJV8Dk")
playback_control(action: "like")
playback_control(action: "volume", volume: 80)
playback_control(action: "seek", seek: 45)
get_current_song()
```

---

### 📋 Playlists

| Tool | Description |
|------|-------------|
| `create_playlist` | Create a new local playlist |
| `add_to_playlist` | Add songs to a playlist |
| `list_playlists` | List all playlists |
| `export_playlist` | Export as JSON or CSV |

```
create_playlist(name: "Slowed Bangers", visibility: "private")
add_to_playlist(playlist_id: "abc123", songs: [{ song_title: "Stars", song_url: "...", artist: "SCXR SOUL" }])
export_playlist(playlist_id: "abc123", format: "json")
```

---

## Example Claude Prompts

```
"What were my last 12 songs on YouTube Music?"
"Download all my recent history as opus files"
"Play Stars Ultra Slowed by SCXR SOUL"
"Pause the music"
"Like this song and skip to the next one"
"Search for phonk songs and download the top result"
"Create a playlist called Night Drive and add my last 5 history songs"
```

---

## Project Structure

```
ytm-mcp/
├── src/
│   ├── index.ts          # MCP server + tool handlers
│   ├── db.ts             # SQLite database
│   ├── browser/          # Playwright browser control
│   ├── history/          # YouTube Music history scraper
│   ├── downloader/       # yt-dlp search + download
│   ├── tools/            # Playback controls
│   ├── playlist/         # Playlist CRUD
│   └── api/              # YouTube Data API (optional)
├── downloads/            # Downloaded songs
├── db/                   # SQLite database
├── dist/                 # Compiled output
└── .env                  # Configuration
```

---

## Troubleshooting

**History returns empty:**  
Make sure you're logged into YouTube Music in the browser profile set in `BROWSER_PROFILE`.

**Download fails with mutagen error:**  
```bash
pip install mutagen --break-system-packages
```

**Playback controls don't work:**  
YouTube Music must be open and playing in the browser. Run `play_song` first to open it.

**Git push hanging:**  
Check for large files in git history. Use `git gc --aggressive --prune=now` or reinit the repo.

---

## License

MIT
