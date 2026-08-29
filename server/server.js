const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB, getDBStatus } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { mongoSanitizeMiddleware } = require('./utils/sanitize');
const { authLimiter, aiLimiter, generalLimiter } = require('./middleware/securityMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security HTTP Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows client to render evidence files
    crossOriginEmbedderPolicy: false,
  })
);

// Helper to parse comma-separated environment variables
const parseOrigins = (envVar) => {
  if (!envVar) return [];
  return envVar
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

// Default allowed origins (production Vercel domains and local dev hosts)
const defaultOrigins = [
  'https://college-complaint-management-system-bay.vercel.app',
  'https://college-complaint-management-system-ane1yom57-rohith-da8b.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://localhost:5000',
];

// Merge origins from ALLOWED_ORIGINS and CLIENT_URL environment variables
const customOrigins = [
  ...parseOrigins(process.env.ALLOWED_ORIGINS),
  ...parseOrigins(process.env.CLIENT_URL),
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...customOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (mobile apps, curl, Postman, test suites)
  const cleanOrigin = origin.trim().replace(/\/$/, '');

  // 1. Check exact match in configured allowed origins
  if (allowedOrigins.includes(cleanOrigin)) {
    return true;
  }

  // 2. Dynamic match for any Vercel deployment preview under this project or vercel.app
  if (/^https:\/\/college-complaint-management-system.*\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }
  if (/^https:\/\/.*\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 204,
};

// Register CORS middleware before any routes or body parsers
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware with bounded limits to prevent payload flood attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Injection Sanitizer
app.use(mongoSanitizeMiddleware);

// Serve static uploads with nosniff header
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'College Complaint Management System API is running',
  });
});

// Health check endpoint (including live DB status)
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    message: 'College Complaint Management System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

// Dedicated Database Health & Metadata Check
app.get('/api/health/db', (req, res) => {
  const dbStatus = getDBStatus();
  const statusCode = dbStatus.isConnected ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.isConnected ? 'ok' : 'database_unavailable',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Apply Rate Limiters
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/complaints/suggest', aiLimiter);
app.use('/api/complaints/check-duplicates', aiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central Error Handler - Never leaks internal stack traces in production
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 && !isDev ? 'Internal server error.' : (err.message || 'Internal Server Error'),
    ...(isDev && { stack: err.stack }),
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`Complaint endpoints: http://localhost:${PORT}/api/complaints`);
    console.log(`Admin endpoints: http://localhost:${PORT}/api/admin`);
    console.log(`AI endpoints: http://localhost:${PORT}/api/ai`);
  });
}

module.exports = app;
