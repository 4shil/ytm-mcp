import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_PATH = path.resolve(process.env.DB_PATH || './db/ytm.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) db = new Database(DB_PATH);
  return db;
}

export function initDB(): void {
  const d = getDB();
  d.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      duration TEXT,
      url TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Migrate: add album/scraped_at columns if upgrading from old schema
  try { d.exec(`ALTER TABLE history ADD COLUMN album TEXT`); } catch {}
  try { d.exec(`ALTER TABLE history ADD COLUMN scraped_at DATETIME`); } catch {}

  console.error('[DB] Initialized.');
}

export default getDB;
