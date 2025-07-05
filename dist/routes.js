import { Router } from 'express';
import { launchBrowser } from './browserService.js';
export const router = Router();
router.get('/health', (_, res) => {
    res.send({ status: 'ok' });
});
router.post('/run', async (req, res) => {
    try {
        const { url, headless } = req.body; // Changed 'headful' to 'headless'
        // Validate the 'url' parameter
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'Missing or invalid URL' });
        }
        // Call launchBrowser with 'url' and optional 'headless' parameter
        const result = await launchBrowser({ url, headless }); // Pass as object
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error in /run endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
