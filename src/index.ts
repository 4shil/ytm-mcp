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
import { playSong, play, pause, next, previous, setVolume, getCurrentSong } from './tools/playback';
import { launchBrowser, closeBrowser } from './browser/index';

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
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Song name or artist to search' },
        },
      },
    },
    {
      name: 'playback_control',
      description: 'Control playback: play, pause, next, previous',
      inputSchema: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['play', 'pause', 'next', 'previous'] },
          volume: { type: 'number', description: 'Volume level 0-100 (only for set_volume)' },
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
        const query = args?.query as string;
        await launchBrowser(false);
        const title = await playSong(query);
        return {
          content: [{ type: 'text', text: `Now playing: ${title}` }],
        };
      }

      case 'playback_control': {
        const action = args?.action as string;
        const volume = args?.volume as number | undefined;
        if (action === 'play') await play();
        else if (action === 'pause') await pause();
        else if (action === 'next') await next();
        else if (action === 'previous') await previous();
        else if (action === 'set_volume' && volume !== undefined) await setVolume(volume);
        return { content: [{ type: 'text', text: `Playback: ${action} executed` }] };
      }

      case 'get_current_song': {
        const song = await getCurrentSong();
        return {
          content: [{ type: 'text', text: song ? `${song.title} — ${song.artist}` : 'Nothing playing' }],
        };
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
