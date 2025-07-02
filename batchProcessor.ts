import { chromium, Browser, Page } from "playwright";
import { automateForm } from "./automation.js";
import logger from "./logger.js";

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
          logger.warn(`[BatchProcessor] ❌ automateForm failed on attempt ${attempt +
