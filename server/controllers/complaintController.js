const mongoose = require('mongoose');
const { Complaint, CATEGORIES, PRIORITIES, STATUSES } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const emailService = require('../services/emailService');
const aiService = require('../services/aiService');
const duplicateDetectionService = require('../services/duplicateDetectionService');
const { escapeRegex } = require('../utils/sanitize');

/**
 * Submit a new complaint (Student only)
 * Route: POST /api/complaints
 */
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;

    // Validate mandatory fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: title, description, category, and location.',
      });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();
    const trimmedLocation = location.trim();

    if (trimmedTitle.length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Complaint title must be at least 3 characters long.',
      });
    }

    if (trimmedDescription.length < 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Complaint description must be at least 10 characters long.',
      });
    }

    // Validate category
    if (!CATEGORIES.includes(trimmedCategory)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid category "${trimmedCategory}". Allowed categories: ${CATEGORIES.join(', ')}`,
      });
    }

    // Validate priority if provided
    let chosenPriority = 'Medium';
    if (priority) {
      const trimmedPriority = priority.trim();
      if (!PRIORITIES.includes(trimmedPriority)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid priority "${trimmedPriority}". Allowed priorities: ${PRIORITIES.join(', ')}`,
        });
      }
      chosenPriority = trimmedPriority;
    }

    // Format attachment if file uploaded
    const attachments = [];
    if (req.file) {
      attachments.push({
        fileName: req.file.filename,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedAt: new Date(),
      });
    }

    // Execute AI Analysis (Non-blocking, failsafe)
    let aiAnalysisResult = null;
    try {
      aiAnalysisResult = await aiService.analyzeComplaint({
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
      });
    } catch (aiErr) {
      console.warn('[ComplaintController] AI analysis skipped/errored:', aiErr.message);
    }

    // Create complaint with enforced student ownership, 'Submitted' status, and separate AI metadata
    const complaint = await Complaint.create({
      title: trimmedTitle,
      description: trimmedDescription,
      category: trimmedCategory,
      location: trimmedLocation,
      priority: chosenPriority,
      attachments,
      student: req.user._id,
      status: 'Submitted',
      aiAnalysis: aiAnalysisResult || {
        status: 'SKIPPED',
        generatedAt: new Date(),
      },
    });

    // Automatically record initial SUBMISSION lifecycle update
    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: null,
      adminName: req.user.fullName || 'Student',
      updateType: 'SUBMISSION',
      message: `Complaint submitted under category "${complaint.category}" with ${complaint.priority} priority at location "${complaint.location}".`,
      previousStatus: null,
      newStatus: 'Submitted',
      createdAt: complaint.createdAt,
    });

    // Populate student details
    await complaint.populate('student', 'fullName email studentId department');

    // Trigger non-blocking email notification
    emailService.sendComplaintSubmissionEmail({
      student: req.user,
      complaint,
    }).catch((err) => console.error('[EmailService] Async submission notification error:', err));

    return res.status(201).json({
      status: 'success',
      message: 'Complaint submitted successfully.',
      complaint,
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating complaint.',
    });
  }
};

/**
 * Get AI Suggestions for Category, Priority, Summary, and Action Items on the fly
 * Route: POST /api/complaints/suggest
 */
const suggestComplaintMetadata = async (req, res) => {
  try {
    const { title = '', description = '', location = '' } = req.body || {};
    const safeTitle = typeof title === 'string' ? title.trim() : '';
    const safeDesc = typeof description === 'string' ? description.trim() : '';
    const safeLoc = typeof location === 'string' ? location.trim() : '';

    if (!safeTitle && !safeDesc) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide at least a title or description for AI analysis.',
      });
    }

    const suggestions = await aiService.analyzeComplaint({
      title: safeTitle,
      description: safeDesc,
      location: safeLoc,
    });

    return res.status(200).json({
      status: 'success',
      suggestions,
    });
  } catch (error) {
    console.error('Suggest metadata error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error generating AI suggestions.',
    });
  }
};

/**
 * Check for similar active complaints before submission
 * Route: POST /api/complaints/check-duplicates
 */
const checkDuplicateComplaints = async (req, res) => {
  try {
    const { title = '', description = '', category = '', location = '' } = req.body || {};

    const duplicates = await duplicateDetectionService.findSimilarComplaints({
      title: typeof title === 'string' ? title.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      category: typeof category === 'string' ? category.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
    });

    return res.status(200).json({
      status: 'success',
      hasDuplicates: duplicates.length > 0,
      count: duplicates.length,
      duplicates,
    });
  } catch (error) {
    console.error('Check duplicate complaints error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error checking duplicate complaints.',
    });
  }
};

/**
 * Get all complaints filed by the logged-in student (with search & filter support)
 * Route: GET /api/complaints/my or GET /api/complaints
 */
const getMyComplaints = async (req, res) => {
  try {
    const { category, status, search } = req.query || {};
    const query = {
      student: req.user._id,
      isDeleted: { $ne: true },
    };

    if (category && CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (status && STATUSES.includes(status)) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { complaintId: { $regex: safeSearch, $options: 'i' } },
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('student', 'fullName email studentId department')
      .populate('assignedDepartment', 'name active')
      .populate('assignedStaff', 'name email employeeId phone');

    return res.status(200).json({
      status: 'success',
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error('Get my complaints error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving student complaints.',
    });
  }
};

/**
 * Get complaint details by MongoDB _id or human-readable complaintId
 * Route: GET /api/complaints/:id
 */
const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    // Search by ObjectId if valid format, otherwise search by complaintId (e.g. CMP-2026-00001)
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { _id: id, isDeleted: { $ne: true } }
      : { complaintId: id.toUpperCase(), isDeleted: { $ne: true } };

    const complaint = await Complaint.findOne(query)
      .populate('student', 'fullName email studentId department')
      .populate('assignedDepartment', 'name active')
      .populate('assignedStaff', 'name email employeeId phone');

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Strict Authorization Check: Student can only view their own complaint
    if (
      req.user.role === 'student' &&
      complaint.student._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to view this complaint.',
      });
    }

    // Fetch chronological lifecycle timeline updates
    const updates = await ComplaintUpdate.find({ complaint: complaint._id })
      .sort({ createdAt: 1 })
      .populate('admin', 'fullName role department');

    return res.status(200).json({
      status: 'success',
      complaint,
      updates,
    });
  } catch (error) {
    console.error('Get complaint by ID error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving complaint details.',
    });
  }
};

/**
 * Get chronological lifecycle updates for a complaint
 * Route: GET /api/complaints/:id/updates
 */
const getComplaintUpdates = async (req, res) => {
  try {
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { _id: id, isDeleted: { $ne: true } }
      : { complaintId: id.toUpperCase(), isDeleted: { $ne: true } };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Student privacy guard
    if (
      req.user.role === 'student' &&
      complaint.student.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to view updates for this complaint.',
      });
    }

    const updates = await ComplaintUpdate.find({ complaint: complaint._id })
      .sort({ createdAt: 1 })
      .populate('admin', 'fullName role department');

    return res.status(200).json({
      status: 'success',
      count: updates.length,
      updates,
    });
  } catch (error) {
    console.error('Get complaint updates error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving complaint timeline updates.',
    });
  }
};

/**
 * Soft delete a complaint (Student can delete own complaint; Admin can delete any complaint)
 * Route: DELETE /api/complaints/:id
 */
const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint || complaint.isDeleted) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Authorization check: student can only delete their own complaint
    if (
      req.user.role === 'student' &&
      complaint.student.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to delete another student\'s complaint.',
      });
    }

    const now = new Date();
    complaint.isDeleted = true;
    complaint.deletedAt = now;
    complaint.deletedBy = req.user._id;
    complaint.deletedByName = req.user.fullName;
    complaint.deletedByRole = req.user.role;

    await complaint.save();

    // Create ComplaintUpdate Audit Record
    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user.role === 'admin' ? req.user._id : null,
      adminName: req.user.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      updateType: 'DELETION',
      message: `Complaint soft-deleted by ${req.user.role} (${req.user.fullName}).`,
      previousStatus: complaint.status,
      newStatus: complaint.status,
      createdAt: now,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Complaint deleted successfully.',
      complaintId: complaint.complaintId,
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error deleting complaint.',
    });
  }
};

/**
 * Submit student resolution feedback & 1-5 star rating
 * Route: POST /api/complaints/:id/feedback
 */
const submitComplaintFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const parsedRating = Number(rating);
    if (!rating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be an integer between 1 and 5 stars.',
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { _id: id, isDeleted: { $ne: true } }
      : { complaintId: id.toUpperCase(), isDeleted: { $ne: true } };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Ownership check: Only the filing student can rate
    if (
      req.user.role === 'student' &&
      complaint.student.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only submit feedback for your own complaints.',
      });
    }

    // Resolution check: Complaint must be Resolved or Closed
    if (!['Resolved', 'Closed'].includes(complaint.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback can only be provided after the complaint has been marked as Resolved.',
      });
    }

    const now = new Date();
    const cleanComment = typeof comment === 'string' ? comment.trim() : '';

    complaint.feedback = {
      rating: Math.round(parsedRating),
      comment: cleanComment,
      submittedAt: now,
      submittedBy: req.user._id,
    };

    await complaint.save();

    // Log timeline event
    await ComplaintUpdate.create({
      complaint: complaint._id,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role || 'student',
      updateType: 'FEEDBACK',
      message: `Student submitted resolution feedback: ⭐ ${Math.round(parsedRating)}/5 stars${cleanComment ? ` — "${cleanComment}"` : ''}`,
      createdAt: now,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Resolution feedback recorded successfully. Thank you for your review!',
      feedback: complaint.feedback,
      complaint,
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error submitting resolution feedback.',
    });
  }
};

/**
 * Upvote a complaint ("👍 I'm facing this issue too")
 * Route: POST /api/complaints/:id/upvote
 */
const upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { _id: id, isDeleted: { $ne: true } }
      : { complaintId: id.toUpperCase(), isDeleted: { $ne: true } };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Check if user already upvoted
    const studentIdStr = req.user._id.toString();
    const existingIndex = complaint.upvotes.findIndex(
      (u) => u.student && u.student.toString() === studentIdStr
    );

    let hasUpvoted = false;
    if (existingIndex >= 0) {
      // Toggle off or keep
      complaint.upvotes.splice(existingIndex, 1);
      hasUpvoted = false;
    } else {
      complaint.upvotes.push({
        student: req.user._id,
        createdAt: new Date(),
      });
      hasUpvoted = true;
    }

    complaint.upvoteCount = complaint.upvotes.length;
    await complaint.save();

    const affectedCount = 1 + complaint.upvoteCount;
    const impactLevel = affectedCount >= 50 ? 'Critical' : affectedCount >= 21 ? 'High' : affectedCount >= 6 ? 'Medium' : 'Low';

    return res.status(200).json({
      status: 'success',
      hasUpvoted,
      upvoteCount: complaint.upvoteCount,
      affectedStudentsCount: affectedCount,
      impactLevel,
      message: hasUpvoted
        ? 'You have indicated that you are also facing this grievance.'
        : 'Upvote removed.',
    });
  } catch (error) {
    console.error('Upvote complaint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error processing upvote.',
    });
  }
};

module.exports = {
  createComplaint,
  suggestComplaintMetadata,
  checkDuplicateComplaints,
  getMyComplaints,
  getComplaintById,
  getComplaintUpdates,
  deleteComplaint,
  submitComplaintFeedback,
  upvoteComplaint,
};
