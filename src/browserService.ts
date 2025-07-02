import { chromium } from 'playwright';

export async function launchBrowser(url: string): Promise<string> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const title = await page.title();
  await browser.close();
  return `Page title: ${title}`;
}
