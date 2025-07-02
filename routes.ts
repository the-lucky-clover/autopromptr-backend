import { Router } from 'express';
import { launchBrowser } from './browserService.js';

export const router = Router();

router.get('/health', (_, res) => {
  res.send({ status: 'ok' });
});

router.post('/run', async (req, res) => {
  try {
    const { url, headful } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
    }

    const result = await launchBrowser({ url, headful });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
