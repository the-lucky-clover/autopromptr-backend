import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

interface LaunchOptions {
  url: string;
  headful?: boolean;
}

export async function launchBrowser({ url, headful = false }: LaunchOptions): Promise<{ title: string; screenshotPath: string }> {
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const title = await page.title();

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotDir = path.resolve('screenshots');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    fs.writeFileSync(filepath, screenshotBuffer);

    return {
      title,
      screenshotPath: filepath
    };
  } finally {
    await browser.close();
  }
}
