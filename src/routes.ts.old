import { Router } from 'express';
import { launchBrowser } from './browserService.js';

export const router = Router();

router.get('/health', (_, res) => {
  res.send({ status: 'ok' });
});

router.post('/run', async (req, res) => {
  try {
    const result = await launchBrowser(req.body.url);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
