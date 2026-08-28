const dotenv = require('dotenv');
dotenv.config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const devAuthRoutes = require('../routes/devAuthRoutes');
const { Complaint } = require('../models/Complaint');
const { Department } = require('../models/Department');
const duplicateDetectionService = require('../services/duplicateDetectionService');

// Setup test Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dev', devAuthRoutes);

let mongod;
let server;
let baseUrl;
let studentToken;
let studentUser;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Duplicate Complaint Detection Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'dup_detection_test_db' },
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

    // Authenticate dev student
    const sRes = await fetch(`${baseUrl}/api/dev/student`);
    const sData = await sRes.json();
    studentToken = sData.token;
    studentUser = sData.user;

    // Seed test complaints in DB
    // 1. Active Electricity complaint in Room 302
    const activeComplaint1 = await Complaint.create({
      title: 'Ceiling fan making squeaking noise in Room 302',
      description: 'Fan in the front row is loose and makes continuous loud sound.',
      category: 'Electricity',
      location: 'Block B Room 302',
      priority: 'Medium',
      student: studentUser.id,
      status: 'In Progress',
    });

    // 2. Active Wi-Fi complaint in Library
    const activeComplaint2 = await Complaint.create({
      title: 'Wi-Fi router down in Library reading hall',
      description: 'Cannot connect to campus wifi from 2nd floor library.',
      category: 'Wi-Fi',
      location: 'Central Library 2nd Floor',
      priority: 'High',
      student: studentUser.id,
      status: 'Under Review',
    });

    // 3. Resolved Water complaint (should NOT be detected as active duplicate)
    const resolvedComplaint = await Complaint.create({
      title: 'Water leaking from washbasin tap',
      description: 'Tap was leaking water on the floor.',
      category: 'Water',
      location: 'Block A 1st Floor Washroom',
      priority: 'Low',
      student: studentUser.id,
      status: 'Resolved',
      resolvedAt: new Date(),
    });

    // SCENARIO 1: Direct Service Detection of Similar Active Grievance
    console.log('--- Scenario 1: Direct Duplicate Detection Algorithm ---');
    const matches1 = await duplicateDetectionService.findSimilarComplaints({
      title: 'Broken ceiling fan in Room 302',
      description: 'Fan is not working properly in Room 302.',
      category: 'Electricity',
      location: 'Block B Room 302',
    });

    assert(matches1.length > 0, `Identifies existing active duplicate (found ${matches1.length})`);
    assert(matches1[0].complaintId === activeComplaint1.complaintId, 'Matched correct complaint ID');
    assert(matches1[0].similarityScore >= 0.50, `Calculates significant similarity score (${matches1[0].similarityScore})`);

    // SCENARIO 2: Exclusion of Resolved and Closed Complaints
    console.log('\n--- Scenario 2: Exclusion of Resolved / Closed Cases ---');
    const matchesResolved = await duplicateDetectionService.findSimilarComplaints({
      title: 'Water leaking from washbasin tap',
      description: 'Tap is leaking water on the floor.',
      category: 'Water',
      location: 'Block A 1st Floor Washroom',
    });
    assert(matchesResolved.length === 0, 'Resolved grievances are excluded from duplicate alerts');

    // SCENARIO 3: Distinct / Unrelated Complaints Yield No Duplicates
    console.log('\n--- Scenario 3: Distinct Grievance Produces No False Positives ---');
    const matchesDistinct = await duplicateDetectionService.findSimilarComplaints({
      title: 'Projector remote missing in Seminar Hall',
      description: 'Need projector remote for CS departmental presentation.',
      category: 'Classroom',
      location: 'Seminar Hall 4',
    });
    assert(matchesDistinct.length === 0, 'Distinct grievance returns 0 duplicate matches');

    // SCENARIO 4: Endpoint POST /api/complaints/check-duplicates
    console.log('\n--- Scenario 4: Endpoint POST /api/complaints/check-duplicates ---');
    const apiDupRes = await fetch(`${baseUrl}/api/complaints/check-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Library 2nd floor wifi router not connecting',
        description: 'Unable to connect to campus wifi in library.',
        category: 'Wi-Fi',
        location: 'Central Library 2nd Floor',
      }),
    });

    const apiDupData = await apiDupRes.json();
    assert(apiDupRes.status === 200, `API check-duplicates returns 200 OK (got ${apiDupRes.status})`);
    assert(apiDupData.hasDuplicates === true, 'hasDuplicates flag is true');
    assert(apiDupData.duplicates.length >= 1, `Returns duplicate items (got ${apiDupData.duplicates.length})`);
    assert(apiDupData.duplicates[0].complaintId === activeComplaint2.complaintId, 'Identifies Library Wi-Fi active ticket');

    // SCENARIO 5: Non-Blocking Submission
    console.log('\n--- Scenario 5: Non-Blocking Submission (Student Choice) ---');
    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Ceiling fan not rotating in Room 302',
        description: 'Fan issue persists in Room 302.',
        category: 'Electricity',
        location: 'Block B Room 302',
        priority: 'Medium',
      }),
    });

    assert(submitRes.status === 201, `Student can proceed to submit new complaint (got ${submitRes.status})`);
    const newComplaint = (await submitRes.json()).complaint;
    assert(newComplaint.complaintId !== undefined, 'New unique complaint ID generated');
    assert(newComplaint.status === 'Submitted', 'New complaint registered as Submitted');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL DUPLICATE DETECTION TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running duplicate detection tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
