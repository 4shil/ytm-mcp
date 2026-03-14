import { chromium, BrowserContext, Page } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

// Reuse openclaw's existing browser profile — already logged into YouTube Music
const OPENCLAW_PROFILE = process.env.BROWSER_PROFILE ||
  '/home/ashil/.openclaw/browser/openclaw/user-data';

let context: BrowserContext | null = null;
let page: Page | null = null;

export async function launchBrowser(headless = true): Promise<Page> {
  console.error('[Browser] Launching Chromium with openclaw profile...');

  context = await chromium.launchPersistentContext(OPENCLAW_PROFILE, {
    headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  page = context.pages()[0] || await context.newPage();
  return page;
}

export async function ensurePage(): Promise<Page> {
  if (!page) return launchBrowser(true);
  return page;
}

export async function saveSession(): Promise<void> {
  // Persistent context auto-saves session to profile
  console.error('[Browser] Session persisted to profile.');
}

export async function closeBrowser(): Promise<void> {
  await context?.close();
  context = null;
  page = null;
}

export async function navigateTo(url: string): Promise<void> {
  const p = await ensurePage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

export { page };
