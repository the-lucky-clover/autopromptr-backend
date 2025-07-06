import express from 'express';
import cors from 'cors';
import { router } from './routes.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
  'https://autopromptr.com',
  'https://www.autopromptr.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://lovable.app',
  'https://id-preview--1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovable.app',
];
const lovableProjectRegex = /.*\.lovableproject\.com$/;

const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    if (!origin || allowedOrigins.includes(origin) || lovableProjectRegex.test(origin)) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS (index): ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend'
  });
});

// API routes
app.use('/api', router);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
