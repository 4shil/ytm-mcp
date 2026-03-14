import { ensurePage, navigateTo, saveSession } from '../browser/index';

export interface HistoryItem {
  title: string;
  artist: string;
  duration: string;
}

export async function scrapeHistory(limit = 20): Promise<HistoryItem[]> {
  await navigateTo('https://music.youtube.com/history');

  const page = await ensurePage();

  // Wait for items to appear
  await page.waitForSelector('ytmusic-responsive-list-item-renderer', {
    timeout: 15000,
  }).catch(() => console.error('[History] Timeout waiting for items'));

  const items: HistoryItem[] = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('ytmusic-responsive-list-item-renderer')
    );
    return rows.slice(0, 100).map((row) => {
      const title =
        row.querySelector('.title-column .title, yt-formatted-string.title')
          ?.textContent?.trim() || '';
      const artist =
        row.querySelector('.secondary-flex-columns yt-formatted-string')
          ?.textContent?.trim() || '';
      const duration =
        row.querySelector('.fixed-columns .duration')?.textContent?.trim() || '';
      return { title, artist, duration };
    }).filter((i) => i.title !== '');
  });

  await saveSession();
  return items.slice(0, limit);
}
