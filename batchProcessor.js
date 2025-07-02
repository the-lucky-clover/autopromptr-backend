// batchProcessor.js
import puppeteer from "puppeteer";
import { automateForm } from "./automation.js";
import logger from "./logger.js";

export async function processBatch(batch, platform, options = {}) {
  // Extract possible metadata from options for enhanced logging
  const { batchId = batch.id, ip } = options;

  logger.info(`[BatchProcessor] Processing batch ${batchId} for platform ${platform}`, {
    batchId,
    platform,
    ip
  });

  const {
    waitForIdle = true,
    maxRetries = 3
  } = options;

  let browser;
  try {
    logger.info("[BatchProcessor] Launching Puppeteer browser...", {
      batchId,
      platform,
      ip
    });
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    if (batch.targetUrl) {
      logger.info(`[BatchProcessor] Navigating to target URL: ${batch.targetUrl}`, {
        batchId,
        platform,
        ip
      });
      await page.goto(batch.targetUrl, { waitUntil: "domcontentloaded" });

      if (waitForIdle) {
        logger.info("[BatchProcessor] Waiting for network idle on target URL...", {
          batchId,
          platform,
          ip
        });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(e => {
          logger.warn(`[BatchProcessor] Network idle timeout for ${batch.targetUrl}: ${e.message}`, {
            batchId,
            platform,
            ip
          });
        });
      }
    }

    logger.info(`[BatchProcessor] Calling automateForm for prompt: ${batch.prompt?.substring(0, 50)}...`, {
      batchId,
      platform,
      ip
    });
    const automationResult = await automateForm(page, batch.prompt, options);

    let screenshot = null;
    try {
      logger.info("[BatchProcessor] Taking screenshot...", {
        batchId,
        platform,
        ip
      });
      screenshot = await page.screenshot({
        encoding: "base64",
        fullPage: true
      });
      logger.info("[BatchProcessor] Screenshot taken.", {
        batchId,
        platform,
        ip
      });
    } catch (screenshotError) {
      logger.error(`[BatchProcessor] Error taking screenshot: ${screenshotError.message}`, {
        batchId,
        platform,
        ip
      });
    }

    logger.info(`[BatchProcessor] Batch ${batchId} processing completed.`, {
      batchId,
      platform,
      ip
    });
    return {
      batchId,
      status: automationResult.success ? "completed" : "failed",
      result: automationResult,
      screenshot,
      processedAt: new Date().toISOString(),
      platform
    };

  } catch (error) {
    logger.error(`[BatchProcessor] ❌ Batch processing failed for batch ${batchId}: ${error.message}`, {
      batchId,
      platform,
      ip
    });
    return {
      batchId,
      status: "failed",
      error: error.message,
      processedAt: new Date().toISOString(),
      platform
    };
  } finally {
    if (browser) {
      logger.info("[BatchProcessor] Closing browser...", {
        batchId,
        platform,
        ip
      });
      await browser.close();
    }
  }
}
