import YTDlpWrap from 'yt-dlp-wrap';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { getDB } from '../db';

dotenv.config();

const ytDlp = new YTDlpWrap();
const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || './downloads');

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

export interface SearchResult {
  title: string;
  url: string;
  duration?: string;
  channel?: string;
}

export interface DownloadResult {
  url: string;
  filePath: string;
  title: string;
  format: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Search YouTube Music for a query, return top results.
 */
export async function searchYtDlp(query: string, limit = 5): Promise<SearchResult[]> {
  console.error(`[yt-dlp] Searching: "${query}"`);

  const output = await ytDlp.execPromise([
    `ytmsearch${limit}:${query}`,
    '--print', '%(title)s|||%(webpage_url)s|||%(duration_string)s|||%(channel)s',
    '--no-download',
    '--no-playlist',
  ]).catch(() =>
    // fallback to regular YouTube search
    ytDlp.execPromise([
      `ytsearch${limit}:${query}`,
      '--print', '%(title)s|||%(webpage_url)s|||%(duration_string)s|||%(channel)s',
      '--no-download',
      '--no-playlist',
    ])
  );

  const results: SearchResult[] = [];
  for (const line of output.trim().split('\n')) {
    const [title, url, duration, channel] = line.split('|||');
    if (title && url) results.push({ title: title.trim(), url: url.trim(), duration: duration?.trim(), channel: channel?.trim() });
  }
  return results;
}

/**
 * Download a single song by URL.
 * Saves as opus (default) with embedded metadata.
 */
export async function downloadSong(
  url: string,
  format: 'opus' | 'mp3' = 'opus',
  title?: string
): Promise<DownloadResult> {
  console.error(`[yt-dlp] Downloading: ${url} → ${format}`);

  const outputTemplate = path.join(DOWNLOAD_DIR, '%(title)s [%(id)s].%(ext)s');
  const before = new Set(fs.readdirSync(DOWNLOAD_DIR));

  try {
    await ytDlp.execPromise([
      url,
      '-x',
      '--audio-format', format,
      '--audio-quality', '0',
      '--embed-thumbnail',
      '--add-metadata',
      '--output', outputTemplate,
      '--no-playlist',
    ]);

    // Find newly created file
    const after = fs.readdirSync(DOWNLOAD_DIR);
    const newFiles = after.filter(f => !before.has(f) && /\.(opus|mp3|m4a)$/.test(f));
    // Pick most recently modified if multiple
    const newFile = newFiles.sort((a, b) => {
      return fs.statSync(path.join(DOWNLOAD_DIR, b)).mtime.getTime() -
             fs.statSync(path.join(DOWNLOAD_DIR, a)).mtime.getTime();
    })[0];
    const filePath = newFile ? path.join(DOWNLOAD_DIR, newFile) : '';

    const result: DownloadResult = {
      url,
      filePath,
      title: title || newFile?.replace(/\.[^.]+$/, '') || '',
      format,
      status: 'success',
    };

    saveDownloadToDB(result);
    return result;

  } catch (err: any) {
    console.error(`[yt-dlp] Download failed: ${err.message}`);
    return { url, filePath: '', title: title || '', format, status: 'failed', error: err.message };
  }
}

/**
 * Download multiple songs concurrently (max 3 at a time).
 */
export async function downloadBatch(
  items: { url: string; title?: string }[],
  format: 'opus' | 'mp3' = 'opus',
  concurrency = 3
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const queue = [...items];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(
      batch.map(item => downloadSong(item.url, format, item.title))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * List all downloaded files.
 */
export function listDownloads(): { file: string; size: number; modified: string }[] {
  return fs.readdirSync(DOWNLOAD_DIR)
    .filter(f => /\.(opus|mp3|m4a|webm)$/.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(DOWNLOAD_DIR, f));
      return { file: f, size: stat.size, modified: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

/**
 * Save download record to DB.
 */
function saveDownloadToDB(result: DownloadResult) {
  if (result.status !== 'success' || !result.filePath) return;
  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO downloads (url, title, file_path, format, downloaded_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(result.url, result.title, result.filePath, result.format, new Date().toISOString());
}
