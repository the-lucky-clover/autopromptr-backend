import puppeteer from "puppeteer";
import { automateForm } from "./automation.js";

export async function processBatch(batch, platform, options = {}) {
  console.log(`[BatchProcessor] Processing batch ${batch.id} for platform ${platform}`);

  const {
    waitForIdle = true,
    maxRetries = 3
  } = options;

  let browser;
  try {
    console.log("[BatchProcessor] Launching Puppeteer browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    if (batch.targetUrl) {
      console.log(`[BatchProcessor] Navigating to target URL: ${batch.targetUrl}`);
      await page.goto(batch.targetUrl, { waitUntil: "domcontentloaded" });

      if (waitForIdle) {
        console.log("[BatchProcessor] Waiting for network idle on target URL...");
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(e => {
          console.warn(`[BatchProcessor] Network idle timeout for ${batch.targetUrl}: ${e.message}`);
        });
      }
    }

    console.log(`[BatchProcessor] Calling automateForm for prompt: ${batch.prompt.substring(0, 50)}...`);
    const automationResult = await automateForm(page, batch.prompt, options);

    let screenshot = null;
    try {
      console.log("[BatchProcessor] Taking screenshot...");
      screenshot = await page.screenshot({
        encoding: "base64",
        fullPage: true
      });
      console.log("[BatchProcessor] Screenshot taken.");
    } catch (screenshotError) {
      console.error(`[BatchProcessor] Error taking screenshot: ${screenshotError.message}`);
    }

    console.log(`[BatchProcessor] Batch ${batch.id} processing completed.`);
    return {
      batchId: batch.id,
      status: automationResult.success ? "completed" : "failed",
      result: automationResult,
      screenshot,
      processedAt: new Date().toISOString(),
      platform
    };

  } catch (error) {
    console.error(`[BatchProcessor] ❌ Batch processing failed for batch ${batch.id}: ${error.message}`);
    return {
      batchId: batch.id,
      status: "failed",
      error: error.message,
      processedAt: new Date().toISOString(),
      platform
    };
  } finally {
    if (browser) {
      console.log("[BatchProcessor] Closing browser...");
      await browser.close();
    }
  }
}
