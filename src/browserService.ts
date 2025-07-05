import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

interface LaunchOptions {
  url: string;
  headless?: boolean;
}

interface PromptData {
  promptText: string;
  platform: 'lovable' | 'bolt' | 'v0' | 'generic';
  promptId: string;
}

interface BrowserResult {
  title: string;
  screenshotPath: string;
  url: string;
  promptSubmitted?: boolean;
  generatedCode?: string;
  error?: string;
}

export async function launchBrowser(
  { url, headless = false }: LaunchOptions,
  promptData?: PromptData
): Promise<BrowserResult> {
  const browser = await chromium.launch({ headless: !headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    
    let promptSubmitted = false;
    let generatedCode = '';
    let error = '';
    
    // If prompt data is provided, attempt to submit the prompt
    if (promptData) {
      try {
        const result = await submitPrompt(page, promptData);
        promptSubmitted = result.success;
        generatedCode = result.generatedCode || '';
        error = result.error || '';
      } catch (err: any) {
        error = `Failed to submit prompt: ${err.message}`;
      }
    }
    
    // Take screenshot after potential prompt submission
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    
    // Save screenshot to a file
    const screenshotPath = path.join(process.cwd(), 'screenshots', `screenshot-${Date.now()}.png`);
    
    // Ensure screenshots directory exists
    const screenshotsDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    fs.writeFileSync(screenshotPath, screenshotBuffer);
    
    return {
      title,
      screenshotPath,
      url,
      promptSubmitted,
      generatedCode,
      error
    };
  } finally {
    await browser.close();
  }
}

async function submitPrompt(page: any, promptData: PromptData): Promise<{ success: boolean; generatedCode?: string; error?: string }> {
  const { promptText, platform, promptId } = promptData;
  
  try {
    switch (platform) {
      case 'lovable':
        return await automateLovable(page, promptText);
      case 'bolt':
        return await automateBolt(page, promptText);
      case 'v0':
        return await automateV0(page, promptText);
      default:
        return await automateGeneric(page, promptText);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function automateLovable(page: any, promptText: string): Promise<{ success: boolean; generatedCode?: string; error?: string }> {
  try {
    // Wait for the prompt input to be available
    await page.waitForSelector('textarea[placeholder*="prompt"], textarea[placeholder*="describe"], input[type="text"]', { timeout: 10000 });
    
    // Find and fill the prompt input
    const promptInput = await page.$('textarea[placeholder*="prompt"], textarea[placeholder*="describe"], input[type="text"]');
    if (promptInput) {
      await promptInput.fill(promptText);
      
      // Look for submit button
      const submitButton = await page.$('button[type="submit"], button:has-text("Create"), button:has-text("Generate"), button:has-text("Submit")');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for potential response/generation
        await page.waitForTimeout(2000);
        
        return { success: true };
      }
    }
    
    return { success: false, error: 'Could not find prompt input or submit button' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function automateBolt(page: any, promptText: string): Promise<{ success: boolean; generatedCode?: string; error?: string }> {
  try {
    // Wait for the chat input or prompt area
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
    
    // Find and fill the input
    const input = await page.$('textarea, input[type="text"]');
    if (input) {
      await input.fill(promptText);
      
      // Look for send/submit button
      const sendButton = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Create")');
      if (sendButton) {
        await sendButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        return { success: true };
      }
    }
    
    return { success: false, error: 'Could not find input or send button' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function automateV0(page: any, promptText: string): Promise<{ success: boolean; generatedCode?: string; error?: string }> {
  try {
    // Wait for v0's prompt input
    await page.waitForSelector('textarea, input[placeholder*="prompt"], input[placeholder*="describe"]', { timeout: 10000 });
    
    const promptInput = await page.$('textarea, input[placeholder*="prompt"], input[placeholder*="describe"]');
    if (promptInput) {
      await promptInput.fill(promptText);
      
      // Press Enter or find submit button
      await page.keyboard.press('Enter');
      
      // Wait for generation
      await page.waitForTimeout(3000);
      
      return { success: true };
    }
    
    return { success: false, error: 'Could not find v0 prompt input' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function automateGeneric(page: any, promptText: string): Promise<{ success: boolean; generatedCode?: string; error?: string }> {
  try {
    // Generic automation - try common selectors
    const commonSelectors = [
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="describe"]',
      'input[type="text"][placeholder*="prompt"]',
      'textarea',
      'input[type="text"]'
    ];
    
    let input = null;
    for (const selector of commonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        input = await page.$(selector);
        if (input) break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (input) {
      await input.fill(promptText);
      
      // Try to submit
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Send")',
        'button:has-text("Submit")',
        'button:has-text("Create")',
        'button:has-text("Generate")'
      ];
      
      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForTimeout(2000);
            return { success: true };
          }
        } catch (e) {
          // Try next button
        }
      }
      
      // If no button found, try Enter key
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      return { success: true };
    }
    
    return { success: false, error: 'Could not find any suitable input field' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
