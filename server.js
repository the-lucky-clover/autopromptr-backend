const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { automateForm } = require('./automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovableproject.com',
    /\.lovableproject\.com$/
  ],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AutoPromptr Backend API',
    status: 'running',
    endpoints: [
      'GET /health',
      'POST /api/run-batch',
      'GET /api/status'
    ]
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'operational',
    service: 'autopromptr-backend',
    timestamp: new Date().toISOString(),
    capabilities: ['batch-processing', 'form-automation', 'web-scraping']
  });
});

// Main batch processing endpoint
app.post('/api/run-batch', async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 Received batch processing request:', req.body);

  try {
    const { batch, platform, settings = {} } = req.body;

    // Validate request payload
    if (!batch || !batch.targetUrl || !batch.prompts || !Array.isArray(batch.prompts)) {
      return res.status(400).json({
        error: 'Invalid batch data',
        message: 'Batch must include targetUrl and prompts array',
        code: 'INVALID_BATCH_DATA'
      });
    }

    if (batch.prompts.length === 0) {
      return res.status(400).json({
        error: 'Empty batch',
        message: 'Batch must contain at least one prompt',
        code: 'EMPTY_BATCH'
      });
    }

    // Default settings
    const defaultSettings = {
      waitForIdle: true,
      maxRetries: 2,
      automationDelay: 1000,
      elementTimeout: 5000,
      debugLevel: 'standard'
    };

    const mergedSettings = { ...defaultSettings, ...settings };

    console.log(`📋 Processing batch "${batch.name}" with ${batch.prompts.length} prompts`);
    console.log(`🎯 Target URL: ${batch.targetUrl}`);
    console.log(`⚙️ Settings:`, mergedSettings);

    // Initialize browser
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to target URL
      console.log(`🌐 Navigating to: ${batch.targetUrl}`);
      await page.goto(batch.targetUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Process each prompt in the batch
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < batch.prompts.length; i++) {
        const prompt = batch.prompts[i];
        console.log(`📝 Processing prompt ${i + 1}/${batch.prompts.length}: "${prompt.text}"`);

        try {
          const promptResult = await automateForm(page, prompt.text, mergedSettings);
          
          results.push({
            promptId: prompt.id,
            promptText: prompt.text,
            order: prompt.order,
            status: 'completed',
            result: promptResult,
            timestamp: new Date().toISOString()
          });
          
          successCount++;
          console.log(`✅ Prompt ${i + 1} completed successfully`);

          // Add delay between prompts if specified
          if (mergedSettings.automationDelay > 0 && i < batch.prompts.length - 1) {
            await page.waitForTimeout(mergedSettings.automationDelay);
          }

        } catch (promptError) {
          console.error(`❌ Prompt ${i + 1} failed:`, promptError.message);
          
          results.push({
            promptId: prompt.id,
            promptText: prompt.text,
            order: prompt.order,
            status: 'failed',
            error: promptError.message,
            timestamp: new Date().toISOString()
          });
          
          failureCount++;

          // Continue with next prompt unless maxRetries exceeded
          if (failureCount >= mergedSettings.maxRetries) {
            console.log(`🛑 Max retries (${mergedSettings.maxRetries}) exceeded, stopping batch`);
            break;
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const finalStatus = failureCount === 0 ? 'completed' : 
                         successCount === 0 ? 'failed' : 'completed_with_errors';

      console.log(`🏁 Batch processing completed in ${processingTime}ms`);
      console.log(`📊 Results: ${successCount} successful, ${failureCount} failed`);

      // Return successful response
      res.status(200).json({
        batchId: batch.id,
        batchName: batch.name,
        status: finalStatus,
        results: results,
        summary: {
          totalPrompts: batch.prompts.length,
          successful: successCount,
          failed: failureCount,
          processingTimeMs: processingTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (automationError) {
      console.error('🚨 Automation error:', automationError);
      
      res.status(500).json({
        error: 'Automation failed',
        message: automationError.message,
        code: 'AUTOMATION_ERROR',
        batchId: batch.id,
        timestamp: new Date().toISOString()
      });

    } finally {
      // Always close browser
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error in batch processing:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/status',
      'POST /api/run-batch'
    ],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AutoPromptr Backend server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/status`);
  console.log(`   POST /api/run-batch`);
});
