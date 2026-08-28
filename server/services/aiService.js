const { GoogleGenAI } = require('@google/genai');
const { CATEGORIES, PRIORITIES } = require('../models/Complaint');

/**
 * Get or initialize Google Gen AI client safely
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.error('[AIService] Failed to initialize GoogleGenAI client:', err.message);
    return null;
  }
};

/**
 * Intelligent Heuristic Fallback Engine
 * Provides immediate, safe responses when Gemini is unconfigured, offline, or times out.
 */
const analyzeWithHeuristics = ({ title = '', description = '', location = '' }) => {
  const combinedText = `${title} ${description} ${location}`.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const categoryKeywords = {
    'Wi-Fi': ['wifi', 'wi-fi', 'internet', 'network', 'router', 'access point', 'ethernet', 'bandwidth', 'slow net', 'lan', 'connection drop'],
    Electricity: ['light', 'flicker', 'power', 'plug', 'socket', 'switchboard', 'voltage', 'spark', 'electric', 'short circuit', 'fan', 'ac', 'air conditioner', 'generator', 'fuse', 'power cut', 'wiring', 'switch'],
    Water: ['water', 'tap', 'leak', 'pipe', 'drain', 'plumbing', 'washroom', 'restroom', 'sink', 'toilet', 'flush', 'sewage', 'filter', 'drinking water', 'overflow', 'cooler', 'faucet'],
    Classroom: ['projector', 'whiteboard', 'blackboard', 'desk', 'bench', 'podium', 'mic', 'microphone', 'speaker', 'smartboard', 'marker', 'lecture', 'slides', 'classroom', 'hall', 'display'],
    Laboratory: ['lab', 'equipment', 'computer', 'pc', 'monitor', 'keyboard', 'mouse', 'microscope', 'chemical', 'apparatus', 'hardware', 'gpu', 'cpu', 'workstation'],
    Infrastructure: ['door', 'window', 'glass', 'wall', 'paint', 'ceiling', 'plaster', 'staircase', 'lift', 'elevator', 'crack', 'tile', 'roof', 'building', 'ramp', 'floor'],
    Transportation: ['bus', 'van', 'transport', 'driver', 'route', 'shuttle', 'commute', 'parking', 'vehicle', 'pick up', 'drop'],
    Cleanliness: ['clean', 'dust', 'garbage', 'trash', 'waste', 'sweep', 'dirty', 'smell', 'odor', 'hygiene', 'bin', 'litter', 'spider', 'cobweb'],
    Library: ['book', 'library', 'librarian', 'journal', 'shelf', 'reading room', 'borrow', 'return', 'magazine', 'periodical'],
    Hostel: ['hostel', 'room', 'bed', 'wardrobe', 'cupboard', 'roommate', 'dorm', 'warden', 'laundry', 'corridor', 'wing'],
    Canteen: ['canteen', 'food', 'cafeteria', 'meal', 'lunch', 'breakfast', 'dinner', 'snacks', 'tea', 'coffee', 'beverage', 'menu', 'overcharging', 'cook', 'chef', 'vendor', 'taste', 'spoiled', 'stale', 'catering', 'mess food', 'seating', 'canteen staff', 'plates', 'utensils'],
  };

  let bestCategory = 'Other';
  let maxCategoryScore = 0;

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    keywords.forEach((keyword) => {
      if (lowerTitle.includes(keyword)) {
        // Specific root-cause categories get higher weight over generic location words
        score += (cat === 'Hostel' && (lowerTitle.includes('wifi') || lowerTitle.includes('wi-fi') || lowerTitle.includes('leak') || lowerTitle.includes('water') || lowerTitle.includes('light') || lowerTitle.includes('power'))) ? 2 : 5;
      }
      if (combinedText.includes(keyword)) score += 1;
    });
    if (score > maxCategoryScore) {
      maxCategoryScore = score;
      bestCategory = cat;
    }
  }

  const criticalKeywords = ['fire', 'spark', 'short circuit', 'smoke', 'electric shock', 'burst', 'flooding', 'hazard', 'emergency', 'danger', 'severe', 'immediate'];
  const highKeywords = ['broken', 'leak', 'outage', 'exam', 'class', 'no power', 'urgent', 'down', 'failing', 'stuck', 'dark', 'blocked'];
  const lowKeywords = ['minor', 'suggestion', 'request', 'slow', 'dust', 'noise', 'cosmetic', 'paint', 'query'];

  let suggestedPriority = 'Medium';
  let priorityReason = 'Standard campus operational maintenance request.';
  let priorityConfidence = 0.75;

  if (criticalKeywords.some((k) => combinedText.includes(k))) {
    suggestedPriority = 'Critical';
    priorityReason = 'Potential campus safety hazard or severe infrastructure disruption detected.';
    priorityConfidence = 0.95;
  } else if (highKeywords.some((k) => combinedText.includes(k))) {
    suggestedPriority = 'High';
    priorityReason = 'Urgent operational fault affecting academic or facility readiness.';
    priorityConfidence = 0.85;
  } else if (lowKeywords.some((k) => combinedText.includes(k))) {
    suggestedPriority = 'Low';
    priorityReason = 'Minor cosmetic or routine maintenance request with low operational impact.';
    priorityConfidence = 0.80;
  }

  const categoryConfidence = maxCategoryScore > 0 ? Math.min(0.65 + maxCategoryScore * 0.08, 0.95) : 0.50;
  const overallConfidence = Number(((categoryConfidence + priorityConfidence) / 2).toFixed(2));

  const cleanedTitle = title.trim();
  const locationText = location ? ` at ${location.trim()}` : '';
  const summary = `Student reported ${bestCategory.toLowerCase()} issue: "${cleanedTitle}"${locationText}, assessed as ${suggestedPriority} priority.`;

  const actionItems = [];
  if (bestCategory === 'Wi-Fi') {
    actionItems.push('Inspect local Wi-Fi router / Access Point status and signal coverage');
    actionItems.push('Test network gateway ping response and DNS resolution');
    actionItems.push('Check ethernet uplink cable connection to core switch');
  } else if (bestCategory === 'Electricity') {
    actionItems.push(`Dispatch electrician to inspect electrical fixtures in ${location || 'affected area'}`);
    actionItems.push('Check distribution board MCB switches and line voltage');
    actionItems.push('Replace faulty bulbs, fuses, or damaged wiring if necessary');
  } else if (bestCategory === 'Water') {
    actionItems.push(`Dispatch plumber to examine piping and fixtures at ${location || 'location'}`);
    actionItems.push('Check inlet pressure valve and seal any active leaks');
    actionItems.push('Verify drainage lines and clean overflow area');
  } else if (bestCategory === 'Classroom') {
    actionItems.push(`Test AV equipment, projector, and audio cabling in ${location || 'classroom'}`);
    actionItems.push('Verify remote control, HDMI ports, and power adapters');
    actionItems.push('Confirm classroom readiness for upcoming lecture sessions');
  } else if (bestCategory === 'Laboratory') {
    actionItems.push(`Inspect lab workstation hardware and peripheral cables at ${location || 'lab'}`);
    actionItems.push('Run hardware diagnostic test and verify system boot');
    actionItems.push('Notify lab technician for part replacement if needed');
  } else if (bestCategory === 'Cleanliness') {
    actionItems.push(`Instruct housekeeping staff to clean and sanitize ${location || 'area'}`);
    actionItems.push('Empty waste receptacles and disinfect surroundings');
    actionItems.push('Inspect area post-cleaning for hygiene compliance');
  } else if (bestCategory === 'Hostel') {
    actionItems.push(`Coordinate with hostel warden to inspect ${location || 'hostel premises'}`);
    actionItems.push('Document maintenance requirements with hostel facility supervisor');
    actionItems.push('Execute repair work during designated non-disruptive hours');
  } else if (bestCategory === 'Canteen') {
    actionItems.push(`Inspect food preparation hygiene and kitchen sanitation at ${location || 'college canteen'}`);
    actionItems.push('Verify food storage quality, ingredient expiration dates, and drinking water filtration');
    actionItems.push('Review pricing/menu compliance and counsel cafeteria staff on service standards');
  } else {
    actionItems.push(`Conduct on-site inspection of ${bestCategory.toLowerCase()} issue at ${location || 'facility'}`);
    actionItems.push('Assess repair scope and estimate required materials');
    actionItems.push('Log progress notes and update grievance resolution timeline');
  }

  return {
    suggestedCategory: bestCategory,
    suggestedPriority,
    priorityReason,
    confidence: overallConfidence,
    summary,
    actionItems,
    isAiGenerated: true,
    engine: 'fallback_heuristic',
    generatedAt: new Date(),
  };
};

/**
 * Sanitize and validate Gemini JSON output against allowed schema
 */
const sanitizeGeminiResponse = (parsedJson, fallback) => {
  let suggestedCategory = fallback.suggestedCategory;
  if (parsedJson && parsedJson.suggestedCategory && typeof parsedJson.suggestedCategory === 'string') {
    const matchedCategory = CATEGORIES.find(
      (c) => c.toLowerCase() === parsedJson.suggestedCategory.trim().toLowerCase()
    );
    if (matchedCategory) {
      suggestedCategory = matchedCategory;
    }
  }

  let suggestedPriority = fallback.suggestedPriority;
  if (parsedJson && parsedJson.suggestedPriority && typeof parsedJson.suggestedPriority === 'string') {
    const matchedPriority = PRIORITIES.find(
      (p) => p.toLowerCase() === parsedJson.suggestedPriority.trim().toLowerCase()
    );
    if (matchedPriority) {
      suggestedPriority = matchedPriority;
    }
  }

  let priorityReason = fallback.priorityReason;
  if (parsedJson && parsedJson.priorityReason && typeof parsedJson.priorityReason === 'string' && parsedJson.priorityReason.trim()) {
    priorityReason = parsedJson.priorityReason.trim();
  }

  let summary = fallback.summary;
  if (parsedJson && parsedJson.summary && typeof parsedJson.summary === 'string' && parsedJson.summary.trim()) {
    summary = parsedJson.summary.trim();
  }

  let actionItems = fallback.actionItems;
  if (parsedJson && Array.isArray(parsedJson.actionItems) && parsedJson.actionItems.length > 0) {
    const cleaned = parsedJson.actionItems
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
    if (cleaned.length > 0) {
      actionItems = cleaned.slice(0, 5);
    }
  }

  return {
    suggestedCategory,
    suggestedPriority,
    priorityReason,
    confidence: 0.95,
    summary,
    actionItems,
    isAiGenerated: true,
    engine: 'gemini-2.5-flash',
    generatedAt: new Date(),
  };
};

/**
 * Main AI Analysis: Calls Google Gemini 2.5 Flash with structured JSON output
 * Guarantees fault-tolerance and fallback to heuristics if Gemini is unavailable.
 */
const analyzeComplaint = async ({ title = '', description = '', location = '' }) => {
  const safeTitle = typeof title === 'string' ? title.trim() : '';
  const safeDesc = typeof description === 'string' ? description.trim() : '';
  const safeLoc = typeof location === 'string' ? location.trim() : '';

  const fallback = analyzeWithHeuristics({
    title: safeTitle,
    description: safeDesc,
    location: safeLoc,
  });

  const client = getGeminiClient();
  if (!client) {
    return {
      status: 'COMPLETED',
      ...fallback,
    };
  }

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const prompt = `You are an AI assistant for a College Complaint Management System.
Analyze the following student grievance and return a JSON object.

Allowed Categories: ${JSON.stringify(CATEGORIES)}
Allowed Priorities: ${JSON.stringify(PRIORITIES)}

Student Grievance Details:
- Title: "${safeTitle}"
- Description: "${safeDesc}"
- Location: "${safeLoc}"

Respond strictly with a JSON object matching this schema:
{
  "suggestedCategory": "<Must be one of the Allowed Categories>",
  "suggestedPriority": "<Must be one of Low, Medium, High, Critical>",
  "summary": "<Concise 1-2 sentence executive summary for campus administrators>",
  "actionItems": [
    "<Actionable technical step 1>",
    "<Actionable technical step 2>",
    "<Actionable technical step 3>"
  ]
}`;

    const response = await client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedJson = JSON.parse(responseText);
    const sanitized = sanitizeGeminiResponse(parsedJson, fallback);

    return {
      status: 'COMPLETED',
      ...sanitized,
    };
  } catch (error) {
    // Log technical error safely on backend without revealing sensitive keys
    console.error('[AIService] Gemini API error (using fallback):', error.message);
    return {
      status: 'COMPLETED',
      ...fallback,
    };
  }
};

/**
 * Reusable function 1: Categorize Complaint
 */
const categorizeComplaint = async (title, description) => {
  const result = await analyzeComplaint({ title, description });
  return result.suggestedCategory;
};

/**
 * Reusable function 2: Suggest Priority
 */
const suggestPriority = async (title, description, category = '') => {
  const result = await analyzeComplaint({ title, description, location: category });
  return result.suggestedPriority;
};

/**
 * Reusable function 3: Summarize Complaint
 */
const summarizeComplaint = async (title, description) => {
  const result = await analyzeComplaint({ title, description });
  return result.summary;
};

/**
 * Reusable function 4: Extract Action Items
 */
const extractActionItems = async (title, description) => {
  const result = await analyzeComplaint({ title, description });
  return result.actionItems;
};

module.exports = {
  analyzeComplaint,
  categorizeComplaint,
  suggestPriority,
  summarizeComplaint,
  extractActionItems,
  analyzeWithHeuristics,
  getGeminiClient,
};
