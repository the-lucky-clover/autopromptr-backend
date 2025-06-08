const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const EnhancedAutomation = require('./automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://autopromptr.lovable.app', 'https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'https://autopromptr.lovable.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Enhanced API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // If no API key required in development or if valid key provided
  if (process.env.NODE_ENV !== 'production' || !process.env.API_KEY || apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({
      error: 'Invalid API key',
      code: 'AUTH_FAILED'
    });
  }
};

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// In-memory storage for batch status (use Redis in production)
const batchStatus = new Map();
const batchResults = new Map();

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      enhancedElementDetection: true,
      multipleSubmissionStrategies: true,
      improvedTiming: true,
      enhancedErrorHandling: true,
      lovableOptimizations: true
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  console.log('✅ Health check successful');
  res.json(healthInfo);
});

// Enhanced platforms endpoint
app.get('/api/platforms', (req, res) => {
  const platforms = [
    {
      id: 'lovable',
      name: 'Lovable',
      type: 'web-editor',
      status: 'optimized',
      features: ['enhanced-detection', 'multiple-submission', 'improved-timing']
    },
    {
      id: 'claude',
      name: 'Claude',
      type: 'ai-chat',
      status: 'supported'
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      type: 'ai-chat', 
      status: 'supported'
    },
    {
      id: 'generic',
      name: 'Generic Web Interface',
      type: 'web',
      status: 'basic'
    }
  ];
  
  res.json({ platforms });
});

// Enhanced batch running endpoint
app.post('/api/run-batch', authenticateApiKey, async (req, res) => {
  const { batch, platform, wait_for_idle = true, max_retries = 3 } = req.body;
  
  if (!batch || !batch.id || !batch.targetUrl || !batch.prompts) {
    return res.status(400).json({
      error: 'Invalid batch data. Required: id, targetUrl, prompts',
      code: 'INVALID_BATCH_DATA'
    });
  }

  const batchId = batch.id;
  console.log(`🚀 Starting enhanced batch run: ${batchId}`);
  console.log(`📊 Batch details:`, {
    name: batch.name,
    platform,
    promptCount: batch.prompts.length,
    targetUrl: batch.targetUrl,
    settings: { wait_for_idle, max_retries }
  });

  // Initialize batch status
  batchStatus.set(batchId, {
    id: batchId,
    status: 'processing',
    platform: platform || 'generic',
    progress: {
      completed: 0,
      total: batch.prompts.length,
      percentage: 0,
      failed: 0,
      processing: 1,
      pending: batch.prompts.length - 1
    },
    startedAt: new Date().toISOString(),
    recent_logs: [
      { level: 'info', message: 'Enhanced batch processing started' }
    ]
  });

  res.json({
    success: true,
    batchId,
    message: 'Enhanced batch processing started',
    estimatedDuration: `${batch.prompts.length * 10} seconds`
  });

  // Process batch asynchronously with enhanced automation
  processEnhancedBatch(batchId, batch, platform, { wait_for_idle, max_retries });
});

// Enhanced batch processing function
async function processEnhancedBatch(batchId, batch, platform, options) {
  const automation = new EnhancedAutomation();
  
  try {
    console.log(`⚡ Processing enhanced batch ${batchId} with improved automation`);
    
    // Enhanced options for Lovable optimization
    const enhancedOptions = {
      waitForIdle: options.wait_for_idle,
      maxRetries: Math.max(options.max_retries, 3),
      automationDelay: platform === 'lovable' ? 3000 : 2000,
      elementTimeout: platform === 'lovable' ? 15000 : 10000,
      debugLevel: 'detailed'
    };
    
    console.log(`🔧 Enhanced options for ${platform}:`, enhancedOptions);
    
    // Update status to show processing details
    updateBatchStatus(batchId, {
      status: 'processing',
      recent_logs: [
        { level: 'info', message: `Enhanced automation initialized for ${platform}` },
        { level: 'info', message: `Using enhanced options: ${JSON.stringify(enhancedOptions)}` }
      ]
    });
    
    const result = await automation.automatePrompts(
      batch.targetUrl,
      batch.prompts,
      enhancedOptions
    );
    
    // Calculate final progress
    const completed = result.results.filter(r => r.status === 'completed').length;
    const failed = result.results.filter(r => r.status === 'failed').length;
    
    // Update final status
    batchStatus.set(batchId, {
      ...batchStatus.get(batchId),
      status: 'completed',
      progress: {
        completed,
        total: batch.prompts.length,
        percentage: Math.round((completed / batch.prompts.length) * 100),
        failed,
        processing: 0,
        pending: 0
      },
      completedAt: new Date().toISOString(),
      recent_logs: [
        { level: 'success', message: `Enhanced batch completed: ${completed}/${batch.prompts.length} prompts successful` }
      ]
    });
    
    // Store results
    batchResults.set(batchId, result);
    
    console.log(`✅ Enhanced batch ${batchId} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Enhanced batch ${batchId} failed:`, error);
    
    batchStatus.set(batchId, {
      ...batchStatus.get(batchId),
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString(),
      recent_logs: [
        { level: 'error', message: `Enhanced batch failed: ${error.message}` }
      ]
    });
  } finally {
    await automation.cleanup();
  }
}

// Helper function to update batch status
function updateBatchStatus(batchId, updates) {
  const current = batchStatus.get(batchId);
  if (current) {
    batchStatus.set(batchId, {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }
}

// Enhanced batch status endpoint
app.get('/api/batch-status/:batchId', authenticateApiKey, (req, res) => {
  const { batchId } = req.params;
  const status = batchStatus.get(batchId);
  
  if (!status) {
    return res.status(404).json({
      error: 'Batch not found',
      code: 'BATCH_NOT_FOUND'
    });
  }
  
  console.log(`📊 Status check for batch ${batchId}: ${status.status}`);
  res.json(status);
});

// Enhanced batch results endpoint
app.get('/api/batch-results/:batchId', authenticateApiKey, (req, res) => {
  const { batchId } = req.params;
  const results = batchResults.get(batchId);
  
  if (!results) {
    return res.status(404).json({
      error: 'Batch results not found',
      code: 'RESULTS_NOT_FOUND'
    });
  }
  
  console.log(`📋 Results retrieved for batch ${batchId}`);
  res.json(results);
});

// Enhanced batch stopping endpoint
app.post('/api/stop-batch/:batchId', authenticateApiKey, (req, res) => {
  const { batchId } = req.params;
  const status = batchStatus.get(batchId);
  
  if (!status) {
    return res.status(404).json({
      error: 'Batch not found',
      code: 'BATCH_NOT_FOUND'
    });
  }
  
  if (status.status === 'processing') {
    batchStatus.set(batchId, {
      ...status,
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
      recent_logs: [
        ...status.recent_logs,
        { level: 'info', message: 'Batch stopped by user request' }
      ]
    });
    
    console.log(`⏹️ Batch ${batchId} stopped by user`);
    res.json({ success: true, message: 'Batch stopped successfully' });
  } else {
    res.status(400).json({
      error: 'Batch is not currently processing',
      code: 'BATCH_NOT_PROCESSING'
    });
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Enhanced graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced AutoPromptr Backend v2.0.0 running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Enhanced features enabled:
    • Multi-strategy element detection
    • Lovable-specific optimizations  
    • Improved timing and retries
    • Better error handling
    • Enhanced authentication
  `);
});

module.exports = app;
