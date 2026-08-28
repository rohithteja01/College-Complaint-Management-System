const express = require('express');
const router = express.Router();
const {
  ensureDevMode,
  getDevStudent,
  getDevAdmin,
} = require('../controllers/devAuthController');

// Enforce non-production environment guard
router.use(ensureDevMode);

// Development authentication routes
router.get('/student', getDevStudent);
router.get('/admin', getDevAdmin);

module.exports = router;
