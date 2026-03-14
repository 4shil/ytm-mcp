import { ensurePage, navigateTo, saveSession } from '../browser/index';
import { getDB } from '../db';

export interface HistoryItem {
  id: string;          // YouTube video ID
  title: string;
  artist: string;
  album: string;
  duration: string;
  url: string;
  scrapedAt: string;
}

/**
 * Scrape YouTube Music history page.
 * Scrolls to load more items until `limit` is reached or no new items appear.
 */
export async function scrapeHistory(limit = 20): Promise<HistoryItem[]> {
  await navigateTo('https://music.youtube.com/history');
  const page = await ensurePage();

  // Wait for the first item
  try {
    await page.waitForSelector('ytmusic-responsive-list-item-renderer', { timeout: 20000 });
  } catch {
    console.error('[History] Timeout — is YouTube Music logged in?');
    return [];
  }

  let items: HistoryItem[] = [];
  let lastCount = 0;
  let staleRounds = 0;

  while (items.length < limit && staleRounds < 3) {
    items = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('ytmusic-responsive-list-item-renderer')
      );

      return rows.map((row) => {
        // Title + video URL
        const titleEl = row.querySelector<HTMLAnchorElement>(
          '.title-column .title a, yt-formatted-string.title a, a.yt-simple-endpoint'
        );
        const title = titleEl?.textContent?.trim() ||
          row.querySelector('.title-column .title, yt-formatted-string.title')?.textContent?.trim() || '';

        // Extract videoId from href like /watch?v=XXXX
        const href = titleEl?.href || '';
        const videoId = new URL(href, 'https://music.youtube.com').searchParams.get('v') ||
          href.match(/[?&]v=([^&]+)/)?.[1] || '';

        // Artist & album from secondary columns
        const secondaryEls = Array.from(
          row.querySelectorAll('.secondary-flex-columns yt-formatted-string, .secondary-flex-columns a')
        );
        const artist = secondaryEls[0]?.textContent?.trim() || '';
        const album = secondaryEls[1]?.textContent?.trim() || '';

        // Duration
        const duration =
          row.querySelector('.fixed-columns .duration, [aria-label*=":"]')?.textContent?.trim() || '';

        return {
          id: videoId,
          title,
          artist,
          album,
          duration,
          url: videoId ? `https://music.youtube.com/watch?v=${videoId}` : '',
          scrapedAt: new Date().toISOString(),
        };
      }).filter((i) => i.title !== '');
    });

    if (items.length >= limit) break;

    if (items.length === lastCount) {
      staleRounds++;
    } else {
      staleRounds = 0;
      lastCount = items.length;
    }

    // Scroll down to load more
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
    await page.waitForTimeout(1500);
  }

  const result = items.slice(0, limit);
  saveHistoryToDB(result);
  await saveSession();
  return result;
}

/**
 * Save scraped history to SQLite (upsert by video ID).
 */
function saveHistoryToDB(items: HistoryItem[]) {
  const db = getDB();
  const upsert = db.prepare(`
    INSERT INTO history (id, title, artist, album, duration, url, scraped_at)
    VALUES (@id, @title, @artist, @album, @duration, @url, @scrapedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      duration = excluded.duration,
      url = excluded.url,
      scraped_at = excluded.scraped_at
  `);

  const insertMany = db.transaction((rows: HistoryItem[]) => {
    for (const row of rows) {
      if (row.id) upsert.run(row);
    }
  });

  insertMany(items);
  console.error(`[History] Saved ${items.length} items to DB`);
}

/**
 * Retrieve history from DB (most recent first).
 */
export function getHistoryFromDB(limit = 20): HistoryItem[] {
  const db = getDB();
  return db.prepare(`
    SELECT id, title, artist, album, duration, url, scraped_at as scrapedAt
    FROM history
    ORDER BY scraped_at DESC
    LIMIT ?
  `).all(limit) as HistoryItem[];
}
