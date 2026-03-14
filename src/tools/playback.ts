import { ensurePage } from '../browser/index';

export async function playSong(query: string): Promise<string> {
  const page = await ensurePage();
  // Use YT Music search
  await page.goto(`https://music.youtube.com/search?q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForSelector('ytmusic-responsive-list-item-renderer', { timeout: 10000 });

  // Click first result
  const first = page.locator('ytmusic-responsive-list-item-renderer').first();
  const title = await first.locator('.title').first().textContent();
  await first.click();

  return title?.trim() || 'Unknown';
}

export async function play(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    (document.querySelector('.play-pause-button') as HTMLElement)?.click();
  });
}

export async function pause(): Promise<void> {
  await play(); // toggle
}

export async function next(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    (document.querySelector('.next-button') as HTMLElement)?.click();
  });
}

export async function previous(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    (document.querySelector('.previous-button') as HTMLElement)?.click();
  });
}

export async function setVolume(level: number): Promise<void> {
  const page = await ensurePage();
  await page.evaluate((vol) => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) video.volume = Math.max(0, Math.min(1, vol / 100));
  }, level);
}

export async function getCurrentSong(): Promise<{ title: string; artist: string } | null> {
  const page = await ensurePage();
  return page.evaluate(() => {
    const title = document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim();
    const artist = document.querySelector('.byline.ytmusic-player-bar')?.textContent?.trim();
    return title ? { title: title || '', artist: artist || '' } : null;
  });
}
