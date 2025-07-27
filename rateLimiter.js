const rateLimit = require('express-rate-limit');
const config = require('./config');

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,    // Disable the `X-RateLimit-*` headers
  message: 'Too many requests, please try again later.',
});

module.exports = limiter;