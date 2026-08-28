const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const devAuthRoutes = require('../routes/devAuthRoutes');
const { Department } = require('../models/Department');

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

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Development Mode Authentication Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'dev_auth_test_db' },
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

    // SCENARIO 1: Dev Student Session Initialization
    console.log('--- Scenario 1: Dev Student Session Initialization ---');
    const studentRes = await fetch(`${baseUrl}/api/dev/student`);
    const studentData = await studentRes.json();
    assert(studentRes.status === 200, `Dev student returns 200 OK (got ${studentRes.status})`);
    assert(studentData.user?.role === 'student', 'User role is student');
    assert(studentData.user?.email === 'dev.student@college.edu', 'Student email is seeded correctly');
    assert(studentData.token !== undefined && studentData.token.length > 20, 'Valid JWT token returned for student');

    // Verify token authenticates with student routes
    const studentMyRes = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${studentData.token}` },
    });
    assert(studentMyRes.status === 200, 'Dev student token successfully accesses GET /api/complaints/my');

    // SCENARIO 2: Dev Admin Session Initialization
    console.log('\n--- Scenario 2: Dev Admin Session Initialization ---');
    const adminRes = await fetch(`${baseUrl}/api/dev/admin`);
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, `Dev admin returns 200 OK (got ${adminRes.status})`);
    assert(adminData.user?.role === 'admin', 'User role is admin');
    assert(adminData.user?.email === 'dev.admin@college.edu', 'Admin email is seeded correctly');
    assert(adminData.token !== undefined && adminData.token.length > 20, 'Valid JWT token returned for admin');

    // Verify token authenticates with admin routes
    const adminStatsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    assert(adminStatsRes.status === 200, 'Dev admin token successfully accesses GET /api/admin/stats');

    // SCENARIO 3: Production Security Lockdown Simulation
    console.log('\n--- Scenario 3: Production Lockdown Simulation ---');
    process.env.NODE_ENV = 'production';
    const prodStudentRes = await fetch(`${baseUrl}/api/dev/student`);
    assert(prodStudentRes.status === 404, `In production mode, /api/dev/student returns 404 Not Found (got ${prodStudentRes.status})`);
    process.env.NODE_ENV = 'development'; // reset to dev

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL DEV AUTHENTICATION TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running dev auth tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
