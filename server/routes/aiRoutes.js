const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const aiService = require('../services/aiService');

// All AI endpoints require authentication
router.use(protect);

/**
 * AI Grievance Analysis Endpoint
 * Route: POST /api/ai/analyze-complaint
 */
router.post('/analyze-complaint', async (req, res) => {
  try {
    const { title, description, location } = req.body;

    // Validate inputs
    if ((!title || !title.trim()) && (!description || !description.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a complaint title or description for AI analysis.',
      });
    }

    const safeTitle = typeof title === 'string' ? title.trim() : '';
    const safeDesc = typeof description === 'string' ? description.trim() : '';
    const safeLoc = typeof location === 'string' ? location.trim() : '';

    const analysis = await aiService.analyzeComplaint({
      title: safeTitle,
      description: safeDesc,
      location: safeLoc,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        suggestedCategory: analysis.suggestedCategory,
        suggestedPriority: analysis.suggestedPriority,
        summary: analysis.summary,
        actionItems: analysis.actionItems,
        isAiGenerated: analysis.isAiGenerated,
        generatedAt: analysis.generatedAt,
      },
    });
  } catch (error) {
    console.error('[AIRoutes] Error analyzing complaint:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to complete AI complaint analysis.',
    });
  }
});

module.exports = router;
