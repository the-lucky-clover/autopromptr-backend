import { Page } from "playwright";
import logger from "./logger";

export async function automateForm(page: Page, prompt: string): Promise<void> {
  try {
    logger.info(`Automating form with prompt: ${prompt}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for common form elements
    const textareas = await page.locator('textarea').count();
    const inputs = await page.locator('input[type="text"]').count();
    
    if (textareas > 0) {
      // Fill the first textarea found
      await page.locator('textarea').first().fill(prompt);
      logger.info('Filled textarea with prompt');
    } else if (inputs > 0) {
      // Fill the first text input found
      await page.locator('input[type="text"]').first().fill(prompt);
      logger.info('Filled text input with prompt');
    } else {
      // Try to find any input field
      const anyInput = await page.locator('input').first();
      if (await anyInput.count() > 0) {
        await anyInput.fill(prompt);
        logger.info('Filled input field with prompt');
      } else {
        logger.warn('No suitable input field found on the page');
      }
    }
    
    // Look for submit buttons
    const submitButtons = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send"), button:has-text("Generate")').count();
    
    if (submitButtons > 0) {
      await page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send"), button:has-text("Generate")').first().click();
      logger.info('Clicked submit button');
      
      // Wait for potential navigation or response
      await page.waitForTimeout(2000);
    } else {
      logger.warn('No submit button found on the page');
    }
    
  } catch (error: any) {
    logger.error(`Error in automateForm: ${error.message}`);
    throw error;
  }
}

