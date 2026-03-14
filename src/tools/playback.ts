import { ensurePage, launchBrowser, navigateTo } from '../browser/index';

export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  duration: string;
  currentTime: string;
  isPlaying: boolean;
  volume: number;
  liked: boolean;
}

/**
 * Search and play a song on YouTube Music.
 */
export async function playSong(query: string): Promise<string> {
  const page = await ensurePage();
  await page.goto(
    `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForSelector('ytmusic-responsive-list-item-renderer', { timeout: 10000 });

  const first = page.locator('ytmusic-responsive-list-item-renderer').first();
  const title = await first.locator('yt-formatted-string.title').first().textContent().catch(() => 'Unknown');

  // Double click to play (single click may select)
  await first.dblclick().catch(() => first.click());

  return title?.trim() || 'Unknown';
}

/**
 * Play a song directly by its YouTube Music URL.
 */
export async function playByUrl(url: string): Promise<void> {
  await navigateTo(url);
  const page = await ensurePage();
  // Wait for player to init
  await page.waitForSelector('ytmusic-player-bar', { timeout: 15000 }).catch(() => {});
}

/**
 * Toggle play/pause.
 */
export async function togglePlayPause(): Promise<boolean> {
  const page = await ensurePage();
  return page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar #play-pause-button, .play-pause-button'
    );
    btn?.click();
    const video = document.querySelector('video');
    return video ? !video.paused : false;
  });
}

export async function play(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video?.paused) {
      document.querySelector<HTMLElement>(
        'ytmusic-player-bar #play-pause-button, .play-pause-button'
      )?.click();
    }
  });
}

export async function pause(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video && !video.paused) {
      document.querySelector<HTMLElement>(
        'ytmusic-player-bar #play-pause-button, .play-pause-button'
      )?.click();
    }
  });
}

export async function next(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar .next-button, #next-button'
    )?.click();
  });
}

export async function previous(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar .previous-button, #previous-button'
    )?.click();
  });
}

export async function setVolume(level: number): Promise<void> {
  const page = await ensurePage();
  await page.evaluate((vol) => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) video.volume = Math.max(0, Math.min(1, vol / 100));
  }, level);
}

export async function seekTo(seconds: number): Promise<void> {
  const page = await ensurePage();
  await page.evaluate((s) => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) video.currentTime = s;
  }, seconds);
}

export async function likeSong(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar #like-button-renderer tp-yt-paper-icon-button, ytmusic-like-button-renderer #like'
    )?.click();
  });
}

export async function dislikeSong(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar #like-button-renderer tp-yt-paper-icon-button:last-child, ytmusic-like-button-renderer #dislike'
    )?.click();
  });
}

export async function shuffleToggle(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar .shuffle, #shuffle-button'
    )?.click();
  });
}

export async function repeatToggle(): Promise<void> {
  const page = await ensurePage();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      'ytmusic-player-bar .repeat, #repeat-button'
    )?.click();
  });
}

/**
 * Get full now-playing state from the player bar.
 */
export async function getCurrentSong(): Promise<NowPlaying | null> {
  const page = await ensurePage();

  return page.evaluate(() => {
    const bar = document.querySelector('ytmusic-player-bar');
    if (!bar) return null;

    const title =
      bar.querySelector<HTMLElement>('.title.ytmusic-player-bar, .content-info-wrapper .title')
        ?.textContent?.trim() || '';

    const artist =
      bar.querySelector<HTMLElement>('.byline.ytmusic-player-bar, .subtitle')
        ?.textContent?.trim() || '';

    const album =
      bar.querySelector<HTMLElement>('.byline a:last-child')
        ?.textContent?.trim() || '';

    const video = document.querySelector<HTMLVideoElement>('video');
    const isPlaying = video ? !video.paused : false;
    const volume = video ? Math.round(video.volume * 100) : 100;

    const toTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const currentTime = video ? toTime(video.currentTime) : '0:00';
    const duration = video ? toTime(video.duration || 0) : '0:00';

    // Check like state
    const likeBtn = bar.querySelector('ytmusic-like-button-renderer, #like-button-renderer');
    const liked = likeBtn?.getAttribute('like-status') === 'LIKE';

    return { title, artist, album, duration, currentTime, isPlaying, volume, liked };
  });
}
