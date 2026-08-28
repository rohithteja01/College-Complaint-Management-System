const mongoose = require('mongoose');

const UPDATE_TYPES = [
  'SUBMISSION',
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'PRIORITY_CHANGE',
  'COMMENT',
  'RESOLUTION',
  'CLOSURE',
  'ESCALATION',
  'FEEDBACK',
  'DELETION',
  'DEPARTMENT_CHANGE',
  'STAFF_ASSIGNED',
  'REOPEN',
  'LINK_MASTER',
];

const complaintUpdateSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminName: {
      type: String,
      trim: true,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedByName: {
      type: String,
      trim: true,
      default: null,
    },
    performedByRole: {
      type: String,
      enum: ['student', 'admin', 'system'],
      default: 'admin',
    },
    updateType: {
      type: String,
      enum: {
        values: UPDATE_TYPES,
        message: '{VALUE} is not a valid update type',
      },
      default: 'STATUS_CHANGE',
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Update message is required'],
      trim: true,
    },
    previousStatus: {
      type: String,
      trim: true,
      default: null,
    },
    newStatus: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const ComplaintUpdate = mongoose.model('ComplaintUpdate', complaintUpdateSchema);

module.exports = {
  ComplaintUpdate,
  UPDATE_TYPES,
};
