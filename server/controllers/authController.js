const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new student
 * Route: POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { fullName, email, studentId, department, password } = req.body;

    // Validate presence of all required fields
    if (!fullName || !email || !studentId || !department || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required: fullName, email, studentId, department, password.',
      });
    }

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedStudentId = studentId.trim().toUpperCase();
    const trimmedDepartment = department.trim();

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check for duplicate email
    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists.',
      });
    }

    // Check for duplicate studentId
    const existingStudentId = await User.findOne({ studentId: trimmedStudentId });
    if (existingStudentId) {
      return res.status(400).json({
        status: 'error',
        message: 'A student with this Student ID is already registered.',
      });
    }

    // Create user with forced 'student' role for security
    const user = await User.create({
      fullName: trimmedFullName,
      email: trimmedEmail,
      studentId: trimmedStudentId,
      department: trimmedDepartment,
      password,
      role: 'student',
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      status: 'success',
      message: 'Student registered successfully.',
      token,
      role: user.role,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', '),
      });
    }

    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        status: 'error',
        message: `Duplicate value entered for ${field}. Please use another value.`,
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration.',
    });
  }
};

/**
 * Login user
 * Route: POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate presence of email and password
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user and explicitly select password field
    const user = await User.findOne({ email: trimmedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token,
      role: user.role,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during login.',
    });
  }
};

/**
 * Get current authenticated user profile
 * Route: GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      user: req.user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving user profile.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
