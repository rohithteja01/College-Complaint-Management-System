const mongoose = require('mongoose');
const Counter = require('./Counter');
require('./Department');
require('./Staff');

// Categories Enum
const CATEGORIES = [
  'Classroom',
  'Laboratory',
  'Hostel',
  'Wi-Fi',
  'Infrastructure',
  'Transportation',
  'Cleanliness',
  'Library',
  'Electricity',
  'Water',
  'Canteen',
  'Other',
];

// Priorities Enum
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// Statuses Enum (Official Workflow: Submitted -> Under Review -> Assigned -> In Progress -> Resolved -> Closed)
const STATUSES = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
];

// Attachment Sub-schema
const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    fileType: { type: String, trim: true },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Admin Comment Sub-schema
const adminCommentSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
    },
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    commentedByName: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Resolution Details Sub-schema
const resolutionDetailsSchema = new mongoose.Schema(
  {
    summary: { type: String, trim: true },
    actionTaken: { type: String, trim: true },
    message: { type: String, trim: true },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedByName: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// AI Analysis Sub-schema (Separate from student original fields)
const aiAnalysisSchema = new mongoose.Schema(
  {
    suggestedCategory: { type: String, trim: true, default: null },
    suggestedPriority: { type: String, trim: true, default: null },
    confidence: { type: Number, default: null },
    summary: { type: String, trim: true, default: null },
    actionItems: [{ type: String, trim: true }],
    isAiGenerated: { type: Boolean, default: true },
    engine: { type: String, default: 'heuristic_nlp' },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
    },
    generatedAt: { type: Date, default: null },
  },
  { _id: false }
);

// Main Complaint Schema
const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category. Allowed categories: ' + CATEGORIES.join(', '),
      },
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required (e.g., Room No, Block, Hostel Wing)'],
      trim: true,
    },
    attachments: [attachmentSchema],
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Department',
      default: null,
      index: true,
    },
    assignedDepartmentName: {
      type: String,
      trim: true,
      default: null,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Staff',
      default: null,
    },
    assignedStaffName: {
      type: String,
      trim: true,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITIES,
        message: '{VALUE} is not a valid priority. Allowed: ' + PRIORITIES.join(', '),
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status. Workflow: ' + STATUSES.join(' → '),
      },
      default: 'Submitted',
      index: true,
    },
    adminComments: [adminCommentSchema],
    resolutionDetails: {
      type: resolutionDetailsSchema,
      default: () => ({}),
    },
    aiAnalysis: {
      type: aiAnalysisSchema,
      default: () => ({}),
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    isEscalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        trim: true,
        default: '',
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    upvotes: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    masterComplaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
      index: true,
    },
    relatedComplaints: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedByName: {
      type: String,
      trim: true,
      default: null,
    },
    deletedByRole: {
      type: String,
      enum: ['student', 'admin'],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        if (ret.assignedDepartment && typeof ret.assignedDepartment === 'object' && ret.assignedDepartment.name) {
          ret.assignedDepartmentName = ret.assignedDepartment.name;
        } else if (typeof ret.assignedDepartment === 'string') {
          ret.assignedDepartmentName = ret.assignedDepartment;
        }
        if (ret.assignedStaff && typeof ret.assignedStaff === 'object' && ret.assignedStaff.name) {
          ret.assignedStaffName = ret.assignedStaff.name;
        } else if (typeof ret.assignedStaff === 'string') {
          ret.assignedStaffName = ret.assignedStaff;
        }

        const affectedCount = 1 + (ret.upvoteCount || (ret.upvotes ? ret.upvotes.length : 0));
        ret.affectedStudentsCount = affectedCount;
        ret.impactLevel = affectedCount >= 50 ? 'Critical' : affectedCount >= 21 ? 'High' : affectedCount >= 6 ? 'Medium' : 'Low';

        return ret;
      },
    },
  }
);

// Auto-generate unique Complaint ID (CMP-YYYY-XXXXX) before validation/save
complaintSchema.pre('validate', async function (next) {
  if (this.complaintId) {
    return next();
  }

  try {
    const currentYear = new Date().getFullYear();
    const counterKey = `complaint_${currentYear}`;
    let seqNumber;

    try {
      seqNumber = await Counter.getNextSequence(counterKey);
    } catch (counterErr) {
      // Fallback in case counter model is unavailable
      const count = await mongoose.model('Complaint').countDocuments();
      seqNumber = count + 1;
    }

    const paddedNumber = String(seqNumber).padStart(5, '0');
    this.complaintId = `CMP-${currentYear}-${paddedNumber}`;
    next();
  } catch (error) {
    next(error);
  }
});

const { calculateDueDate } = require('../config/slaConfig');

// Automatically handle resolvedAt, closedAt, and dueDate timestamp updates
complaintSchema.pre('save', function (next) {
  if (!this.dueDate || (!this.isNew && this.isModified('priority'))) {
    this.dueDate = calculateDueDate(this.priority || 'Medium', this.createdAt || new Date());
  }

  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'Resolved' && !this.resolvedAt) {
      this.resolvedAt = now;
      if (this.resolutionDetails) {
        this.resolutionDetails.resolvedAt = now;
      }
    } else if (this.status === 'Closed' && !this.closedAt) {
      this.closedAt = now;
      if (!this.resolvedAt) {
        this.resolvedAt = now;
      }
    }
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = {
  Complaint,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
};
