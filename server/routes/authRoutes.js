const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect, requireStudent, requireAdmin } = require('../middleware/authMiddleware');

// Public authentication routes (Universal & Host-Specific Aliases)
router.post('/register', register);
router.post('/student/register', register);
router.post('/login', login);
router.post('/student/login', login);
router.post('/admin/login', login);

// Protected routes
router.get('/me', protect, getMe);

// Role verification test routes
router.get('/student-only', protect, requireStudent, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: You have accessed the student-only route.',
    user: req.user,
  });
});

router.get('/admin-only', protect, requireAdmin, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: You have accessed the admin-only route.',
    user: req.user,
  });
});

module.exports = router;
