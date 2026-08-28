const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

/**
 * Guard middleware: strictly forbid dev auth endpoints in production
 */
const ensureDevMode = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      status: 'error',
      message: 'Development authentication endpoints are disabled in production.',
    });
  }
  next();
};

/**
 * Get or seed development test Student identity & JWT token
 * Route: GET /api/dev/student
 */
const getDevStudent = async (req, res) => {
  try {
    let student = await User.findOne({ email: 'dev.student@college.edu' });

    if (!student) {
      student = await User.create({
        fullName: 'Alex Morgan (Test Student)',
        email: 'dev.student@college.edu',
        studentId: 'DEV-CS-001',
        department: 'Computer Science & Engineering',
        password: 'devpassword123',
        role: 'student',
      });
    }

    const token = generateToken(student._id, 'student');

    return res.status(200).json({
      status: 'success',
      message: 'Development Student session initialized.',
      token,
      user: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        studentId: student.studentId,
        department: student.department,
        role: 'student',
      },
    });
  } catch (error) {
    console.error('Dev student auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initialize development student authentication.',
    });
  }
};

/**
 * Get or seed development test Admin identity & JWT token
 * Route: GET /api/dev/admin
 */
const getDevAdmin = async (req, res) => {
  try {
    let admin = await User.findOne({ email: 'dev.admin@college.edu' });

    if (!admin) {
      admin = await User.create({
        fullName: 'Dr. Evelyn Reed (Dean / Test Admin)',
        email: 'dev.admin@college.edu',
        studentId: 'ADMIN-DEV-01',
        department: 'College Administration',
        password: 'devpassword123',
        role: 'admin',
      });
    }

    const token = generateToken(admin._id, 'admin');

    return res.status(200).json({
      status: 'success',
      message: 'Development Admin session initialized.',
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        studentId: admin.studentId,
        department: admin.department,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Dev admin auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initialize development admin authentication.',
    });
  }
};

module.exports = {
  ensureDevMode,
  getDevStudent,
  getDevAdmin,
};
