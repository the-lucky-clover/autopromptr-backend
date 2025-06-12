const automateForm = async (page, prompt, settings = {}) => {
  const {
    waitForIdle = true,
    elementTimeout = 5000,
    debugLevel = 'standard'
  } = settings;

  console.log(`🤖 Starting form automation for prompt: "${prompt}"`);

  try {
    // Wait for page to be ready
    if (waitForIdle) {
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('⚠️ Network idle timeout, continuing...');
      });
    }

    // Look for common form elements
    const inputSelectors = [
      'input[type="text"]',
      'input[type="email"]', 
      'input[type="search"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      'textarea',
      '[contenteditable="true"]'
    ];

    let targetElement = null;
    
    // Try to find a suitable input element
    for (const selector of inputSelectors) {
      try {
        const elements = await page.$$(selector);
        
        for (const element of elements) {
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();
          
          if (isVisible && isEnabled) {
            targetElement = element;
            console.log(`🎯 Found target element: ${selector}`);
            break;
          }
        }
        
        if (targetElement) break;
        
      } catch (selectorError) {
        if (debugLevel === 'verbose') {
          console.log(`Selector ${selector} failed:`, selectorError.message);
        }
      }
    }

    if (!targetElement) {
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
              console.log(`🎯 Found focusable element: ${selector}`);
              break;
            }
          }
        } catch (err) {
          // Continue to next selector
        }
      }
    }

    if (!targetElement) {
      throw new Error('No suitable input element found on the page');
    }

    // Clear existing content and enter the prompt
    await targetElement.click();
    await targetElement.focus();
    
    // Clear field using different methods
    try {
      await targetElement.selectText();
      await page.keyboard.press('Delete');
    } catch (clearError) {
      try {
        await targetElement.fill('');
      } catch (fillError) {
        console.log('⚠️ Could not clear field, proceeding...');
      }
    }

    // Type the prompt
    await targetElement.type(prompt, { delay: 50 });
    
    console.log(`✅ Successfully entered prompt: "${prompt}"`);

    // Look for submit button or Enter key
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      'button:has-text("Search")',
      '[data-testid*="send"]',
      '[aria-label*="send"]'
    ];

    let submitButton = null;
    
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          const isVisible = await submitButton.isVisible();
          const isEnabled = await submitButton.isEnabled();
          
          if (isVisible && isEnabled) {
            console.log(`🔘 Found submit button: ${selector}`);
            break;
          }
        }
      } catch (err) {
        // Continue to next selector
      }
    }

    // Submit the form
    if (submitButton) {
      await submitButton.click();
      console.log('📤 Form submitted via button click');
    } else {
      // Try pressing Enter
      await page.keyboard.press('Enter');
      console.log('📤 Form submitted via Enter key');
    }

    // Wait a moment for any response
    await page.waitForTimeout(1000);

    return {
      success: true,
      action: 'form_submitted',
      prompt: prompt,
      method: submitButton ? 'button_click' : 'enter_key',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Automation failed for prompt "${prompt}":`, error.message);
    
    return {
      success: false,
      error: error.message,
      prompt: prompt,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = { automateForm };
