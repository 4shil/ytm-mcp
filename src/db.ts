import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_PATH = path.resolve(process.env.DB_PATH || './db/ytm.db');

// Ensure db directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

export function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      duration TEXT,
      url TEXT,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      visibility TEXT DEFAULT 'private',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id TEXT NOT NULL,
      song_title TEXT NOT NULL,
      song_url TEXT,
      artist TEXT,
      position INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[DB] Initialized.');
}

export default db;
