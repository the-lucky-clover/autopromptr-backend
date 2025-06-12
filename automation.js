const puppeteer = require('puppeteer');

class AutomationService {
  constructor() {
    this.browser = null;
    this.defaultOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };
  }

  async initializeBrowser(options = {}) {
    try {
      if (this.browser && this.browser.isConnected()) {
        return this.browser;
      }

      this.browser = await puppeteer.launch({
        ...this.defaultOptions,
        ...options
      });

      console.log('Browser initialized successfully');
      return this.browser;
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw new Error(`Browser initialization failed: ${error.message}`);
    }
  }

  async createPage() {
    if (!this.browser || !this.browser.isConnected()) {
      await this.initializeBrowser();
    }

    const page = await this.browser.newPage();
    
    // Set default viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    return page;
  }

  async detectElements(page, options = {}) {
    try {
      const {
        timeout = 5000,
        selectors = ['input', 'button', 'select', 'textarea', 'a']
      } = options;

      const elements = {};
      
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 1000 });
          const elementCount = await page.$$eval(selector, els => els.length);
          elements[selector] = elementCount;
        } catch (error) {
          elements[selector] = 0;
        }
      }

      return {
        success: true,
        elements,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async waitForPageReady(page, options = {}) {
    try {
      const { timeout = 10000 } = options;

      // Wait for DOM content to be loaded
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout }
      );

      // Wait for network to be idle
      await page.waitForLoadState?.('networkidle') || 
            page.waitForFunction(() => 
              performance.now() - performance.timing.loadEventEnd > 500
            );

      // Check for common loading indicators
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[data-loading="true"]',
        '.loader'
      ];

      for (const selector of loadingSelectors) {
        try {
          await page.waitForSelector(selector, { state: 'hidden', timeout: 1000 });
        } catch (error) {
          // Loading indicator not found or already hidden, continue
        }
      }

      return {
        success: true,
        message: 'Page ready',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async submitForm(page, options = {}) {
    try {
      const {
        formSelector = 'form',
        submitSelector = '[type="submit"], button[type="submit"], .submit-btn',
        waitForNavigation = true,
        timeout = 10000
      } = options;

      // Try to find and submit the form
      const form = await page.$(formSelector);
      if (!form) {
        throw new Error(`Form not found with selector: ${formSelector}`);
      }

      // Try different submission methods
      let submitted = false;

      // Method 1: Click submit button
      try {
        const submitButton = await page.$(submitSelector);
        if (submitButton) {
          if (waitForNavigation) {
            await Promise.all([
              page.waitForNavigation({ timeout }),
              submitButton.click()
            ]);
          } else {
            await submitButton.click();
          }
          submitted = true;
        }
      } catch (error) {
        console.log('Submit button method failed, trying alternatives...');
      }

      // Method 2: Submit form directly
      if (!submitted) {
        try {
          if (waitForNavigation) {
            await Promise.all([
              page.waitForNavigation({ timeout }),
              form.evaluate(form => form.submit())
            ]);
          } else {
            await form.evaluate(form => form.submit());
          }
          submitted = true;
        } catch (error) {
          console.log('Direct form submit failed, trying keyboard...');
        }
      }

      // Method 3: Press Enter key
      if (!submitted) {
        await page.keyboard.press('Enter');
        if (waitForNavigation) {
          try {
            await page.waitForNavigation({ timeout });
          } catch (error) {
            // Navigation might not occur, that's okay
          }
        }
        submitted = true;
      }

      return {
        success: submitted,
        method: submitted ? 'form submission completed' : 'no method succeeded',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async enhancedTextInput(page, selector, text, options = {}) {
    try {
      const {
        clearFirst = true,
        typeDelay = 50,
        retries = 3
      } = options;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          
          if (clearFirst) {
            await page.click(selector, { clickCount: 3 }); // Select all
            await page.keyboard.press('Backspace');
          }
          
          await page.type(selector, text, { delay: typeDelay });
          
          // Verify the text was entered
          const actualValue = await page.$eval(selector, el => el.value);
          if (actualValue === text) {
            return {
              success: true,
              message: 'Text input successful',
              attempts: attempt
            };
          }
        } catch (error) {
          if (attempt === retries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: false,
        error: 'Text input failed after retries'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async smartClick(page, selector, options = {}) {
    try {
      const {
        timeout = 5000,
        retries = 3,
        waitForElement = true
      } = options;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          if (waitForElement) {
            await page.waitForSelector(selector, { timeout });
          }

          // Scroll element into view
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, selector);

          // Wait a bit for scroll to complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // Try clicking
          await page.click(selector);

          return {
            success: true,
            message: 'Click successful',
            attempts: attempt
          };
        } catch (error) {
          if (attempt === retries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runAutomation(config) {
    let page = null;
    
    try {
      const {
        url,
        actions = [],
        options = {}
      } = config;

      console.log(`Starting automation for: ${url}`);
      
      page = await this.createPage();
      
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for page to be ready
      await this.waitForPageReady(page);

      const results = [];

      // Execute actions
      for (const action of actions) {
        try {
          let result;
          
          switch (action.type) {
            case 'click':
              result = await this.smartClick(page, action.selector, action.options);
              break;
              
            case 'type':
              result = await this.enhancedTextInput(page, action.selector, action.text, action.options);
              break;
              
            case 'select':
              await page.select(action.selector, action.value);
              result = { success: true, message: 'Select completed' };
              break;
              
            case 'wait':
              await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
              result = { success: true, message: 'Wait completed' };
              break;
              
            case 'submit':
              result = await this.submitForm(page, action.options);
              break;
              
            default:
              result = { success: false, error: `Unknown action type: ${action.type}` };
          }
          
          results.push({
            action: action.type,
            selector: action.selector,
            ...result
          });
          
        } catch (error) {
          results.push({
            action: action.type,
            selector: action.selector,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        url,
        results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Automation failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.error('Error closing page:', error);
        }
      }
    }
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }
}

// Create singleton instance
const automationService = new AutomationService();

// Export individual functions for backward compatibility
module.exports = {
  runAutomation: (config) => automationService.runAutomation(config),
  detectElements: (page, options) => automationService.detectElements(page, options),
  waitForPageReady: (page, options) => automationService.waitForPageReady(page, options),
  submitForm: (page, options) => automationService.submitForm(page, options),
  enhancedTextInput: (page, selector, text, options) => automationService.enhancedTextInput(page, selector, text, options),
  smartClick: (page, selector, options) => automationService.smartClick(page, selector, options),
  initializeBrowser: (options) => automationService.initializeBrowser(options),
  closeBrowser: () => automationService.closeBrowser(),
  
  // Export the service instance for advanced usage
  AutomationService,
  automationService
};
