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
const PORT = process.env.PORT || 5000;

// Security HTTP Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows client to render evidence files
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration for Separate Student (5173) and Admin (5174) hosts
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
  .split(',')
  .map((url) => url.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, test suites)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from unauthorized origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

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
