const puppeteer = require('puppeteer');
const { automateForm } = require('./automation');

async function processBatch(batch, platform, options = {}) {
  console.log(`Processing batch ${batch.id} for platform ${platform}`);
  
  const { waitForIdle = true, maxRetries = 3 } = options;
  
  // Initialize puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to target URL if provided
    if (batch.targetUrl) {
      await page.goto(batch.targetUrl);
      
      if (waitForIdle) {
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Process the automation prompt
    const result = await processPrompt(page, batch.prompt, options);
    
    // Take screenshot if needed
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: true 
    });
    
    return {
      batchId: batch.id,
      status: 'completed',
      result: result,
      screenshot: screenshot,
      processedAt: new Date().toISOString(),
      platform: platform
    };
    
  } finally {
    await browser.close();
  }
}

async function processPrompt(page, prompt, options) {
  // Call automateForm from automation.js
  return await automateForm(page, prompt, options);
}

module.exports = { processBatch };


