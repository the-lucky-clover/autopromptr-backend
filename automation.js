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
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();

          if (isVisible && isEnabled) {
            targetElement = element;
            foundSelector = selector;
            console.log(`[Automation] 🎯 Found target element with selector: ${selector}`);
            logger.info(`[Automation] 🎯 Found target element with selector: ${selector}`);
            break;
          }
        }

        if (targetElement) break;
      } catch (selectorError) {
        if (debugLevel === "verbose") {
          console.log(`[Automation] Selector ${selector} failed: ${selectorError.message}`);
          logger.warn(`[Automation] Selector ${selector} failed: ${selectorError.message}`);
        }
      }
    }

    if (!targetElement) {
      console.log("[Automation] No direct input element found, searching for focusable elements...");
      logger.info("[Automation] No direct input element found, searching for focusable elements...");
      const focusableSelectors = [
        "button",
        "input",
        "textarea",
        "select",
        '[tabindex]:not([tabindex="-1"])'
      ];

      for (const selector of focusableSelectors) {
        try {
          targetElement = await page.$(selector);
          if (targetElement) {
            const isVisible = await targetElement.isVisible();
            if (isVisible) {
              foundSelector = selector;
              console.log(`[Automation] 🎯 Found focusable element with selector: ${selector}`);
              logger.info(`[Automation] 🎯 Found focusable element with selector: ${selector}`);
              break;
            }
          }
        } catch (err) {
          if (debugLevel === "verbose") {
            console.log(`[Automation] Focusable selector ${selector} failed: ${err.message}`);
            logger.warn(`[Automation] Focusable selector ${selector} failed: ${err.message}`);
          }
        }
      }
    }

    if (!targetElement) {
      const errorMsg = "NO_INPUT_ELEMENT_FOUND: No suitable input or focusable element found on the page";
      console.error(`[Automation] ❌ ${errorMsg}`);
      logger.error(`[Automation] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[Automation] Attempting to interact with element: ${foundSelector}`);
    logger.info(`[Automation] Attempting to interact with element: ${foundSelector}`);

    try {
      await targetElement.click();
      await targetElement.focus();
    } catch (clickFocusError) {
      const errorMsg = `ELEMENT_NOT_INTERACTABLE: Could not click or focus on target element (${foundSelector}): ${clickFocusError.message}`;
      console.error(`[Automation] ❌ ${errorMsg}`);
      logger.error(`[Automation] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    try {
      await targetElement.selectText();
      await page.keyboard.press("Delete");
      console.log("[Automation] Field cleared using selectText and Delete.");
      logger.info("[Automation] Field cleared using selectText and Delete.");
    } catch (clearError) {
      try {
        await targetElement.fill("");
        console.log("[Automation] Field cleared using fill method.");
        logger.info("[Automation] Field cleared using fill method.");
      } catch (fillError) {
        console.warn("[Automation] ⚠️ Could not clear field, proceeding with typing...");
        logger.warn("[Automation] ⚠️ Could not clear field, proceeding with typing...");
      }
    }

    await targetElement.type(prompt, { delay: 50 });

    console.log(`[Automation] ✅ Successfully entered prompt: "${prompt}" into ${foundSelector}`);
    logger.info(`[Automation] ✅ Successfully entered prompt: "${prompt}" into ${foundSelector}`);

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

    console.log("[Automation] Searching for submit button...");
    logger.info("[Automation] Searching for submit button...");
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          const isVisible = await submitButton.isVisible();
          const isEnabled = await submitButton.isEnabled();

          if (isVisible && isEnabled) {
            foundSubmitSelector = selector;
            console.log(`[Automation] 🔘 Found submit button with selector: ${selector}`);
            logger.info(`[Automation] 🔘 Found submit button with selector: ${selector}`);
            break;
          }
        }
      } catch (err) {
        if (debugLevel === "verbose") {
          console.log(`[Automation] Submit selector ${selector} failed: ${err.message}`);
          logger.warn(`[Automation] Submit selector ${selector} failed: ${err.message}`);
        }
      }
    }

    if (submitButton) {
      try {
        await submitButton.click();
        console.log(`[Automation] 📤 Form submitted via button click: ${foundSubmitSelector}`);
        logger.info(`[Automation] 📤 Form submitted via button click: ${foundSubmitSelector}`);
      } catch (submitClickError) {
        const errorMsg = `SUBMIT_BUTTON_CLICK_FAILED: Could not click submit button (${foundSubmitSelector}): ${submitClickError.message}`;
        console.error(`[Automation] ❌ ${errorMsg}`);
        logger.error(`[Automation] ❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } else {
      console.log("[Automation] No submit button found, attempting to submit via Enter key.");
      logger.info("[Automation] No submit button found, attempting to submit via Enter key.");
      try {
        await page.keyboard.press("Enter");
        console.log("[Automation] 📤 Form submitted via Enter key.");
        logger.info("[Automation] 📤 Form submitted via Enter key.");
      } catch (enterPressError) {
        const errorMsg = `ENTER_KEY_SUBMIT_FAILED: Could not submit form via Enter key: ${enterPressError.message}`;
        console.error(`[Automation] ❌ ${errorMsg}`);
        logger.error(`[Automation] ❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
    }

    console.log("[Automation] Waiting for 1 second after submission...");
    logger.info("[Automation] Waiting for 1 second after submission...");
    await page.waitForTimeout(1000);

    return {
      success: true,
      action: "form_submitted",
      prompt,
      method: submitButton ? "button_click" : "enter_key",
      timestamp: new Date().toISOString(),
      details: `Prompt successfully entered and form submitted using ${submitButton ? "button click" : "Enter key"}.`
    };
  } catch (error) {
    console.error(`[Automation] ❌ Automation failed for prompt "${prompt}":`, error.message);
    logger.error(`[Automation] ❌ Automation failed for prompt "${prompt}": ${error.message}`);

    return {
      success: false,
      error: error.message,
      prompt,
      timestamp: new Date().toISOString(),
      code: error.message.split(":")[0] || "UNKNOWN_ERROR"
    };
  }
};

export { automateForm };
