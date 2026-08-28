const rateLimit = require('express-rate-limit');

/**
 * Authentication Rate Limiter
 * Limits excessive login and registration attempts to prevent brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test', // Skip during automated testing
});

/**
 * AI & Duplicate Suggestion Rate Limiter
 * Prevents abuse of Gemini API and AI suggestion endpoints.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many AI analysis requests. Please slow down and try again shortly.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * General API Rate Limiter
 * Protects server from DoS / flood attacks.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP. Please try again after a few minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = {
  authLimiter,
  aiLimiter,
  generalLimiter,
};
