import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from 'playwright';
import { processBatch, Batch } from './batchProcessor.js';
import logger from './logger.js';

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins: string[] = [
  'https://bolt-diy-34-1751466323377.vercel.app',
  'https://autopromptr.com',
  'https://id-preview--1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovable.app',
  'https://lovable.dev',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://k03e2io1v3fx9wvj0vr8qd5q58o56n-fkdo--8080--6e337437.local-credentialless.webcontainer-api.io',
];

const lovableProjectRegex = /.*\.lovableproject\.com$/;

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || lovableProjectRegex.test(origin)) {
      return callback(null, true);
    }
    console.error(`Blocked by CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend',
    version: '2.0.0',
  });
});

app.get('/test', (_req: Request, res: Response) => {
  res.json({
    message: 'AutoPromptr Backend is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

app.post('/api/run-batch', async (req: Request, res: Response) => {
  try {
    const { batch, platform, wait_for_idle, max_retries } = req.body as {
      batch: Batch;
      platform: string;
      wait_for_idle?: boolean;
      max_retries?: number;
    };

    if (!batch || !batch.prompt) {
      logger.warn('Missing required fields in batch', { ip: req.ip });
      return res.status(400).json({
        error: 'Missing required fields: batch.prompt is required',
        received: req.body,
      });
    }

    logger.info('Batch request received', {
      batchId: batch.id,
      platform,
      ip: req.ip,
    });

    const result = await processBatch(batch, platform, {
      waitForIdle: wait_for_idle,
      maxRetries: max_retries,
      ip: req.ip,
    });

    logger.info('Batch processed successfully', {
      batchId: batch.id,
      platform,
      ip: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Batch processing error', {
      message: error.message,
      ip: req.ip,
    });
    res.status(500).json({
      error: 'Batch processing failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'AutoPromptr Backend is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

// Debug: Playwright version
app.get('/debug/playwright-version', (_req: Request, res: Response) => {
  try {
    const version = require('playwright/package.json').version;
    res.json({ message: 'Playwright version info', version });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not retrieve Playwright version', details: err.message });
  }
});

// Debug: Launch Chromium
app.get('/debug/playwright-launch', async (_req: Request, res: Response) => {
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 10000 });

    const title = await page.title();
    await browser.close();

    res.json({
      message: 'Successfully launched Chromium with Playwright',
      title,
      success: true,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to launch Playwright Chromium',
      message: err.message,
    });
  }
});

// Debug: OS temp directory
app.get('/debug/tmpdir', (_req: Request, res: Response) => {
  const tmpDir = os.tmpdir();
  res.json({
    tmpDir,
    contents: fs.readdirSync(tmpDir),
  });
});

app.listen(port, () => {
  logger.info(`AutoPromptr backend listening on port ${port}`);
});
