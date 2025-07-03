import logger from "./logger.js";
import type { Page, ElementHandle } from "playwright";

interface AutomationSettings {
  waitForIdle?: boolean;
  elementTimeout?: number;
  debugLevel?: "standard" | "verbose";
  customInputSelectors?: string[];
  customSubmitSelectors?: string[];
  maxRetries?: number;
  retryDelay?: number;
}

interface AutomationSuccess {
  success: true;
  action: "form_submitted";
  prompt: string;
  method: "button_click" | "enter_key";
  timestamp: string;
  details: string;
}

interface AutomationError {
  success: false;
  error: string;
  timestamp: string;
  details?: string;
}

type AutomationResult = AutomationSuccess | AutomationError;

export async function automateForm(
  page: Page,
  prompt: string,
  settings: AutomationSettings = {}
): Promise {
  const {
    waitForIdle = true,
    elementTimeout = 5000,
    debugLevel = "standard",
    customInputSelectors = [],
    customSubmitSelectors = [],
    maxRetries = 3,
    retryDelay = 1000,
  } = settings;

  const timestamp = new Date().toISOString();

  try {
    logger.info(`Starting form automation with prompt: "${prompt}"`);

    // Wait for page to be idle if requested
    if (waitForIdle) {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    }

    // Define common input selectors
    const inputSelectors = [
      'input[type="text"]',
      'input[type="search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="query"]',
      'input[placeholder*="prompt"]',
      'textarea',
      '[contenteditable="true"]',
      ...customInputSelectors,
    ];

    // Find the first available input field
    let inputElement: ElementHandle | null = null;
    for (const selector of inputSelectors) {
      try {
        inputElement = await page.waitForSelector(selector, {
          timeout: elementTimeout,
          state: "visible",
        });
        if (inputElement) {
          logger.info(`Found input element with selector: ${selector}`);
          break;
        }
      } catch (error) {
        if (debugLevel === "verbose") {
          logger.debug(`Selector ${selector} not found or not visible`);
        }
      }
    }

    if (!inputElement) {
      throw new Error("No suitable input field found on the page");
    }

    // Clear and fill the input field
    await inputElement.click();
    await inputElement.fill("");
    await inputElement.fill(prompt);
    logger.info(`Filled input field with prompt: "${prompt}"`);

    // Define common submit selectors
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Send")',
      'button:has-text("Search")',
      'button:has-text("Go")',
      'button:has-text("Generate")',
      '[role="button"]:has-text("Submit")',
      '[role="button"]:has-text("Send")',
      ...customSubmitSelectors,
    ];

    // Try to find and click submit button
    let submitElement: ElementHandle | null = null;
    for (const selector of submitSelectors) {
      try {
        submitElement = await page.waitForSelector(selector, {
          timeout: elementTimeout,
          state: "visible",
        });
        if (submitElement) {
          logger.info(`Found submit element with selector: ${selector}`);
          break;
        }
      } catch (error) {
        if (debugLevel === "verbose") {
          logger.debug(`Submit selector ${selector} not found or not visible`);
        }
      }
    }

    let method: "button_click" | "enter_key";
    if (submitElement) {
      await submitElement.click();
      method = "button_click";
      logger.info("Clicked submit button");
    } else {
      // Fallback to pressing Enter
      await inputElement.press("Enter");
      method = "enter_key";
      logger.info("Pressed Enter key as fallback");
    }

    // Wait for potential navigation or response
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch (error) {
      logger.debug("Page did not reach networkidle state within timeout");
    }

    const result: AutomationSuccess = {
      success: true,
      action: "form_submitted",
      prompt,
      method,
      timestamp,
      details: `Successfully automated form submission using ${method}`,
    };

    logger.info("Form automation completed successfully");
    return result;
  } catch (error: any) {
    const errorResult: AutomationError = {
      success: false,
      error: error.message,
      timestamp,
      details: `Failed to automate form: ${error.message}`,
    };

    logger.error(`Form automation failed: ${error.message}`);
    return errorResult;
  }
}
