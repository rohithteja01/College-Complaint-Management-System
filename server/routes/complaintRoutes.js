const express = require('express');
const router = express.Router();
const {
  createComplaint,
  suggestComplaintMetadata,
  checkDuplicateComplaints,
  getMyComplaints,
  getComplaintById,
  getComplaintUpdates,
  deleteComplaint,
  submitComplaintFeedback,
  upvoteComplaint,
} = require('../controllers/complaintController');
const { protect, requireStudent } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// All complaint routes require user authentication
router.use(protect);

// AI suggestion endpoint for real-time category & priority recommendation
router.post('/suggest', suggestComplaintMetadata);

// Duplicate complaint pre-check endpoint
router.post('/check-duplicates', checkDuplicateComplaints);

// Student complaints submission (with single file evidence attachment)
router.post('/', requireStudent, uploadSingle('attachment'), createComplaint);

// Student's own complaints list
router.get('/my', requireStudent, getMyComplaints);
router.get('/', requireStudent, getMyComplaints);

// Specific complaint chronological lifecycle updates
router.get('/:id/updates', getComplaintUpdates);

// Submit student feedback for resolved complaint
router.post('/:id/feedback', requireStudent, submitComplaintFeedback);

// Upvote / Indicate affected by complaint ("I'm facing this issue too")
router.post('/:id/upvote', requireStudent, upvoteComplaint);

// Specific complaint details (Student owner or Admin)
router.get('/:id', getComplaintById);

// Soft-delete complaint (Student can delete own; Admin can delete any)
router.delete('/:id', deleteComplaint);

module.exports = router;
