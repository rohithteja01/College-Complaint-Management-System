const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// Setup test Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let mongod;
let server;
let baseUrl;

// Helper to make fetch requests
const request = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Authentication & Authorization Tests');
  console.log('====================================================\n');

  // Try local MONGO_URI if available, otherwise launch MongoMemoryServer with extended timeout
  let dbUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
  let isMemory = false;

  try {
    if (dbUri) {
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`✅ Connected to MongoDB at ${dbUri}`);
    } else {
      throw new Error('No local MONGO_URI provided, fallback to memory server');
    }
  } catch (err) {
    console.log('ℹ️  Starting in-memory MongoDB runner (allocating test instance)...');
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'college_complaint_test_db',
      },
      spawn: {
        startupTimeout: 120000,
      },
    });
    dbUri = mongod.getUri();
    await mongoose.connect(dbUri);
    isMemory = true;
    console.log('✅ In-memory MongoDB connected successfully');
  }

  // Clear previous test users
  await User.deleteMany({});

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

  try {
    // TEST 1: Student Registration (Valid)
    console.log('--- Scenario 1: Student Registration ---');
    const studentPayload = {
      fullName: 'Alice Johnson',
      email: 'alice.johnson@college.edu',
      studentId: 'CS2026-101',
      department: 'Computer Science & Engineering',
      password: 'password123',
    };
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: studentPayload,
    });
    assert(regRes.status === 201, `Status code is 201 Created (got ${regRes.status})`);
    assert(regRes.data?.token !== undefined, 'JWT token returned on registration');
    assert(regRes.data?.role === 'student', 'User role defaults to "student"');
    assert(regRes.data?.user?.email === 'alice.johnson@college.edu', 'User email returned correctly');
    assert(regRes.data?.user?.studentId === 'CS2026-101', 'Student ID normalized to uppercase');
    assert(regRes.data?.user?.password === undefined, 'Password is NOT exposed in response');

    // Verify hashed password in DB
    const dbUser = await User.findOne({ email: 'alice.johnson@college.edu' }).select('+password');
    assert(dbUser && dbUser.password !== 'password123', 'Password is cryptographically hashed in database');
    assert(dbUser && dbUser.password.startsWith('$2'), 'Password hash uses bcrypt format');

    // TEST 2: Validation on Missing Fields
    console.log('\n--- Scenario 2: Validation Rules ---');
    const missingRes = await request('/api/auth/register', {
      method: 'POST',
      body: { email: 'incomplete@college.edu', password: '123' },
    });
    assert(missingRes.status === 400, `Missing fields return 400 Bad Request (got ${missingRes.status})`);

    const invalidEmailRes = await request('/api/auth/register', {
      method: 'POST',
      body: { ...studentPayload, email: 'not-an-email', studentId: 'CS2026-102' },
    });
    assert(invalidEmailRes.status === 400, `Invalid email format returns 400 (got ${invalidEmailRes.status})`);

    const shortPassRes = await request('/api/auth/register', {
      method: 'POST',
      body: { ...studentPayload, email: 'short@college.edu', studentId: 'CS2026-103', password: '123' },
    });
    assert(shortPassRes.status === 400, `Short password (< 6 chars) returns 400 (got ${shortPassRes.status})`);

    // TEST 3: Duplicate Email Check
    console.log('\n--- Scenario 3: Duplicate Prevention ---');
    const dupEmailRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Alice Clone',
        email: 'alice.johnson@college.edu', // Duplicate email
        studentId: 'CS2026-999',
        department: 'Information Technology',
        password: 'password123',
      },
    });
    assert(dupEmailRes.status === 400, `Duplicate email returns 400 Bad Request (got ${dupEmailRes.status})`);
    assert(dupEmailRes.data?.message.includes('email'), 'Error message mentions duplicate email');

    // TEST 4: Duplicate Student ID Check
    const dupIdRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Bob Smith',
        email: 'bob.smith@college.edu',
        studentId: 'CS2026-101', // Duplicate student ID
        department: 'Information Technology',
        password: 'password123',
      },
    });
    assert(dupIdRes.status === 400, `Duplicate studentId returns 400 Bad Request (got ${dupIdRes.status})`);
    assert(dupIdRes.data?.message.includes('Student ID'), 'Error message mentions duplicate Student ID');

    // TEST 5: Successful Login
    console.log('\n--- Scenario 4: User Login ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alice.johnson@college.edu',
        password: 'password123',
      },
    });
    assert(loginRes.status === 200, `Login returns 200 OK (got ${loginRes.status})`);
    assert(loginRes.data?.token !== undefined, 'Login returns JWT token');
    assert(loginRes.data?.role === 'student', 'Login returns correct role');
    assert(loginRes.data?.user?.fullName === 'Alice Johnson', 'Login returns user profile');
    assert(loginRes.data?.user?.password === undefined, 'Password is NOT exposed in login response');

    const studentToken = loginRes.data.token;

    // TEST 6: Invalid Login Credentials
    console.log('\n--- Scenario 5: Invalid Credentials ---');
    const wrongPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alice.johnson@college.edu',
        password: 'wrongpassword',
      },
    });
    assert(wrongPassRes.status === 401, `Wrong password returns 401 Unauthorized (got ${wrongPassRes.status})`);

    const nonExistentRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'unknown@college.edu',
        password: 'password123',
      },
    });
    assert(nonExistentRes.status === 401, `Non-existent email returns 401 Unauthorized (got ${nonExistentRes.status})`);

    // TEST 7: Protected Route Access (/api/auth/me)
    console.log('\n--- Scenario 6: Protected Route Access ---');
    const noTokenRes = await request('/api/auth/me');
    assert(noTokenRes.status === 401, `Access without token returns 401 Unauthorized (got ${noTokenRes.status})`);

    const invalidTokenRes = await request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    assert(invalidTokenRes.status === 401, `Access with invalid token returns 401 Unauthorized (got ${invalidTokenRes.status})`);

    const validMeRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(validMeRes.status === 200, `Access with valid student token returns 200 OK (got ${validMeRes.status})`);
    assert(validMeRes.data?.user?.fullName === 'Alice Johnson', 'Authenticated user profile retrieved');

    // TEST 8: Role Middleware Authorization
    console.log('\n--- Scenario 7: Role-Based Authorization ---');
    // Student accessing student route -> 200 OK
    const studentAccessRes = await request('/api/auth/student-only', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAccessRes.status === 200, `Student accessing /student-only returns 200 OK (got ${studentAccessRes.status})`);

    // Student accessing admin route -> 403 Forbidden
    const studentDeniedAdminRes = await request('/api/auth/admin-only', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDeniedAdminRes.status === 403, `Student accessing /admin-only returns 403 Forbidden (got ${studentDeniedAdminRes.status})`);

    // Create an admin user directly for test verification
    const adminUser = await User.create({
      fullName: 'Dr. Robert Vance',
      email: 'admin.vance@college.edu',
      studentId: 'ADMIN-001',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(adminUser._id, 'admin');

    // Admin accessing admin route -> 200 OK
    const adminAccessRes = await request('/api/auth/admin-only', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAccessRes.status === 200, `Admin accessing /admin-only returns 200 OK (got ${adminAccessRes.status})`);

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL AUTHENTICATION & ROLE TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unexpected error running tests:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
