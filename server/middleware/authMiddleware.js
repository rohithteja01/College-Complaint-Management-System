const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Protect middleware - verifies JWT token and populates req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: No token provided. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: Token is invalid or has expired.',
      });
    }

    // Find user by ID in token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: The user belonging to this token no longer exists.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication.',
    });
  }
};

/**
 * Require student role
 */
const requireStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: This action requires student privileges.',
    });
  }
  next();
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: This action requires administrator privileges.',
    });
  }
  next();
};

/**
 * Dynamic role-based authorization helper
 * @param  {...string} roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied: Requires one of the following roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  requireStudent,
  requireAdmin,
  authorize,
};
