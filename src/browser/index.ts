import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SESSION_PATH = path.resolve('./session.json');

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

export async function launchBrowser(headless = false): Promise<Page> {
  console.error('[Browser] Launching Chrome...');

  browser = await chromium.launch({
    headless,
    channel: 'chrome', // use system Chrome if available
    args: ['--no-sandbox'],
  });

  const storageState = fs.existsSync(SESSION_PATH) ? SESSION_PATH : undefined;

  context = await browser.newContext({
    storageState,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  page = await context.newPage();
  return page;
}

export async function ensurePage(): Promise<Page> {
  if (!page) return launchBrowser(false);
  return page;
}

export async function saveSession(): Promise<void> {
  if (!context) return;
  await context.storageState({ path: SESSION_PATH });
  console.error('[Browser] Session saved.');
}

export async function closeBrowser(): Promise<void> {
  await saveSession();
  await browser?.close();
  browser = null; context = null; page = null;
}

export async function navigateTo(url: string): Promise<void> {
  const p = await ensurePage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

export { page };
