import { chromium, Browser, Page } from "playwright";
import logger from "./logger";

export interface BrowserOptions {
  url: string;
  headless?: boolean;
  timeout?: number;
}

export interface BrowserResult {
  success: boolean;
  screenshot?: string;
  error?: string;
  pageTitle?: string;
  url?: string;
}

export async function launchBrowser(options: BrowserOptions): Promise<BrowserResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    logger.info(`Launching browser for URL: ${options.url}`);
    
    // Launch browser
    browser = await chromium.launch({ 
      headless: options.headless !== false // Default to headless unless explicitly set to false
    });
    
    page = await browser.newPage();
    
    // Set timeout
    page.setDefaultTimeout(options.timeout || 30000);
    
    // Navigate to URL
    await page.goto(options.url, { waitUntil: 'networkidle' });
    
    // Get page information
    const pageTitle = await page.title();
    const currentUrl = page.url();
    
    // Take screenshot
    const screenshotBuffer = await page.screenshot({ 
      type: "jpeg",
      quality: 80,
      fullPage: false
    });
    const screenshotBase64 = screenshotBuffer.toString("base64");
    
    logger.info(`Successfully loaded page: ${pageTitle}`);
    
    return {
      success: true,
      screenshot: screenshotBase64,
      pageTitle,
      url: currentUrl
    };
    
  } catch (error: any) {
    logger.error(`Error in launchBrowser: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Clean up
    if (page) {
      await page.close().catch(err => logger.error(`Error closing page: ${err.message}`));
    }
    if (browser) {
      await browser.close().catch(err => logger.error(`Error closing browser: ${err.message}`));
    }
  }
}

