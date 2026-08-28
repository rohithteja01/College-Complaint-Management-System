const { Complaint } = require('../models/Complaint');

/**
 * Tokenize and normalize text for string comparison
 */
const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  // Remove punctuation, lowercase, split by whitespace, and filter out short stop-words
  const stopWords = new Set(['the', 'and', 'is', 'in', 'at', 'of', 'on', 'for', 'to', 'a', 'an', 'it', 'my', 'our', 'this', 'that', 'from', 'with']);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));
};

/**
 * Calculate Jaccard token similarity (0.0 to 1.0)
 */
const calculateJaccardSimilarity = (tokensA, tokensB) => {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize > 0 ? intersectionSize / unionSize : 0;
};

/**
 * Calculate direct substring / token containment score
 */
const calculateContainmentScore = (strA = '', strB = '') => {
  const a = strA.toLowerCase().trim();
  const b = strB.toLowerCase().trim();
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const jaccard = calculateJaccardSimilarity(tokensA, tokensB);

  // Check if all tokens of smaller string exist in larger string
  const [smaller, larger] = tokensA.length <= tokensB.length ? [tokensA, new Set(tokensB)] : [tokensB, new Set(tokensA)];
  if (smaller.length > 0) {
    const matchedCount = smaller.filter((t) => larger.has(t)).length;
    const subsetRatio = matchedCount / smaller.length;
    return Math.max(jaccard, subsetRatio * 0.8);
  }

  return jaccard;
};

/**
 * Find similar active complaints within a recent time window (last 30 days)
 * Only compares against ACTIVE complaints (excluding Resolved and Closed)
 */
const findSimilarComplaints = async ({
  title = '',
  description = '',
  category = '',
  location = '',
  currentComplaintId = null,
  maxResults = 5,
  daysWindow = 30,
}) => {
  try {
    if (!title && !description && !location) {
      return [];
    }

    const fromDate = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);

    // Active status filter: Only check grievances currently in progress / under investigation
    const activeStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress'];

    const query = {
      status: { $in: activeStatuses },
      createdAt: { $gte: fromDate },
      isDeleted: { $ne: true },
    };

    // Filter by category if provided to drastically reduce search space
    if (category) {
      query.category = category;
    }

    if (currentComplaintId) {
      query._id = { $ne: currentComplaintId };
    }

    // Limit database candidates to at most 20 recent records for bounded performance
    const candidates = await Complaint.find(query)
      .select('complaintId title description category location status createdAt student')
      .populate('student', 'fullName')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (!candidates.length) {
      return [];
    }

    const inputTitleTokens = tokenize(title);
    const inputDescTokens = tokenize(description);
    const inputLoc = location.trim();

    const scoredMatches = [];

    for (const doc of candidates) {
      // 1. Location similarity (40% weight)
      const locScore = calculateContainmentScore(inputLoc, doc.location || '');

      // 2. Title similarity (40% weight)
      const docTitleTokens = tokenize(doc.title || '');
      const titleScore = calculateJaccardSimilarity(inputTitleTokens, docTitleTokens);
      const titleContainment = calculateContainmentScore(title, doc.title || '');
      const effectiveTitleScore = Math.max(titleScore, titleContainment);

      // 3. Description similarity (20% weight)
      const docDescTokens = tokenize(doc.description || '');
      const descScore = calculateJaccardSimilarity(inputDescTokens, docDescTokens);

      // Composite weighted similarity score
      // If location is an exact / high match, it strongly boosts the likelihood
      let compositeScore = locScore * 0.40 + effectiveTitleScore * 0.40 + descScore * 0.20;

      // Location match bonus if same room/block with moderate title overlap
      if (locScore >= 0.70 && effectiveTitleScore >= 0.30) {
        compositeScore = Math.max(compositeScore, 0.65);
      }

      // Exact title match bonus
      if (effectiveTitleScore >= 0.85) {
        compositeScore = Math.max(compositeScore, 0.75);
      }

      // Threshold: Consider potential duplicate if similarity >= 0.40
      if (compositeScore >= 0.40) {
        scoredMatches.push({
          id: doc._id,
          complaintId: doc.complaintId,
          title: doc.title,
          category: doc.category,
          location: doc.location,
          status: doc.status,
          similarityScore: Number(compositeScore.toFixed(2)),
          similarityPercent: Math.round(compositeScore * 100),
          createdAt: doc.createdAt,
        });
      }
    }

    // Sort by highest similarity score
    scoredMatches.sort((a, b) => b.similarityScore - a.similarityScore);

    return scoredMatches.slice(0, maxResults);
  } catch (error) {
    console.error('[DuplicateDetectionService:Error]', error);
    return []; // Fail safely without disrupting the application
  }
};

module.exports = {
  findSimilarComplaints,
  calculateContainmentScore,
  calculateJaccardSimilarity,
  tokenize,
};
