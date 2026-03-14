import * as dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initDB } from './db';

import { scrapeHistory, getHistoryFromDB } from './history/index';
import { createPlaylist, addToPlaylist, listPlaylists, exportPlaylist, removeFromPlaylist } from './playlist/index';
import { playSong, playByUrl, play, pause, next, previous, setVolume, seekTo, likeSong, dislikeSong, shuffleToggle, repeatToggle, getCurrentSong, togglePlayPause } from './tools/playback';
import { launchBrowser, closeBrowser } from './browser/index';
import { searchYtDlp, downloadSong, downloadBatch, listDownloads } from './downloader/index';

// Init DB
initDB();

const server = new Server(
  { name: 'ytm-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ───────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_history',
      description: 'Get YouTube Music listening history (scrapes live or returns cached)',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of songs to fetch (default 20)' },
          use_cache: { type: 'boolean', description: 'Return cached DB results instead of scraping (default false)' },
        },
      },
    },
    {
      name: 'play_song',
      description: 'Search and play a song on YouTube Music',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Song name or artist to search' },
          url: { type: 'string', description: 'Direct YouTube Music URL to play' },
        },
      },
    },
    {
      name: 'playback_control',
      description: 'Control playback: play, pause, next, previous, shuffle, repeat, like, dislike',
      inputSchema: {
        type: 'object',
        required: ['action'],
        properties: {
          action: {
            type: 'string',
            enum: ['play', 'pause', 'toggle', 'next', 'previous', 'shuffle', 'repeat', 'like', 'dislike'],
          },
          volume: { type: 'number', description: 'Volume 0-100 (use with set_volume action)' },
          seek: { type: 'number', description: 'Seek to seconds (use with seek action)' },
        },
      },
    },
    {
      name: 'get_current_song',
      description: 'Get the currently playing song',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'create_playlist',
      description: 'Create a new local playlist',
      inputSchema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          visibility: { type: 'string', enum: ['public', 'private'] },
        },
      },
    },
    {
      name: 'add_to_playlist',
      description: 'Add songs to a playlist',
      inputSchema: {
        type: 'object',
        required: ['playlist_id', 'songs'],
        properties: {
          playlist_id: { type: 'string' },
          songs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                song_title: { type: 'string' },
                song_url: { type: 'string' },
                artist: { type: 'string' },
              },
            },
          },
        },
      },
    },
    {
      name: 'list_playlists',
      description: 'List all saved playlists',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'export_playlist',
      description: 'Export a playlist as JSON or CSV',
      inputSchema: {
        type: 'object',
        required: ['playlist_id'],
        properties: {
          playlist_id: { type: 'string' },
          format: { type: 'string', enum: ['json', 'csv'] },
        },
      },
    },
    {
      name: 'search_song',
      description: 'Search YouTube Music for a song',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Song name or artist' },
          limit: { type: 'number', description: 'Max results (default 5)' },
        },
      },
    },
    {
      name: 'download_song',
      description: 'Download a song by YouTube Music URL',
      inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'YouTube Music URL' },
          format: { type: 'string', enum: ['opus', 'mp3'], description: 'Audio format (default opus)' },
          title: { type: 'string', description: 'Optional title hint' },
        },
      },
    },
    {
      name: 'download_history',
      description: 'Download last N songs from listening history',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of history songs to download (default 12)' },
          format: { type: 'string', enum: ['opus', 'mp3'], description: 'Audio format (default opus)' },
        },
      },
    },
    {
      name: 'list_downloads',
      description: 'List all downloaded songs',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// ─── Tool Handlers ───────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case 'get_history': {
        const limit = (args?.limit as number) || 20;
        const useCache = args?.use_cache as boolean || false;
        let items;
        if (useCache) {
          items = getHistoryFromDB(limit);
        } else {
          await launchBrowser(true);
          items = await scrapeHistory(limit);
          await closeBrowser();
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
        };
      }

      case 'play_song': {
        await launchBrowser(false);
        if (args?.url) {
          await playByUrl(args.url as string);
          return { content: [{ type: 'text', text: `▶️ Playing: ${args.url}` }] };
        }
        const title = await playSong(args?.query as string);
        return { content: [{ type: 'text', text: `▶️ Now playing: ${title}` }] };
      }

      case 'playback_control': {
        const action = args?.action as string;
        switch (action) {
          case 'play':     await play(); break;
          case 'pause':    await pause(); break;
          case 'toggle':   await togglePlayPause(); break;
          case 'next':     await next(); break;
          case 'previous': await previous(); break;
          case 'shuffle':  await shuffleToggle(); break;
          case 'repeat':   await repeatToggle(); break;
          case 'like':     await likeSong(); break;
          case 'dislike':  await dislikeSong(); break;
          case 'volume':
            await setVolume(args?.volume as number ?? 50); break;
          case 'seek':
            await seekTo(args?.seek as number ?? 0); break;
        }
        return { content: [{ type: 'text', text: `✅ ${action} executed` }] };
      }

      case 'get_current_song': {
        const song = await getCurrentSong();
        if (!song) return { content: [{ type: 'text', text: '⏹ Nothing playing' }] };
        const state = song.isPlaying ? '▶️' : '⏸';
        const liked = song.liked ? ' ❤️' : '';
        const text = `${state} ${song.title} — ${song.artist}${liked}\n⏱ ${song.currentTime} / ${song.duration} | 🔊 ${song.volume}%`;
        return { content: [{ type: 'text', text: text }] };
      }

      case 'create_playlist': {
        const pl = createPlaylist(
          args?.name as string,
          (args?.visibility as 'public' | 'private') || 'private'
        );
        return { content: [{ type: 'text', text: `Created playlist: ${pl.name} (ID: ${pl.id})` }] };
      }

      case 'add_to_playlist': {
        addToPlaylist(args?.playlist_id as string, args?.songs as any[]);
        return { content: [{ type: 'text', text: 'Songs added to playlist.' }] };
      }

      case 'list_playlists': {
        const pls = listPlaylists();
        return { content: [{ type: 'text', text: JSON.stringify(pls, null, 2) }] };
      }

      case 'export_playlist': {
        const out = exportPlaylist(
          args?.playlist_id as string,
          (args?.format as 'json' | 'csv') || 'json'
        );
        return { content: [{ type: 'text', text: `Exported to: ${out}` }] };
      }

      case 'search_song': {
        const results = await searchYtDlp(args?.query as string, (args?.limit as number) || 5);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'download_song': {
        const result = await downloadSong(
          args?.url as string,
          (args?.format as 'opus' | 'mp3') || 'opus',
          args?.title as string | undefined
        );
        const msg = result.status === 'success'
          ? `✅ Downloaded: ${result.title}\nFile: ${result.filePath}`
          : `❌ Failed: ${result.error}`;
        return { content: [{ type: 'text', text: msg }] };
      }

      case 'download_history': {
        const limit = (args?.limit as number) || 12;
        const format = (args?.format as 'opus' | 'mp3') || 'opus';
        // Get from DB cache (already scraped)
        const { getHistoryFromDB } = await import('./history/index.js');
        const history = getHistoryFromDB(limit);
        if (history.length === 0) {
          return { content: [{ type: 'text', text: 'No history in DB. Run get_history first.' }] };
        }
        const items = history.filter(h => h.url).map(h => ({ url: h.url, title: h.title }));
        const results = await downloadBatch(items, format);
        const success = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const summary = results.map(r =>
          `${r.status === 'success' ? '✅' : '❌'} ${r.title}`
        ).join('\n');
        return { content: [{ type: 'text', text: `Downloaded ${success}/${results.length} songs (${failed} failed)\n\n${summary}` }] };
      }

      case 'list_downloads': {
        const files = listDownloads();
        if (files.length === 0) return { content: [{ type: 'text', text: 'No downloads yet.' }] };
        const list = files.map(f => `${f.file} (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join('\n');
        return { content: [{ type: 'text', text: list }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

// ─── Start Server ────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🎵 ytm-mcp MCP server running...');
}

main().catch(console.error);
