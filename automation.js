const automateForm = async (page, prompt, settings = {}) => {
  const {
    waitForIdle = true,
    elementTimeout = 5000,
    debugLevel = 'standard',
    customInputSelectors = [],
    customSubmitSelectors = []
  } = settings;

  console.log(`[Automation] 🤖 Starting form automation for prompt: "${prompt}"`);

  try {
    // Wait for page to be ready
    if (waitForIdle) {
      console.log('[Automation] Waiting for network idle...');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.warn('[Automation] ⚠️ Network idle timeout, continuing...');
      });
    }

    // Look for common form elements
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
    let foundSelector = '';
    
    console.log('[Automation] Searching for target input element...');
    // Try to find a suitable input element
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
            break;
          }
        }
        
        if (targetElement) break;
        
      } catch (selectorError) {
        if (debugLevel === 'verbose') {
          console.log(`[Automation] Selector ${selector} failed:`, selectorError.message);
        }
      }
    }

    if (!targetElement) {
      console.log('[Automation] No direct input element found, searching for focusable elements...');
      // Try to find any focusable element
      const focusableSelectors = [
        'button',
        'input',
        'textarea', 
        'select',
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
              break;
            }
          }
        } catch (err) {
          if (debugLevel === 'verbose') {
            console.log(`[Automation] Focusable selector ${selector} failed:`, err.message);
          }
        }
      }
    }

    if (!targetElement) {
      throw new Error('NO_INPUT_ELEMENT_FOUND: No suitable input or focusable element found on the page');
    }

    console.log(`[Automation] Attempting to interact with element: ${foundSelector}`);
    // Clear existing content and enter the prompt
    try {
      await targetElement.click();
      await targetElement.focus();
    } catch (clickFocusError) {
      throw new Error(`ELEMENT_NOT_INTERACTABLE: Could not click or focus on target element (${foundSelector}): ${clickFocusError.message}`);
    }
    
    // Clear field using different methods
    try {
      await targetElement.selectText();
      await page.keyboard.press('Delete');
      console.log('[Automation] Field cleared using selectText and Delete.');
    } catch (clearError) {
      try {
        await targetElement.fill('');
        console.log('[Automation] Field cleared using fill method.');
      } catch (fillError) {
        console.warn('[Automation] ⚠️ Could not clear field, proceeding with typing...');
      }
    }

    // Type the prompt
    await targetElement.type(prompt, { delay: 50 });
    
    console.log(`[Automation] ✅ Successfully entered prompt: "${prompt}" into ${foundSelector}`);

    // Look for submit button or Enter key
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
    let foundSubmitSelector = '';
    
    console.log('[Automation] Searching for submit button...');
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          const isVisible = await submitButton.isVisible();
          const isEnabled = await submitButton.isEnabled();
          
          if (isVisible && isEnabled) {
            foundSubmitSelector = selector;
            console.log(`[Automation] 🔘 Found submit button with selector: ${selector}`);
            break;
          }
        }
      } catch (err) {
        if (debugLevel === 'verbose') {
          console.log(`[Automation] Submit selector ${selector} failed:`, err.message);
        }
      }
    }

    // Submit the form
    if (submitButton) {
      try {
        await submitButton.click();
        console.log(`[Automation] 📤 Form submitted via button click: ${foundSubmitSelector}`);
      } catch (submitClickError) {
        throw new Error(`SUBMIT_BUTTON_CLICK_FAILED: Could not click submit button (${foundSubmitSelector}): ${submitClickError.message}`);
      }
    } else {
      console.log('[Automation] No submit button found, attempting to submit via Enter key.');
      try {
        await page.keyboard.press('Enter');
        console.log('[Automation] 📤 Form submitted via Enter key.');
      } catch (enterPressError) {
        throw new Error(`ENTER_KEY_SUBMIT_FAILED: Could not submit form via Enter key: ${enterPressError.message}`);
      }
    }

    // Wait a moment for any response
    console.log('[Automation] Waiting for 1 second after submission...');
    await page.waitForTimeout(1000);

    return {
      success: true,
      action: 'form_submitted',
      prompt: prompt,
      method: submitButton ? 'button_click' : 'enter_key',
      timestamp: new Date().toISOString(),
      details: `Prompt successfully entered and form submitted using ${submitButton ? 'button click' : 'Enter key'}.`
    };

  } catch (error) {
    console.error(`[Automation] ❌ Automation failed for prompt "${prompt}":`, error.message);
    
    return {
      success: false,
      error: error.message,
      prompt: prompt,
      timestamp: new Date().toISOString(),
      code: error.message.split(':')[0] || 'UNKNOWN_ERROR'
    };
  }
};

module.exports = { automateForm };


