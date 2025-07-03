import { Router, Request, Response } from 'express';
import { launchBrowser } from './browserService.ts';  // Ensure the correct path to the TypeScript file

export const router = Router();

router.get('/health', (_, res: Response) => {
  res.send({ status: 'ok' });
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { url, headful }: { url: string; headful?: boolean } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
    }

    const result = await launchBrowser({ url, headful });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
