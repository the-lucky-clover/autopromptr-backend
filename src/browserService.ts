import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

interface LaunchOptions {
  url: string;
  headless?: boolean;
}

export async function launchBrowser({ url, headless = false }: LaunchOptions): Promise {
  const browser = await chromium.launch({ headless: !headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const title = await page.title();

    const screenshotBuffer = await page.screenshot({ fullPage: true });

    // Save screenshot to a file
    const screenshotPath = path.join(process.cwd(), 'screenshots', `screenshot-${Date.now()}.png`);
    
    // Ensure screenshots directory exists
    const screenshotsDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    fs.writeFileSync(screenshotPath, screenshotBuffer);

    return {
      title,
      screenshotPath,
      url
    };
  } finally {
    await browser.close();
  }
}
