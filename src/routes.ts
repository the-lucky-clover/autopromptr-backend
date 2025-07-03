import { Router, Request, Response } from 'express';
import { launchBrowser } from './browserService.js'; // Ensure the correct path

export const router = Router();

router.get('/health', (_: Request, res: Response) => {
  res.send({ status: 'ok' });
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { url, headless } = req.body; // Changed 'headful' to 'headless'

    // Validate the 'url' parameter
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
    }

    // Call launchBrowser with 'url' and optional 'headless' parameter
    const result = await launchBrowser(url, headless); // Pass 'headless'

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in /run endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
