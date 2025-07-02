// browserService.ts
import { chromium } from 'playwright';

export async function launchBrowser(url: string): Promise<{ title: string; screenshot: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'png', encoding: 'base64', fullPage: true });

    return {
      title,
      screenshot: `data:image/png;base64,${screenshot}`
    };
  } finally {
    await browser.close();
  }
}
