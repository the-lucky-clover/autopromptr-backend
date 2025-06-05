const puppeteer = require('puppeteer');

// Platform-specific configurations
const PLATFORM_CONFIGS = {
  lovable: {
    url: 'https://lovable.dev',
    selectors: {
      promptInput: 'textarea[placeholder*="prompt"], textarea[placeholder*="describe"], .prompt-input',
      submitButton: 'button[type="submit"], button:contains("Generate"), button:contains("Create")',
      resultContainer: '.generated-code, .output, .result, [class*="preview"]',
      loadingIndicator: '.loading, .spinner, [class*="generating"]'
    },
    waitTime: 15000, // Wait time for code generation
    requiresAuth: true
  },
  v0: {
    url: 'https://v0.vercel.app',
    selectors: {
      promptInput: 'textarea[placeholder*="prompt"], .prompt-textarea',
      submitButton: 'button[aria-label*="submit"], button:contains("Generate")',
      resultContainer: '.preview-container, .generated-ui',
      loadingIndicator: '.loading-spinner, [data-loading="true"]'
    },
    waitTime: 20000,
    requiresAuth: true
  },
  bolt_new: {
    url: 'https://bolt.new',
    selectors: {
      promptInput: 'textarea, input[type="text"].prompt',
      submitButton: 'button[type="submit"], .submit-btn',
      resultContainer: '.code-output, .preview',
      loadingIndicator: '.loading, .generating'
    },
    waitTime: 25000,
    requiresAuth: false
  },
  replit: {
    url: 'https://replit.com',
    selectors: {
      promptInput: 'textarea[placeholder*="AI"], .ai-input',
      submitButton: 'button:contains("Generate"), .ai-submit',
      resultContainer: '.editor, .code-container',
      loadingIndicator: '.ai-loading'
    },
    waitTime: 15000,
    requiresAuth: true
  }
};

// Puppeteer configuration for Render.com
const getBrowserConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };
  } else {
    return {
      headless: false,
      args: ['--no-sandbox'],
      slowMo: 100 // Slow down for debugging
    };
  }
};

async function runBatchAutomation({ batch_id, platform, prompts, delay_between_prompts, max_retries, supabase }) {
  let browser = null;
  let currentPromptIndex = 0;
  
  try {
    await logAutomation(supabase, batch_id, 'info', `Starting batch automation for ${prompts.length} prompts on ${platform}`);
    
    const platformConfig = PLATFORM_CONFIGS[platform];
    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Launch browser
    browser = await puppeteer.launch(getBrowserConfig());
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to platform
    await logAutomation(supabase, batch_id, 'info', `Navigating to ${platformConfig.url}`);
    await page.goto(platformConfig.url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Handle authentication if required
    if (platformConfig.requiresAuth) {
      await handleAuthentication(page, platform, supabase, batch_id);
    }

    // Process each prompt in order
    for (let i = 0; i < prompts.length; i++) {
      currentPromptIndex = i;
      const prompt = prompts[i];
      
      // Check if batch was stopped
      const { data: batchStatus } = await supabase
        .from('batches')
        .select('status')
        .eq('id', batch_id)
        .single();
      
      if (batchStatus?.status === 'stopped') {
        await logAutomation(supabase, batch_id, 'info', 'Batch stopped by user');
        break;
      }

      await processPrompt(page, prompt, platformConfig, supabase, batch_id, max_retries);
      
      // Delay between prompts (except for the last one)
      if (i < prompts.length - 1) {
        await logAutomation(supabase, batch_id, 'info', `Waiting ${delay_between_prompts}ms before next prompt`);
        await page.waitForTimeout(delay_between_prompts);
      }
    }

    // Mark batch as completed
    await supabase
      .from('batches')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batch_id);

    await logAutomation(supabase, batch_id, 'success', 'Batch automation completed successfully');

  } catch (error) {
    console.error('Batch automation error:', error);
    
    await supabase
      .from('batches')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batch_id);

    await logAutomation(supabase, batch_id, 'error', `Batch failed: ${error.message}`);
    throw error;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function processPrompt(page, prompt, platformConfig, supabase, batch_id, max_retries) {
  let attempt = 0;
  const startTime = Date.now();
  
  while (attempt < max_retries) {
    try {
      attempt++;
      
      // Update prompt status to processing
      await supabase
        .from('prompts')
        .update({ 
          status: 'processing',
          processing_started_at: new Date().toISOString()
        })
        .eq('id', prompt.id);

      await logAutomation(supabase, batch_id, 'info', 
        `Processing prompt ${prompt.order_index + 1}: "${prompt.prompt_text.substring(0, 50)}..." (Attempt ${attempt})`);

      // Clear any existing input
      await clearInput(page, platformConfig.selectors.promptInput);
      
      // Type the prompt
      await page.waitForSelector(platformConfig.selectors.promptInput, { timeout: 10000 });
      await page.type(platformConfig.selectors.promptInput, prompt.prompt_text);
      
      // Submit the prompt
      await page.click(platformConfig.selectors.submitButton);
      
      // Wait for generation to complete
      await waitForGeneration(page, platformConfig);
      
      // Extract results
      const result = await extractResults(page, platformConfig);
      
      const processingTime = Date.now() - startTime;
      
      // Update prompt with success
      await supabase
        .from('prompts')
        .update({ 
          status: 'completed',
          result: result,
          processed_at: new Date().toISOString(),
          processing_time_ms: processingTime
        })
        .eq('id', prompt.id);

      await logAutomation(supabase, batch_id, 'success', 
        `Prompt ${prompt.order_index + 1} completed in ${processingTime}ms`);
      
      return; // Success, exit retry loop

    } catch (error) {
      console.error(`Prompt processing error (attempt ${attempt}):`, error);
      
      if (attempt >= max_retries) {
        // Final failure
        const processingTime = Date.now() - startTime;
        
        await supabase
          .from('prompts')
          .update({ 
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString(),
            processing_time_ms: processingTime
          })
          .eq('id', prompt.id);

        await logAutomation(supabase, batch_id, 'error', 
          `Prompt ${prompt.order_index + 1} failed after ${max_retries} attempts: ${error.message}`);
      } else {
        await logAutomation(supabase, batch_id, 'warning', 
          `Prompt ${prompt.order_index + 1} attempt ${attempt} failed, retrying: ${error.message}`);
        
        // Wait before retry
        await page.waitForTimeout(2000);
      }
    }
  }
}

async function handleAuthentication(page, platform, supabase, batch_id) {
  try {
    await logAutomation(supabase, batch_id, 'info', `Checking authentication for ${platform}`);
    
    // Wait for page to load and check for login indicators
    await page.waitForTimeout(3000);
    
    // Look for common login/signup buttons or forms
    const loginSelectors = [
      'button:contains("Sign in")',
      'button:contains("Login")', 
      'a[href*="login"]',
      'a[href*="signin"]',
      '.auth-button',
      '.login-button'
    ];
    
    let loginRequired = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        loginRequired = true;
        break;
      } catch (e) {
        // Selector not found, continue
      }
    }
    
    if (loginRequired) {
      throw new Error(`Authentication required for ${platform}. Please log in manually and save session.`);
    }
    
    await logAutomation(supabase, batch_id, 'success', `Authentication check passed for ${platform}`);
    
  } catch (error) {
    await logAutomation(supabase, batch_id, 'warning', `Authentication issue: ${error.message}`);
    // Don't throw here - let the automation continue and fail later if needed
  }
}

async function clearInput(page, selector) {
  try {
    await page.focus(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
  } catch (error) {
    console.log('Could not clear input:', error.message);
  }
}

async function waitForGeneration(page, platformConfig) {
  // Wait for loading indicator to appear (generation started)
  try {
    await page.waitForSelector(platformConfig.selectors.loadingIndicator, { timeout: 5000 });
  } catch (e) {
    // Loading indicator might not appear, continue
  }
  
  // Wait for loading indicator to disappear (generation completed)
  try {
    await page.waitForSelector(platformConfig.selectors.loadingIndicator, { 
      hidden: true, 
      timeout: platformConfig.waitTime 
    });
  } catch (e) {
    // Timeout waiting for completion, continue anyway
  }
  
  // Additional wait for results to fully render
  await page.waitForTimeout(2000);
}

async function extractResults(page, platformConfig) {
  try {
    // Wait for result container
    await page.waitForSelector(platformConfig.selectors.resultContainer, { timeout: 10000 });
    
    // Extract text content from result container
    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText || element.textContent || 'Generation completed';
      }
      return 'Generation completed - no extractable content';
    }, platformConfig.selectors.resultContainer);
    
    return result.substring(0, 1000); // Limit result length
    
  } catch (error) {
    return `Generation appeared to complete but could not extract results: ${error.message}`;
  }
}

async function logAutomation(supabase, batch_id, level, message) {
  try {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    await supabase
      .from('automation_logs')
      .insert({
        batch_id: batch_id,
        level: level,
        message: message,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging to database:', error);
  }
}

module.exports = { runBatchAutomation };