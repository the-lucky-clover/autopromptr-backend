import { Router, Request, Response } from 'express';
import { launchBrowser } from './browserService.js';

export const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const url: string = req.body.url;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url in request body' });
    }
    const result = await launchBrowser(url);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
