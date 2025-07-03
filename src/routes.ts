import { Router, Request, Response } from 'express';
import { launchBrowser } from './browserService.ts';  // Ensure the correct path to the TypeScript file

export const router = Router();

router.get('/health', (_, res: Response) => {
  res.send({ status: 'ok' });
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { url, headful }: { url: string; headful?: boolean } = req.body;

    // Validate the 'url' parameter
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
    }

    // Call launchBrowser with 'url' and optional 'headful' parameter
    const result = await launchBrowser({ url, headful });

    // Return success response with data from the launchBrowser function
    res.json({ success: true, data: result });
  } catch (err) {
    // Handle errors and send a 500 status response
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
