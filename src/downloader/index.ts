import YTDlpWrap from 'yt-dlp-wrap';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const ytDlp = new YTDlpWrap();
const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || './downloads');

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

export interface SearchResult {
  title: string;
  url: string;
}

export async function searchYtDlp(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  console.log(`[yt-dlp] Searching for: "${query}" (limit: ${limit})`);

  const results: SearchResult[] = [];

  const output = await ytDlp.execPromise([
    `ytsearch${limit}:${query}`,
    '--print',
    '%(title)s|||%(webpage_url)s',
    '--no-download',
  ]);

  for (const line of output.trim().split('\n')) {
    const [title, url] = line.split('|||');
    if (title && url) results.push({ title: title.trim(), url: url.trim() });
  }

  return results;
}

export async function downloadSong(
  url: string,
  format: 'opus' | 'mp3' = 'opus'
): Promise<string> {
  console.log(`[yt-dlp] Downloading: ${url} as ${format}`);

  const outputTemplate = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');

  await ytDlp.execPromise([
    url,
    '-x',
    '--audio-format',
    format,
    '-o',
    outputTemplate,
  ]);

  // Find the downloaded file
  const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) =>
    f.endsWith(`.${format}`)
  );
  const latest = files
    .map((f) => ({ f, mtime: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];

  return latest ? path.join(DOWNLOAD_DIR, latest.f) : '';
}

export async function downloadBatch(
  urls: string[],
  format: 'opus' | 'mp3' = 'opus'
): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    const filePath = await downloadSong(url, format);
    if (filePath) results.push(filePath);
  }
  return results;
}
