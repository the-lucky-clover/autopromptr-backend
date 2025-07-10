// batchProcessor.ts
import { chromium, Browser, Page } from "playwright";
import { automateForm } from "./automation";
import logger from "./logger";

export interface Batch {
  id?: string;
  targetUrl?: string;
  prompt: string;
  [key: string]: any; // for additional batch fields
}

export interface ProcessOptions {
  batchId?: string;
  ip?: string;
  waitForIdle?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export async function processBatch(
  batch: Batch,
  options: ProcessOptions
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let retries = 0;

  while (retries <= (options.maxRetries || 0)) {
    try {
      logger.info(`Processing batch ${batch.id} for URL: ${batch.targetUrl}`);

      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      await page.goto(batch.targetUrl || "");

      // Example: Automate a form on the page
      await automateForm(page, batch.prompt);

      // Take a screenshot and return it as a base64 string
      const screenshotBuffer = await page.screenshot({ type: "jpeg" }); // Specify type as jpeg or png
      const screenshotBase64 = screenshotBuffer.toString("base64");

      logger.info(`Batch ${batch.id} processed successfully.`);
      return { success: true, screenshot: screenshotBase64 };
    } catch (error: any) {
      logger.error(`Error processing batch ${batch.id}: ${error.message}`);
      retries++;
      if (retries <= (options.maxRetries || 0)) {
        logger.warn(
          `Retrying batch ${batch.id} in ${options.retryDelay || 1000}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, options.retryDelay || 1000)
        );
      } else {
        return { success: false, error: error.message };
      }
    } finally {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return { success: false, error: "Maximum retries exceeded" };
}
