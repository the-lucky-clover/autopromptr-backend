import logger from "./logger.js";

const automateForm = async (page, prompt, settings = {}) => {
  const {
    waitForIdle = true,
    elementTimeout = 5000,
    debugLevel = "standard",
    customInputSelectors = [],
    customSubmitSelectors = []
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
      '[contenteditable="true"]'
    ];
    const inputSelectors = [...customInputSelectors, ...defaultInputSelectors];

    let targetElement = null;
    let foundSelector = "";

    console.log("[Automation] Searching for target input element...");
    logger.info("[Automation] Searching for target input element...");
    for (const selector of inputSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          if (await element.isVisible() && await element.isEnabled()) {
            targetElement = element;
            foundSelector = selector;
            console.log(`[Automation] 🎯 Found target element with selector: ${selector}`);
            logger.info(`[Automation] 🎯 Found target element with selector: ${selector}`);
            break;
          }
        }
        if (targetElement) break;
      } catch (e) {
        if (debugLevel === "verbose") {
          logger.warn(`[Automation] Selector ${selector} failed: ${e.message}`);
        }
      }
    }

    if (!targetElement) {
      console.log("[Automation] No direct input element found, searching for focusable elements...");
      logger.info("[Automation] No direct input element found, searching for focusable elements...");
      const fallbackSelectors = [
        "button",
        "input",
        "textarea",
        "select",
        '[tabindex]:not([tabindex="-1"])'
      ];
      for (const selector of fallbackSelectors) {
        try {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            targetElement = element;
            foundSelector = selector;
            console.log(`[Automation] 🎯 Found fallback element: ${selector}`);
            logger.info(`[Automation] 🎯 Found fallback element: ${selector}`);
            break;
          }
        } catch (e) {
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

    try {
      await targetElement.click({ timeout: elementTimeout });
      await targetElement.focus();
    } catch (e) {
      logger.warn(`[Automation] Element interaction failed, retrying forcibly: ${e.message}`);
      await page.evaluate(el => el.focus(), targetElement);
    }

    try {
      await targetElement.fill("");
      logger.info("[Automation] Cleared field with .fill()");
    } catch (e) {
      logger.warn(`[Automation] Could not clear field: ${e.message}`);
    }

    await targetElement.type(prompt, { delay: 50 });
    logger.info(`[Automation] ✅ Prompt entered into ${foundSelector}`);

    const defaultSubmitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      'button:has-text("Search")',
      '[data-testid*="send"]',
      '[aria-label*="send"]'
    ];
    const submitSelectors = [...customSubmitSelectors, ...defaultSubmitSelectors];

    let submitButton = null;
    let foundSubmitSelector = "";

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible() && await button.isEnabled()) {
          submitButton = button;
          foundSubmitSelector = selector;
          logger.info(`[Automation] 🔘 Found submit button: ${selector}`);
          break;
        }
      } catch (e) {
        if (debugLevel === "verbose") {
          logger.warn(`[Automation] Submit selector ${selector} failed: ${e.message}`);
        }
      }
    }

    if (submitButton) {
      try {
        await submitButton.click();
        logger.info(`[Automation] 📤 Form submitted via button: ${foundSubmitSelector}`);
      } catch (e) {
        const msg = `SUBMIT_BUTTON_CLICK_FAILED: Could not click submit button (${foundSubmitSelector}): ${e.message}`;
        logger.error(`[Automation] ❌ ${msg}`);
        throw new Error(msg);
      }
    } else {
      try {
        await page.keyboard.press("Enter");
        logger.info("[Automation] 📤 Form submitted via Enter key.");
      } catch (e) {
        const msg = `ENTER_KEY_SUBMIT_FAILED: Could not submit form via Enter key: ${e.message}`;
        logger.error(`[Automation] ❌ ${msg}`);
        throw new Error(msg);
      }
    }

    await page.waitForTimeout(1000);
    return {
      success: true,
      action: "form_submitted",
      prompt,
      method: submitButton ? "button_click" : "enter_key",
      timestamp: new Date().toISOString(),
      details: `Prompt submitted using ${submitButton ? "submit button" : "Enter key"}.`
    };

  } catch (error) {
    const code = error.message.split(":")[0] || "UNKNOWN_ERROR";
    logger.error(`[Automation] ❌ Automation failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      prompt,
      timestamp: new Date().toISOString(),
      code
    };
  }
};

export { automateForm };
