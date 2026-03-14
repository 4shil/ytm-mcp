import db from '../db';
import * as fs from 'fs';
import * as path from 'path';

export interface Playlist {
  id: string;
  name: string;
  visibility: 'public' | 'private';
}

export interface PlaylistSong {
  song_title: string;
  song_url?: string;
  artist?: string;
  position?: number;
}

export function createPlaylist(name: string, visibility: 'public' | 'private' = 'private'): Playlist {
  const id = Buffer.from(`${name}-${Date.now()}`).toString('base64').slice(0, 16);
  db.prepare(`INSERT INTO playlists (id, name, visibility) VALUES (?, ?, ?)`).run(id, name, visibility);
  console.log(`[Playlist] Created: "${name}" (${visibility})`);
  return { id, name, visibility };
}

export function addToPlaylist(playlistId: string, songs: PlaylistSong[]): void {
  const insert = db.prepare(`
    INSERT INTO playlist_songs (playlist_id, song_title, song_url, artist, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  const currentCount = (db.prepare(`SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?`).get(playlistId) as { count: number }).count;

  songs.forEach((song, i) => {
    insert.run(playlistId, song.song_title, song.song_url || null, song.artist || null, currentCount + i + 1);
  });

  console.log(`[Playlist] Added ${songs.length} songs to playlist ${playlistId}`);
}

export function removeFromPlaylist(playlistId: string, songTitle: string): void {
  db.prepare(`DELETE FROM playlist_songs WHERE playlist_id = ? AND song_title = ?`).run(playlistId, songTitle);
  console.log(`[Playlist] Removed "${songTitle}" from playlist ${playlistId}`);
}

export function getPlaylist(playlistId: string): PlaylistSong[] {
  return db.prepare(`SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC`).all(playlistId) as PlaylistSong[];
}

export function listPlaylists(): Playlist[] {
  return db.prepare(`SELECT * FROM playlists ORDER BY created_at DESC`).all() as Playlist[];
}

export function exportPlaylist(playlistId: string, format: 'json' | 'csv' = 'json'): string {
  const songs = getPlaylist(playlistId);
  const playlist = db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(playlistId) as Playlist;
  const outDir = path.resolve('./exports');
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = `${playlist?.name || playlistId}_export.${format}`;
  const outPath = path.join(outDir, fileName);

  if (format === 'json') {
    fs.writeFileSync(outPath, JSON.stringify({ playlist, songs }, null, 2));
  } else {
    const header = 'title,artist,url,position\n';
    const rows = songs.map((s) => `"${s.song_title}","${s.artist || ''}","${s.song_url || ''}","${s.position || ''}"`).join('\n');
    fs.writeFileSync(outPath, header + rows);
  }

  console.log(`[Playlist] Exported to ${outPath}`);
  return outPath;
}
