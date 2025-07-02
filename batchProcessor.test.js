import { processBatch } from './batchProcessor.js';
import puppeteer from 'puppeteer';

test('processBatch handles invalid input gracefully', async () => {
  const result = await processBatch({}, "testPlatform");
  expect(result.status).toBe("failed");
});
