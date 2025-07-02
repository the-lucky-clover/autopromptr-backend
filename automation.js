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

interface AutomationFailure {
  success: false;
  error: string;
  prompt: string;
  timestamp: string;
  code: string;
}

type AutomationResult = AutomationSuccess | AutomationFailure;

// Helper to retry async fn with delay and max attempts
async function retryAction<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      logger.warn(
        `[Automation] Retry attempt ${attempt} failed: ${err.message}. Retrying in ${retryDelay}ms...`
      );
      await new Promise((res) => setTimeout(res, retryDelay));
    }
  }
  // Should never reach here
  throw new Error("retryAction: Max retries exceeded");
}

const automateForm = async (
  page: Page,
  prompt: string,
  settings: AutomationSettings = {}
): Promise<AutomationResult> => {
  const {
    waitForIdle = true,
    elementTimeout = 5000,
    debugLevel = "standard",
    customInputSelectors = [],
    customSubmitSelectors = [],
    maxRetries = 3,
    retryDelay = 500,
  } = settings;

  console.log(`[Automation] 🤖 Starting form automation for prompt: "${prompt}"`);
  logger.info(`[Automation] 🤖 Starting form automation for prompt: "${prompt}"`);

  try {
    if (waitForIdle) {
      console.log("[Automation] Waiting for network idle...");
      logger.info("[Automation] Waiting for network idle...");
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
        console.warn("[Automation] ⚠️ Network idle timeout, continuing...");
        logger.warn("[Automation] ⚠️ Network idle timeout, continuing...");
      });
    }

    const defaultInputSelectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="search"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      'textarea',
      '[contenteditable="true"]',
    ];
    const inputSelectors = [...customInputSelectors, ...defaultInputSelectors];

    let targetElement: ElementHandle<HTMLElement> | null = null;
    let foundSelector = "";

    console.log("[Automation] Searching for target input element...");
    logger.info("[Automation] Searching for target input element...");
    for (const selector of inputSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          if ((await element.isVisible()) && (await element.isEnabled())) {
            targetElement = element as ElementHandle<HTMLElement>;
            foundSelector = selector;
            console.log(`[Automation] 🎯 Found target element with selector: ${selector}`);
            logger.info(`[Automation] 🎯 Found target element with selector: ${selector}`);
            break;
          }
        }
        if (targetElement) break;
      } catch (e: any) {
        if (debugLevel === "verbose") {
          logger.warn(`[Automation] Selector ${selector} failed: ${e.message}`);
        }
      }
    }

    if (!targetElement) {
      console.log("[Automation] No direct input element found, searching for focusable elements...");
      logger.info("[Automation] No direct input element found, searching for focusable elements...");
      const fallbackSelectors = ["button", "input", "textarea", "select", '[tabindex]:not([tabindex="-1"])'];
      for (const selector of fallbackSelectors) {
        try {
          const element = await page.$(selector);
          if (element && (await element.isVisible())) {
            targetElement = element as ElementHandle<HTMLElement>;
            foundSelector = selector;
            console.log(`[Automation] 🎯 Found fallback element: ${selector}`);
            logger.info(`[Automation] 🎯 Found fallback element: ${selector}`);
            break;
          }
        } catch (e: any) {
          if (debugLevel === "verbose") {
            logger.warn(`[Automation] Fallback selector ${selector} failed: ${e.message}`);
          }
        }
      }
    }

    if (!targetElement) {
      const msg = "NO_INPUT_ELEMENT_FOUND: No suitable input or fallback element found";
      logger.error(`[Automation] ❌ ${msg}`);
      throw new Error(msg);
    }

    logger.info(`[Automation] Interacting with input: ${foundSelector}`);

    // Retry clicking and focusing
    await retryAction(async () => {
      try {
        await targetElement!.click({ timeout: elementTimeout });
      } catch {
        // fallback forced focus via evaluate if click fails
        await page.evaluate((el) => el.focus(), targetElement);
      }
      await targetElement!.focus();
    }, maxRetries, retryDelay);

    // Retry clearing input field
    await retryAction(async () => {
      try {
        await targetElement!.fill("");
        logger.info("[Automation] Cleared field with .fill()");
      } catch {
        throw new Error("Clearing field failed");
      }
    }, maxRetries, retryDelay).catch(() => {
      logger.warn("[Automation] Could not clear field after retries, proceeding with typing...");
    });

    // Retry typing prompt
    await retryAction(() => targetElement!.type(prompt, { delay: 50 }), maxRetries, retryDelay);

    logger.info(`[Automation] ✅ Prompt entered into ${foundSelector}`);

    const defaultSubmitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      'button:has-text("Search")',
      '[data-testid*="send"]',
      '[aria-label*="send"]',
    ];
    const submitSelectors = [...customSubmitSelectors, ...defaultSubmitSelectors];

    let submitButton: ElementHandle<HTMLElement> | null = null;
    let foundSubmitSelector = "";

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button && (await button.isVisible()) && (await button.isEnabled())) {
          submitButton = button as ElementHandle<HTMLElement>;
          foundSubmitSelector = selector;
          logger.info(`[Automation] 🔘 Found submit button: ${selector}`);
          break;
        }
      } catch (e: any) {
        if (debugLevel === "verbose") {
          logger.warn(`[Automation] Submit selector ${selector} failed: ${e.message}`);
        }
      }
    }

    if (submitButton) {
      await retryAction(() => submitButton!.click(), maxRetries, retryDelay);
      logger.info(`[Automation] 📤 Form submitted via button: ${foundSubmitSelector}`);
    } else {
      await retryAction(() => page.keyboard.press("Enter"), maxRetries, retryDelay);
      logger.info("[Automation] 📤 Form submitted via Enter key.");
    }

    await page.waitForTimeout(1000);

    return {
      success: true,
      action: "form_submitted",
      prompt,
      method: submitButton ? "button_click" : "enter_key",
      timestamp: new Date().toISOString(),
      details: `Prompt submitted using ${submitButton ? "submit button" : "Enter key"}.`,
    };
  } catch (error: any) {
    const code = (error.message?.split(":")[0]) || "UNKNOWN_ERROR";
    logger.error(`[Automation] ❌ Automation failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      prompt,
      timestamp: new Date().toISOString(),
      code,
    };
  }
};

export { automateForm };
