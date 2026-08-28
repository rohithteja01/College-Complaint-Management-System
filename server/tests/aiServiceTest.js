const dotenv = require('dotenv');
dotenv.config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const aiRoutes = require('../routes/aiRoutes');
const devAuthRoutes = require('../routes/devAuthRoutes');
const { Complaint } = require('../models/Complaint');
const { Department } = require('../models/Department');
const aiService = require('../services/aiService');

// Setup test Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dev', devAuthRoutes);

let mongod;
let server;
let baseUrl;
let studentToken;
let adminToken;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Google Gemini 2.5 Flash AI Service Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'gemini_ai_test_db' },
      spawn: { startupTimeout: 120000 },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('✅ Connected to Test Database\n');

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`✅ Test server running on ${baseUrl}\n`);
        resolve();
      });
    });

    let testsPassed = 0;
    let testsTotal = 0;

    const assert = (condition, description) => {
      testsTotal++;
      if (condition) {
        testsPassed++;
        console.log(`  ✓ PASS: ${description}`);
      } else {
        console.error(`  ✗ FAIL: ${description}`);
      }
    };

    await Department.seedDefaultsIfEmpty();

    // Authenticate dev student & admin
    const sRes = await fetch(`${baseUrl}/api/dev/student`);
    const sData = await sRes.json();
    studentToken = sData.token;

    const aRes = await fetch(`${baseUrl}/api/dev/admin`);
    const aData = await aRes.json();
    adminToken = aData.token;

    // SCENARIO 1: Verify Environment Variable Loading & Client Init
    console.log('--- Scenario 1: Environment Variables & Gemini Client Initialization ---');
    assert(process.env.GEMINI_API_KEY !== undefined, 'GEMINI_API_KEY is loaded from environment');
    assert(typeof process.env.GEMINI_API_KEY === 'string', 'GEMINI_API_KEY is a valid string');
    const client = aiService.getGeminiClient();
    assert(client !== null, 'Gemini client initializes successfully with configured key');

    // SCENARIO 2: Reusable Individual AI Helper Functions
    console.log('\n--- Scenario 2: Reusable Individual AI Functions ---');
    const catResult = await aiService.categorizeComplaint(
      'Wi-Fi router in Library 2nd floor dropping connection',
      'Students are unable to access digital catalog.'
    );
    assert(catResult === 'Wi-Fi' || catResult === 'Library', `categorizeComplaint returns valid category (got ${catResult})`);

    const priResult = await aiService.suggestPriority(
      'Electric sparks and smoke coming from circuit breaker',
      'Immediate hazard in Physics Lab 2',
      'Electricity'
    );
    assert(priResult === 'Critical' || priResult === 'High', `suggestPriority returns Critical/High for hazard (got ${priResult})`);

    const summaryResult = await aiService.summarizeComplaint(
      'Air conditioner leaking water onto computer workstations',
      'Water droplets falling directly on PC units in Lab 4.'
    );
    assert(typeof summaryResult === 'string' && summaryResult.length > 10, 'summarizeComplaint returns descriptive summary');

    const actionResult = await aiService.extractActionItems(
      'Broken window latch in Hostel Room 302',
      'Window slams loudly during wind and does not lock.'
    );
    assert(Array.isArray(actionResult) && actionResult.length >= 2, `extractActionItems returns actionable array (got ${actionResult.length} items)`);

    // SCENARIO 3: Unified Single-Request AI Analysis
    console.log('\n--- Scenario 3: Unified Structured Single-Request AI Analysis ---');
    const fullAnalysis = await aiService.analyzeComplaint({
      title: 'Water pipe leaking under washbasin in Biotech Block',
      description: 'Clean drinking water is overflowing onto the floor.',
      location: 'Biotech Block 1st Floor',
    });
    assert(fullAnalysis.suggestedCategory === 'Water', `Unified analysis identifies category (got ${fullAnalysis.suggestedCategory})`);
    assert(fullAnalysis.suggestedPriority !== undefined, 'Unified analysis suggests priority');
    assert(typeof fullAnalysis.summary === 'string', 'Unified analysis generates summary');
    assert(Array.isArray(fullAnalysis.actionItems) && fullAnalysis.actionItems.length > 0, 'Unified analysis extracts action items');
    assert(fullAnalysis.isAiGenerated === true, 'Flagged as AI generated');

    // SCENARIO 4: Dedicated API Endpoint POST /api/ai/analyze-complaint
    console.log('\n--- Scenario 4: Dedicated API Endpoint POST /api/ai/analyze-complaint ---');
    // Unauthenticated guard
    const unauthRes = await fetch(`${baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    });
    assert(unauthRes.status === 401, `Unauthenticated request returns 401 Unauthorized (got ${unauthRes.status})`);

    // Missing input validation
    const emptyRes = await fetch(`${baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ title: '', description: '' }),
    });
    assert(emptyRes.status === 400, `Empty input returns 400 Bad Request (got ${emptyRes.status})`);

    // Valid authenticated analysis
    const validAiRes = await fetch(`${baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Projector in Seminar Hall 1 has dim display and color distortion',
        description: 'Unable to read presentation slides clearly during seminars.',
        location: 'Seminar Hall 1',
      }),
    });
    const validAiData = await validAiRes.json();
    assert(validAiRes.status === 200, `Authenticated AI analysis returns 200 OK (got ${validAiRes.status})`);
    assert(validAiData.data.suggestedCategory === 'Classroom', `Category suggestion matches Classroom (got ${validAiData.data.suggestedCategory})`);
    assert(validAiData.data.actionItems.length > 0, 'Action items returned');

    // SCENARIO 5: Complaint Creation & Isolated Metadata Persistence
    console.log('\n--- Scenario 5: Complaint Creation & Isolated Storage ---');
    const createRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Power outage in Room 405 affecting lecture',
        description: 'No electricity in Room 405 switchboard.',
        category: 'Electricity',
        priority: 'Medium',
        location: 'Block C Room 405',
      }),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201, `Complaint created with 201 Created (got ${createRes.status})`);
    const doc = createData.complaint;
    assert(doc.category === 'Electricity', 'Original student category is preserved');
    assert(doc.priority === 'Medium', 'Original student priority is preserved');
    assert(doc.status === 'Submitted', 'Initial status is strictly Submitted (non-destructive)');
    assert(doc.assignedStaff === null, 'Staff is not automatically assigned');
    assert(doc.aiAnalysis !== undefined, 'aiAnalysis subdocument is attached');

    // SCENARIO 6: Missing API Key & Error Resilience Simulation
    console.log('\n--- Scenario 6: Fault Tolerance (Missing Key / API Failure) ---');
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY; // simulate missing key

    const fallbackResult = await aiService.analyzeComplaint({
      title: 'Hostel Wi-Fi not connecting in Wing B',
      description: 'Slow net connection and frequent disconnects.',
      location: 'Wing B',
    });

    assert(fallbackResult.suggestedCategory === 'Wi-Fi', `Fallback engine smoothly suggests category without API key (got ${fallbackResult.suggestedCategory})`);
    assert(fallbackResult.actionItems.length > 0, 'Fallback engine returns valid action items');
    assert(fallbackResult.status === 'COMPLETED', 'Status is COMPLETED');

    // Restore key
    process.env.GEMINI_API_KEY = originalKey;

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL GEMINI 2.5 FLASH AI INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running Gemini tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
