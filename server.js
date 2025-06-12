const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { runAutomation } = require('./automation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lovable.dev',
    'https://*.lovable.dev',
    /\.lovable\.dev$/,
    /\.netlify\.app$/,
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend',
    version: '2.0.0'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'AutoPromptr Backend is running!', 
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// GET platforms endpoint
app.get('/api/platforms', (req, res) => {
  try {
    const platforms = [
      { id: 'lovable', name: 'Lovable', type: 'web', url: 'https://lovable.dev' },
      { id: 'claude', name: 'Claude.ai', type: 'web', url: 'https://claude.ai' },
      { id: 'chatgpt', name: 'ChatGPT', type: 'web', url: 'https://chat.openai.com' },
      { id: 'cursor', name: 'Cursor', type: 'desktop', url: 'https://cursor.sh' }
    ];
    
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ 
      error: 'Failed to fetch platforms', 
      details: error.message 
    });
  }
});

// POST automation endpoint
app.post('/api/automation', async (req, res) => {
  try {
    console.log('Received automation request:', req.body);
    
    const { 
      targetUrl, 
      prompt, 
      settings = {},
      platform = 'web',
      batchId
    } = req.body;

    // Validation
    if (!targetUrl || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: targetUrl and prompt are required' 
      });
    }

    // Generate unique job ID if not provided
    const jobId = batchId || uuidv4();
    
    console.log(`Starting automation job ${jobId} for platform: ${platform}`);
    
    // Enhanced settings with defaults
    const automationSettings = {
      waitForIdle: settings.waitForIdle !== false,
      maxRetries: Math.max(settings.maxRetries || 3, 1),
      automationDelay: Math.max(settings.automationDelay || 2000, 1000),
      elementTimeout: Math.max(settings.elementTimeout || 10000, 5000),
      debugLevel: settings.debugLevel || 'info',
      headless: settings.headless !== false,
      ...settings
    };

    // Run automation
    const result = await runAutomation({
      targetUrl,
      prompt,
      platform,
      settings: automationSettings,
      jobId
    });

    console.log(`Automation job ${jobId} completed successfully`);
    
    res.json({
      success: true,
      jobId,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Automation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Automation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// NEW: POST batch run endpoint (This was missing!)
app.post('/api/run-batch', async (req, res) => {
  try {
    console.log('Received batch run request:', req.body);
    
    const { 
      batch,
      platform,
      settings = {}
    } = req.body;

    // Validation
    if (!batch || !batch.targetUrl || !batch.prompt) {
      return res.status(400).json({ 
        error: 'Missing required batch fields: batch with targetUrl and prompt are required' 
      });
    }

    const jobId = batch.id || uuidv4();
    
    console.log(`Starting batch run ${jobId} for platform: ${platform || 'web'}`);
    
    // Enhanced settings for batch processing
    const batchSettings = {
      waitForIdle: settings.waitForIdle !== false,
      maxRetries: Math.max(settings.maxRetries || 3, 1),
      automationDelay: Math.max(settings.automationDelay || 3000, 1000),
      elementTimeout: Math.max(settings.elementTimeout || 15000, 5000),
      debugLevel: settings.debugLevel || 'verbose',
      headless: settings.headless !== false,
      ...settings
    };

    // Run automation with batch data
    const result = await runAutomation({
      targetUrl: batch.targetUrl,
      prompt: batch.prompt,
      platform: platform || 'web',
      settings: batchSettings,
      jobId,
      batchName: batch.name
    });

    console.log(`Batch run ${jobId} completed successfully`);
    
    res.json({
      success: true,
      batchId: jobId,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch run error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Batch run failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AutoPromptr Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🤖 Automation API: http://localhost:${PORT}/api/automation`);
  console.log(`📦 Batch Run API: http://localhost:${PORT}/api/run-batch`);
  console.log(`🌐 Platforms API: http://localhost:${PORT}/api/platforms`);
});

module.exports = app;
