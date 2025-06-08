const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class EnhancedAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.enhancedRetryAttempts = 5;
    this.enhancedRetryDelay = 2000;
  }

  // Enhanced element detection strategies for Lovable
  async findChatInputWithStrategies(page) {
    const strategies = [
      {
        name: 'Direct Lovable Selectors',
        selectors: [
          'textarea[placeholder*="Message"]',
          'textarea[placeholder*="Chat"]',
          'textarea[placeholder*="Ask"]',
          'div[contenteditable="true"]',
          '.chat-input textarea',
          '[data-testid="chat-input"]',
          '[aria-label*="chat"]',
          '[aria-label*="message"]'
        ]
      },
      {
        name: 'Visible Input Detection',
        selectors: [
          'textarea:visible',
          'input[type="text"]:visible',
          'div[contenteditable="true"]:visible'
        ]
      },
      {
        name: 'Focus-based Detection',
        selectors: [
          'textarea:focus',
          'input:focus',
          '[contenteditable="true"]:focus'
        ]
      }
    ];

    for (const strategy of strategies) {
      console.log(`🔍 Trying strategy: ${strategy.name}`);
      
      for (const selector of strategy.selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              console.log(`✅ Found chat input with selector: ${selector}`);
              return element;
            }
          }
        } catch (err) {
          console.log(`❌ Selector failed: ${selector}`, err.message);
        }
      }
    }

    throw new Error('CHAT_INPUT_NOT_FOUND: No chat input found after trying all strategies');
  }

  // Enhanced page waiting with Lovable-specific optimizations
  async waitForLovablePageReady(page) {
    console.log('🔄 Waiting for Lovable page to be ready...');
    
    try {
      // Wait for basic page load
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('✅ Network idle achieved');
      
      // Wait for Lovable-specific elements
      await page.waitForSelector('body', { timeout: 30000 });
      console.log('✅ Body element loaded');
      
      // Additional wait for dynamic content
      await page.waitForTimeout(3000);
      console.log('✅ Dynamic content wait completed');
      
      // Check if Lovable editor is loaded
      const isEditorLoaded = await page.evaluate(() => {
        return document.querySelector('.lovable-editor, .editor-container, [data-testid="editor"]') !== null;
      });
      
      if (isEditorLoaded) {
        console.log('✅ Lovable editor detected');
        await page.waitForTimeout(2000); // Extra wait for editor initialization
      }
      
    } catch (err) {
      console.warn('⚠️ Page readiness check failed:', err.message);
      // Continue anyway with a basic wait
      await page.waitForTimeout(5000);
    }
  }

  // Multiple submission method attempts
  async tryMultipleSubmissionMethods(page) {
    const submissionMethods = [
      {
        name: 'Enter Key',
        action: async () => await page.keyboard.press('Enter')
      },
      {
        name: 'Submit Button Click',
        action: async () => {
          const submitBtn = await page.$('button[type="submit"], .submit-btn, [aria-label*="send"]');
          if (submitBtn) await submitBtn.click();
          else throw new Error('Submit button not found');
        }
      },
      {
        name: 'Send Icon Click',
        action: async () => {
          const sendIcon = await page.$('[data-testid="send"], .send-icon, svg[aria-label*="send"]');
          if (sendIcon) await sendIcon.click();
          else throw new Error('Send icon not found');
        }
      },
      {
        name: 'Ctrl+Enter Combination',
        action: async () => await page.keyboard.press('Control+Enter')
      }
    ];

    for (const method of submissionMethods) {
      try {
        console.log(`🔄 Trying submission method: ${method.name}`);
        await method.action();
        
        // Wait to see if submission was successful
        await page.waitForTimeout(2000);
        
        // Check if message was sent (input should be cleared or new message appears)
        const isCleared = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('textarea, input, [contenteditable="true"]'));
          return inputs.some(input => input.value === '' || input.textContent === '');
        });
        
        if (isCleared) {
          console.log(`✅ Submission successful with: ${method.name}`);
          return true;
        }
        
      } catch (err) {
        console.log(`❌ ${method.name} failed:`, err.message);
      }
    }
    
    return false;
  }

  // Enhanced text automation with multiple submission strategies
  async automateTextEntryWithRetries(page, text) {
    console.log(`🚀 Starting enhanced text automation for: "${text.substring(0, 50)}..."`);
    
    for (let attempt = 1; attempt <= this.enhancedRetryAttempts; attempt++) {
      try {
        console.log(`📝 Text entry attempt ${attempt}/${this.enhancedRetryAttempts}`);
        
        // Wait for page readiness
        await this.waitForLovablePageReady(page);
        
        // Find chat input with enhanced strategies
        const chatInput = await this.findChatInputWithStrategies(page);
        
        // Focus and prepare input
        await chatInput.focus();
        await page.waitForTimeout(500);
        
        // Clear existing content
        await chatInput.evaluate(el => el.value = '');
        await page.waitForTimeout(300);
        
        // Type the text with human-like timing
        await chatInput.type(text, { delay: 75 });
        console.log('✅ Text typed successfully');
        
        // Wait a moment for the text to register
        await page.waitForTimeout(1000);
        
        // Try multiple submission strategies
        const submitted = await this.tryMultipleSubmissionMethods(page);
        
        if (submitted) {
          console.log('✅ Message submitted successfully');
          return; // Success!
        }
        
        throw new Error('Failed to submit message');
        
      } catch (err) {
        console.error(`❌ Attempt ${attempt} failed:`, err.message);
        
        if (attempt === this.enhancedRetryAttempts) {
          throw new Error(`TEXT_AUTOMATION_FAILED: Text automation failed after ${this.enhancedRetryAttempts} attempts: ${err.message}`);
        }
        
        // Progressive backoff delay
        const delay = this.enhancedRetryDelay * Math.pow(1.5, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await page.waitForTimeout(delay);
      }
    }
  }

  async initializeBrowser() {
    if (!this.browser) {
      console.log('🚀 Initializing browser with enhanced settings...');
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production',
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
      });
      console.log('✅ Browser initialized successfully');
    }
    return this.browser;
  }

  async automatePrompts(targetUrl, prompts, options = {}) {
    const { 
      waitForIdle = true, 
      maxRetries = 3, 
      automationDelay = 3000,
      elementTimeout = 15000,
      debugLevel = 'detailed'
    } = options;

    console.log(`🎯 Starting enhanced automation for ${targetUrl}`);
    console.log(`📊 Options:`, { waitForIdle, maxRetries, automationDelay, elementTimeout, debugLevel });

    try {
      await this.initializeBrowser();
      this.page = await this.browser.newPage();
      
      // Set enhanced viewport and user agent
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`🌐 Navigating to: ${targetUrl}`);
      await this.page.goto(targetUrl, { 
        waitUntil: waitForIdle ? 'networkidle0' : 'load',
        timeout: 60000 
      });
      
      // Initial delay for page setup
      console.log(`⏳ Initial automation delay: ${automationDelay}ms`);
      await this.page.waitForTimeout(automationDelay);
      
      const results = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        console.log(`\n📝 Processing prompt ${i + 1}/${prompts.length}: "${prompt.text.substring(0, 50)}..."`);
        
        try {
          await this.automateTextEntryWithRetries(this.page, prompt.text);
          
          results.push({
            id: prompt.id,
            status: 'completed',
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Prompt ${i + 1} completed successfully`);
          
          // Wait between prompts
          if (i < prompts.length - 1) {
            await this.page.waitForTimeout(2000);
          }
          
        } catch (err) {
          console.error(`❌ Prompt ${i + 1} failed:`, err.message);
          
          results.push({
            id: prompt.id,
            status: 'failed',
            error: err.message,
            timestamp: new Date().toISOString()
          });
          
          // Continue with next prompt even if one fails
        }
      }
      
      console.log('🎉 Enhanced automation completed');
      return {
        status: 'completed',
        results,
        completedAt: new Date().toISOString()
      };
      
    } catch (err) {
      console.error('💥 Enhanced automation failed:', err);
      throw new Error(`Enhanced automation failed: ${err.message}`);
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('🧹 Enhanced automation cleanup completed');
  }
}

module.exports = EnhancedAutomation;
