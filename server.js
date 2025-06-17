const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;



// Replace this with the actual domain of your frontend
const allowedOrigins = [
  'https://autopromptr.com',
  'https://id-preview--1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovable.app',
  'http://localhost:3000', // for local testing
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// CORS Configuration - CRITICAL FIX
app.use(cors({
  origin: ['https://id-preview--1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovable.app', 'https://lovable.dev', 'http://localhost:3000', 'http://autopromptr.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (already working)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend',
    version: '2.0.0'
  });
});

// Test endpoint (already working)
app.get('/test', (req, res) => {
  res.json({
    message: 'AutoPromptr Backend is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// MISSING ENDPOINT - This is what's causing the 404 errors
app.post('/api/run-batch', async (req, res) => {
  try {
    console.log('Received batch request:', req.body);
    
    const { batch, platform, wait_for_idle, max_retries } = req.body;
    
    // Validate required fields
    if (!batch || !batch.prompt) {
      return res.status(400).json({
        error: 'Missing required fields: batch.prompt is required',
        received: req.body
      });
    }
    
    // Process the batch request
    const result = await processBatch(batch, platform, {
      waitForIdle: wait_for_idle,
      maxRetries: max_retries
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({
      error: 'Batch processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint (already working)
app.get('/', (req, res) => {
  res.json({
    message: 'AutoPromptr Backend is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`AutoPromptr backend listening on port ${port}`);
});
