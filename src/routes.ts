import { Router, Request, Response } from 'express';
import { launchBrowser } from './browserService.js';

export const router = Router();

router.get('/health', (_: Request, res: Response) => {
  res.send({ status: 'ok' });
});

// Original endpoint (keep for backwards compatibility)
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { url, headless } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
    }
    
    const result = await launchBrowser({ url, headless });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in /run endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// New batch endpoint that your frontend expects
router.post('/run-batch', async (req: Request, res: Response) => {
  try {
    const { id, name, targetUrl, promptLength, platform, prompts } = req.body;
    
    // Validate required fields
    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid targetUrl' 
      });
    }
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid prompts array' 
      });
    }
    
    // Process the batch - you'll need to implement this logic
    // For now, we'll process each prompt sequentially
    const results = [];
    
    for (const prompt of prompts) {
      try {
        // Launch browser for each prompt
        const result = await launchBrowser({ 
          url: targetUrl, 
          headless: true,
          prompt: prompt.text || prompt.prompt_text // Handle different prompt field names
        });
        
        results.push({
          promptId: prompt.id,
          success: true,
          result: result
        });
      } catch (error: any) {
        console.error(`Error processing prompt ${prompt.id}:`, error);
        results.push({
          promptId: prompt.id,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      batchId: id,
      results: results,
      totalPrompts: prompts.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });
    
  } catch (error: any) {
    console.error('Error in /run-batch endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alternative endpoint structure if your frontend uses /api prefix
router.post('/api/run-batch', async (req: Request, res: Response) => {
  // Redirect to the main run-batch handler
  return router.handle(req, res);
});
