// batchProcessor.ts
import { chromium, Browser, Page } from "playwright";
import { automateForm } from "./automation.ts";
import logger from "./logger.ts";

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

export interface AutomationResult {
  success: boolean;
  error?: string;
  [key: string]: any; // other fields automation may return
}

export interface ProcessResult {
  batchId?: string;
  status: "completed" | "failed";
  result?: AutomationResult | null;
  screenshot?: string | null;
  processedAt: string;
  platform: string;
  error?: string;
}

export async function processBatch(
  batch: Batch,
  platform: string,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const { batchId = batch.id, ip } = options;

  logger.info(`[BatchProcessor] Processing batch ${batchId} for platform ${platform}`, {
    batchId,
    platform,
    ip,
  });

  const {
    waitForIdle = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  let browser: Browser | undefined;
  try {
    logger.info("[BatchProcessor] Launching Playwright Chromium browser...", {
      batchId,
      platform,
      ip,
    });

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page: Page = await context.newPage();

    if (batch.targetUrl) {
      logger.info(`[BatchProcessor] Navigating to target URL: ${batch.targetUrl}`, {
        batchId,
        platform,
        ip,
      });

      await page.goto(batch.targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

      if (waitForIdle) {
        logger.info("[BatchProcessor] Waiting for network idle on target URL...", {
          batchId,
          platform,
          ip,
        });

        try {
          await page.waitForLoadState("networkidle", { timeout: 15000 });
        } catch (e) {
          logger.warn(`[BatchProcessor] Network idle timeout for ${batch.targetUrl}: ${(e as Error).message}`, {
            batchId,
            platform,
            ip,
          });
        }
      }
    }

    let automationResult: AutomationResult | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        logger.info(`[BatchProcessor] Attempt ${attempt + 1} to run automateForm...`, {
          batchId,
          platform,
          ip,
        });

        automationResult = await automateForm(page, batch.prompt, options);

        if (automationResult.success) {
          logger.info(`[BatchProcessor] ✅ automateForm succeeded on attempt ${attempt + 1}.`, {
            batchId,
            platform,
            ip,
          });
          break;
        } else {
          logger.warn(`[BatchProcessor] ❌ automateForm failed on attempt ${attempt + 1}: ${automationResult.error}`, {
            batchId,
            platform,
            ip,
          });
        }
      } catch (error) {
        logger.error(`[BatchProcessor] ❌ Exception during automateForm on attempt ${attempt + 1}: ${(error as Error).message}`, {
          batchId,
          platform,
          ip,
        });
      }

      attempt++;
      if (attempt < maxRetries) {
        logger.info(`[BatchProcessor] Retrying in ${retryDelay}ms...`, {
          batchId,
          platform,
          ip,
        });
        await page.waitForTimeout(retryDelay);
      }
    }

    let screenshot: string | null = null;
    try {
      logger.info("[BatchProcessor] Taking screenshot...", {
        batchId,
        platform,
        ip,
      });
      screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
        encoding: "base64",
      });
      logger.info("[BatchProcessor] Screenshot taken.", {
        batchId,
        platform,
        ip,
      });
    } catch (screenshotError) {
      logger.error(`[BatchProcessor] Error taking screenshot: ${(screenshotError as Error).message}`, {
        batchId,
        platform,
        ip,
      });
    }

    logger.info(`[BatchProcessor] Batch ${batchId} processing completed.`, {
      batchId,
      platform,
      ip,
    });

    return {
      batchId,
      status: automationResult?.success ? "completed" : "failed",
      result: automationResult,
      screenshot,
      processedAt: new Date().toISOString(),
      platform,
    };
  } catch (error) {
    logger.error(`[BatchProcessor] ❌ Batch processing failed for batch ${batchId}: ${(error as Error).message}`, {
      batchId,
      platform,
      ip,
    });

    return {
      batchId,
      status: "failed",
      error: (error as Error).message,
      processedAt: new Date().toISOString(),
      platform,
    };
  } finally {
    if (browser) {
      logger.info("[BatchProcessor] Closing browser...", {
        batchId,
        platform,
        ip,
      });
      await browser.close();
    }
  }
}
