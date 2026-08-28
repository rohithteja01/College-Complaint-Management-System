const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    studentId: {
      type: String,
      required: [
        function () {
          return this.role === 'student';
        },
        'Student ID is required for student accounts',
      ],
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'admin'],
        message: '{VALUE} is not a valid role. Allowed roles: student, admin',
      },
      default: 'student',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Seed default Admin user if not present
 */
userSchema.statics.seedAdminIfEmpty = async function () {
  try {
    const adminExists = await this.findOne({ email: 'admin@college.edu' });
    if (!adminExists) {
      console.log('[User] Seeding default administrator account (admin@college.edu)...');
      await this.create({
        fullName: 'System Administrator',
        email: 'admin@college.edu',
        password: 'AdminPassword@123',
        department: 'Administration',
        role: 'admin',
      });
      console.log('[User] Default administrator account seeded successfully.');
    }
  } catch (error) {
    console.error('[User] Error seeding default admin:', error.message);
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
