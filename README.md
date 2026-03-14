<p align="center">
  <h1 align="center">🎵 ytm-mcp</h1>
  <p align="center">A full-featured <strong>YouTube Music MCP server</strong> — control playback, browse history, download songs, manage playlists, and more from any AI assistant.</p>
  <p align="center">
    <a href="https://github.com/4shil/ytm-mcp/stargazers"><img src="https://img.shields.io/github/stars/4shil/ytm-mcp?style=flat-square" /></a>
    <a href="https://github.com/4shil/ytm-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
    <img src="https://img.shields.io/badge/MCP-compatible-brightgreen?style=flat-square" />
    <img src="https://img.shields.io/badge/built%20with-TypeScript-blue?style=flat-square" />
  </p>
</p>

---

## What is ytm-mcp?

**ytm-mcp** is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI assistants full control over YouTube Music. Connect it to Claude, Cursor, VS Code, or any MCP-compatible tool and control your music with natural language.

```
"What were my last 12 songs?"
"Download all my recent history as opus files"
"Play Stars Ultra Slowed and like it"
"Skip to the next track and turn the volume to 70"
"Create a playlist called Night Drive from my history"
```

---

## ✨ Features

| Category | What you get |
|----------|-------------|
| 🎧 **History** | Scrape your full listening history with titles, artists, albums & URLs |
| 🔍 **Search** | Search YouTube Music for any song, artist, or album |
| ▶️ **Playback** | Play, pause, skip, seek, volume, like, shuffle, repeat |
| 📥 **Downloads** | Download songs as Opus or MP3 via yt-dlp with embedded metadata & thumbnails |
| 📋 **Playlists** | Create, edit, export local playlists as JSON or CSV |
| 💾 **Database** | SQLite persistence — history, downloads, playlists all cached locally |

---

## 🛠 Requirements

- **Node.js** 18+
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — for downloading songs
- **Python mutagen** — for embedding metadata: `pip install mutagen`
- **Chrome or Chromium** — must be logged into YouTube Music

---

## 🚀 Installation

```bash
# 1. Clone the repo
git clone https://github.com/4shil/ytm-mcp.git
cd ytm-mcp

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Configure
cp .env.example .env
```

### Find your Chrome profile path

This is the folder where your browser stores your logged-in session.

| Platform | Path |
|----------|------|
| Linux (Chrome) | `~/.config/google-chrome/Default` |
| Linux (Chromium) | `~/.config/chromium/Default` |
| macOS (Chrome) | `~/Library/Application Support/Google/Chrome/Default` |
| Windows (Chrome) | `%LOCALAPPDATA%\Google\Chrome\User Data\Default` |

> ⚠️ The profile must already be logged into YouTube Music. The server won't handle login — just reuse your existing session.

### `.env` Configuration

```env
# Your Chrome/Chromium profile path (see table above)
BROWSER_PROFILE=/path/to/your/chrome-profile

# Where downloaded songs are saved
DOWNLOAD_DIR=./downloads

# SQLite database location
DB_PATH=./db/ytm.db
```

---

## 🔌 Connect to Your AI Tool

### Claude Desktop

Edit `claude_desktop_config.json`:
- **Linux:** `~/.config/Claude/claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ytm-mcp": {
      "command": "node",
      "args": ["/path/to/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/path/to/your/chrome-profile"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see ytm-mcp in the tools list. ✅

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
        "args": ["/path/to/ytm-mcp/dist/index.js"],
        "env": {
          "BROWSER_PROFILE": "/path/to/your/chrome-profile"
        }
      }
    ]
  }
}
```

Or with mcporter:

```bash
mcporter add ytm-mcp --command "node /path/to/ytm-mcp/dist/index.js"
```

---

### Cursor

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ytm-mcp": {
      "command": "node",
      "args": ["/path/to/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/path/to/your/chrome-profile"
      }
    }
  }
}
```

---

### VS Code (GitHub Copilot)

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "ytm-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/ytm-mcp/dist/index.js"],
      "env": {
        "BROWSER_PROFILE": "/path/to/your/chrome-profile"
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
        "args": ["/path/to/ytm-mcp/dist/index.js"],
        "env": {
          "BROWSER_PROFILE": "/path/to/your/chrome-profile"
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
          "args": ["/path/to/ytm-mcp/dist/index.js"],
          "env": {
            "BROWSER_PROFILE": "/path/to/your/chrome-profile"
          }
        }
      }
    ]
  }
}
```

---

### Any MCP Tool (Generic)

ytm-mcp uses standard **stdio transport**. Any MCP-compatible tool can connect:

```
Transport: stdio
Command:   node
Args:      ["/path/to/ytm-mcp/dist/index.js"]
```

---

## 🧰 Tools Reference

### 🎧 History

#### `get_history`
Scrape your YouTube Music listening history.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `20` | Number of songs to fetch |
| `use_cache` | boolean | `false` | Return cached DB results (no browser) |

```
get_history(limit: 12)
get_history(limit: 50, use_cache: true)
```

---

### 🔍 Search & Download

#### `search_song`
Search YouTube Music for songs.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Song, artist, or album name |
| `limit` | number | `5` | Max results to return |

#### `download_song`
Download a single song by URL.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | YouTube Music URL |
| `format` | string | `opus` | `opus` or `mp3` |
| `title` | string | — | Optional title hint |

#### `download_history`
Batch download your recent listening history.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `12` | Songs to download |
| `format` | string | `opus` | `opus` or `mp3` |

#### `list_downloads`
List all downloaded files with sizes and timestamps.

---

### ▶️ Playback

#### `play_song`
Search and play a song, or play by direct URL.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query (e.g. `"INSONAMIA ZYZZCVNT"`) |
| `url` | string | Direct YouTube Music URL |

#### `playback_control`
Full playback control in one tool.

| Action | Description |
|--------|-------------|
| `play` | Resume playback |
| `pause` | Pause playback |
| `toggle` | Toggle play/pause |
| `next` | Next track |
| `previous` | Previous track |
| `shuffle` | Toggle shuffle |
| `repeat` | Cycle repeat mode |
| `like` | Like current song ❤️ |
| `dislike` | Dislike current song |
| `volume` | Set volume (`volume: 80`) |
| `seek` | Seek to seconds (`seek: 45`) |

#### `get_current_song`
Get the current now-playing state.

```
▶️ Stars (Ultra Slowed) — SCXR SOUL ❤️
⏱ 0:42 / 1:46 | 🔊 80%
```

---

### 📋 Playlists

#### `create_playlist`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | required | Playlist name |
| `visibility` | string | `private` | `public` or `private` |

#### `add_to_playlist`

| Parameter | Type | Description |
|-----------|------|-------------|
| `playlist_id` | string | Target playlist ID |
| `songs` | array | Array of `{ song_title, song_url, artist }` |

#### `list_playlists`
List all saved playlists.

#### `export_playlist`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `playlist_id` | string | required | Playlist to export |
| `format` | string | `json` | `json` or `csv` |

---

## 🗺 Roadmap

These tools are planned for future releases. PRs welcome!

| Tool | Description |
|------|-------------|
| `get_queue` | View the current playback queue |
| `add_to_queue` | Add a song to the queue without interrupting playback |
| `clear_queue` | Clear the current queue |
| `get_lyrics` | Fetch lyrics for the current or any song |
| `get_recommendations` | Get AI-recommended songs based on listening history |
| `get_artist_info` | Get artist bio, top songs, and discography |
| `get_album` | Browse an album and list all tracks |
| `get_trending` | Get trending songs and charts by region |
| `remove_from_history` | Delete a specific song from your history |
| `download_playlist` | Download an entire playlist at once |
| `set_sleep_timer` | Auto-pause playback after N minutes |
| `smart_playlist` | Auto-generate a playlist based on mood, genre, or history |

---

## 📁 Project Structure

```
ytm-mcp/
├── src/
│   ├── index.ts          # MCP server entry point & tool handlers
│   ├── db.ts             # SQLite database setup & migrations
│   ├── browser/          # Playwright browser control
│   ├── history/          # YouTube Music history scraper
│   ├── downloader/       # yt-dlp search & download
│   ├── tools/            # Playback controls
│   ├── playlist/         # Playlist CRUD
│   └── api/              # YouTube Data API (optional)
├── downloads/            # Downloaded songs (gitignored)
├── db/                   # SQLite database (gitignored)
├── dist/                 # Compiled JS output
├── .env.example          # Environment variable template
└── README.md
```

---

## ❓ Troubleshooting

**History returns empty**  
→ Make sure `BROWSER_PROFILE` points to a profile that's already logged into YouTube Music. Open it in Chrome/Chromium and sign in manually first.

**Download fails with mutagen error**
```bash
pip install mutagen --break-system-packages
```

**Playback controls don't work**  
→ YouTube Music must be open in the browser. Run `play_song` first to open it.

**`chromium` not found**  
→ Install it: `sudo apt install chromium` or adjust `BROWSER_PROFILE` to point to Chrome.

**Build errors**
```bash
rm -rf dist node_modules
npm install
npm run build
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-tool`
3. Commit your changes: `git commit -m 'feat: add get_queue tool'`
4. Push and open a PR

See the [Roadmap](#roadmap) for ideas on what to build next.

---

## 📄 License

MIT © [4shil](https://github.com/4shil)
