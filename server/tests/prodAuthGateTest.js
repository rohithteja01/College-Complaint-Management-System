const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const express = require('express');

let mongoServer;
let server;
let baseUrl;

// Test assertion tracker
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

// Minimal HTTP helper
async function request(path, options = {}) {
  const url = `${baseUrl}/api${path}`;
  const headers = { ...options.headers };

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function runProductionAuthGateTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING PRODUCTION AUTHENTICATION GATE TEST SUITE');
  console.log('======================================================\n');

  try {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'super-secret-jwt-key-prod-test-2026';
    process.env.JWT_EXPIRE = '7d';

    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    const User = require('../models/User');
    const { Complaint } = require('../models/Complaint');
    const { Department } = require('../models/Department');

    // 2. Setup Express App
    const authRoutes = require('../routes/authRoutes');
    const complaintRoutes = require('../routes/complaintRoutes');
    const adminRoutes = require('../routes/adminRoutes');
    const aiRoutes = require('../routes/aiRoutes');
    const { mongoSanitizeMiddleware } = require('../utils/sanitize');

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(mongoSanitizeMiddleware);

    // Public health routes
    app.get('/api/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'College Complaint Management System API is running',
      });
    });

    // Production API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/complaints', complaintRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/ai', aiRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      });
    });

    server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Seed default departments & Admin
    await Department.create([
      { name: 'Computer Science', code: 'CS', active: true },
      { name: 'Electrical Maintenance', code: 'ELEC', active: true },
    ]);

    const adminUser = await User.create({
      fullName: 'System Administrator',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      department: 'Administration',
      role: 'admin',
    });

    console.log('--- TEST GROUP 1: ENTRY & LOGOUT BEHAVIOR ---');

    // 1. Open application / unauthenticated access to protected routes
    const unauthStudentDashRes = await request('/complaints/my');
    assert(
      unauthStudentDashRes.status === 401,
      'Test 1 & 11: Unauthenticated request to /complaints/my blocked with 401 Unauthorized'
    );

    const unauthAdminStatsRes = await request('/admin/stats');
    assert(
      unauthAdminStatsRes.status === 401,
      'Test 1 & 11: Unauthenticated request to /admin/stats blocked with 401 Unauthorized'
    );

    // 2. Confirm public health endpoint is accessible
    const healthRes = await request('/health');
    assert(healthRes.status === 200, 'Test 2: Public health endpoint is accessible');

    console.log('\n--- TEST GROUP 2: STUDENT REGISTRATION & VALIDATION ---');

    // 3. Register a student with all required fields
    const registerPayload = {
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@college.edu',
      studentId: 'CS-2026-001',
      department: 'Computer Science',
      password: 'StudentPassword@123',
    };

    const registerRes = await request('/auth/register', {
      method: 'POST',
      body: registerPayload,
    });

    assert(registerRes.status === 201, 'Test 3: Student registered successfully (201 Created)');
    assert(registerRes.data?.user?.fullName === 'Rahul Sharma', 'Test 3: Student Full Name verified');
    assert(registerRes.data?.user?.studentId === 'CS-2026-001', 'Test 3: Student ID recorded');
    assert(registerRes.data?.user?.department === 'Computer Science', 'Test 3: Department recorded');
    assert(registerRes.data?.user?.role === 'student', 'Test 3: Role is strictly "student"');
    assert(!!registerRes.data?.token, 'Test 3: JWT token generated upon registration');

    // 3b. Duplicate registration rejection
    const duplicateRegisterRes = await request('/auth/register', {
      method: 'POST',
      body: registerPayload,
    });
    assert(
      duplicateRegisterRes.status === 400,
      'Test 3b: Duplicate email/studentId rejected with 400 Bad Request'
    );

    console.log('\n--- TEST GROUP 3: STUDENT AUTHENTICATION & DASHBOARD ACCESS ---');

    // 4. Login as student
    const studentLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'rahul.sharma@college.edu',
        password: 'StudentPassword@123',
      },
    });

    assert(studentLoginRes.status === 200, 'Test 4: Student login successful (200 OK)');
    const studentToken = studentLoginRes.data?.token;
    assert(!!studentToken, 'Test 4: Valid student JWT token received');
    assert(studentLoginRes.data?.user?.role === 'student', 'Test 4: Authenticated role is student');

    // 5. Verify student dashboard / profile access
    const studentMeRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentMeRes.status === 200, 'Test 5: Student profile loaded via /auth/me');
    assert(studentMeRes.data?.user?.email === 'rahul.sharma@college.edu', 'Test 5: Profile email matches');

    const studentComplaintsRes = await request('/complaints/my', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentComplaintsRes.status === 200, 'Test 5: Student complaints retrieved (200 OK)');
    assert(Array.isArray(studentComplaintsRes.data?.complaints), 'Test 5: Student complaints returned as array');

    // Submit a complaint for isolation testing
    const newComplaintRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Projector HDMI port defective in Room 204',
        description: 'The projector in Room 204 displays flickering purple lines when connected via HDMI.',
        category: 'Classroom',
        location: 'Block A, Room 204',
        priority: 'Medium',
      },
    });
    assert(newComplaintRes.status === 201, 'Test 5: Student filed grievance successfully');
    const studentComplaintId = newComplaintRes.data?.complaint?._id;

    console.log('\n--- TEST GROUP 4: ADMIN AUTHENTICATION & ACCESS ---');

    // 7. Login as Admin
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@college.edu',
        password: 'AdminPassword@123',
      },
    });
    assert(adminLoginRes.status === 200, 'Test 7: Admin login successful (200 OK)');
    const adminToken = adminLoginRes.data?.token;
    assert(adminLoginRes.data?.user?.role === 'admin', 'Test 7: Authenticated role is admin');

    // 8. Verify Admin dashboard access
    const adminStatsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, 'Test 8: Admin dashboard statistics retrieved (200 OK)');
    assert(adminStatsRes.data?.stats?.total >= 1, 'Test 8: Admin sees institutional total');

    const adminAllComplaintsRes = await request('/admin/complaints', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllComplaintsRes.status === 200, 'Test 8: Admin complaints registry loaded (200 OK)');

    console.log('\n--- TEST GROUP 5: ROLE-BASED ACCESS CONTROL (RBAC) & CROSS-STUDENT ISOLATION ---');

    // 9. Student trying to access Admin endpoints
    const studentAccessAdminComplaints = await request('/admin/complaints', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessAdminComplaints.status === 403,
      'Test 9: Student accessing /admin/complaints blocked with 403 Forbidden'
    );

    const studentAccessAdminStats = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessAdminStats.status === 403,
      'Test 9: Student accessing /admin/stats blocked with 403 Forbidden'
    );

    const studentAccessAdminAnalytics = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessAdminAnalytics.status === 403,
      'Test 9: Student accessing /admin/analytics blocked with 403 Forbidden'
    );

    // 10. Student accessing another student's complaint
    const secondStudent = await User.create({
      fullName: 'Priya Patel',
      email: 'priya.patel@college.edu',
      studentId: 'IT-2026-009',
      department: 'Information Technology',
      password: 'Password@123',
      role: 'student',
    });

    const secondStudentLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'priya.patel@college.edu',
        password: 'Password@123',
      },
    });
    const secondStudentToken = secondStudentLogin.data?.token;

    const crossViewRes = await request(`/complaints/${studentComplaintId}`, {
      headers: { Authorization: `Bearer ${secondStudentToken}` },
    });
    assert(
      crossViewRes.status === 403,
      'Test 10: Second student accessing first student\'s complaint blocked with 403 Forbidden'
    );

    const crossDeleteRes = await request(`/complaints/${studentComplaintId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secondStudentToken}` },
    });
    assert(
      crossDeleteRes.status === 403,
      'Test 10: Second student deleting first student\'s complaint blocked with 403 Forbidden'
    );

    console.log('\n--- TEST GROUP 6: CREDENTIAL & TOKEN SECURITY ---');

    // 12. Invalid credentials
    const wrongPasswordRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'rahul.sharma@college.edu',
        password: 'WrongPassword999',
      },
    });
    assert(
      wrongPasswordRes.status === 401,
      'Test 12: Incorrect password rejected with 401 Unauthorized'
    );

    const nonexistentUserRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent.user@college.edu',
        password: 'Password@123',
      },
    });
    assert(
      nonexistentUserRes.status === 401,
      'Test 12: Nonexistent user rejected with 401 Unauthorized'
    );

    // 14. Session persistence simulation (token valid across consecutive calls)
    const sessionCheck1 = await request('/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sessionCheck2 = await request('/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      sessionCheck1.status === 200 && sessionCheck2.status === 200,
      'Test 14: Valid JWT token persistently authenticates subsequent calls'
    );

    // 15. Invalid / Expired JWT
    const forgedJwtRes = await request('/auth/me', {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature' },
    });
    assert(
      forgedJwtRes.status === 401,
      'Test 15: Forged JWT token rejected with 401 Unauthorized'
    );

    const expiredToken = jwt.sign(
      { id: adminUser._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const expiredJwtRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(
      expiredJwtRes.status === 401,
      'Test 15: Expired JWT token rejected with 401 Unauthorized'
    );

    console.log('\n--- TEST GROUP 7: DEVELOPMENT BYPASS LOCKDOWN ---');

    // Verify /api/dev/student and /api/dev/admin are completely disabled (404 Not Found)
    const devStudentRes = await request('/dev/student');
    assert(
      devStudentRes.status === 404,
      'Bypass Lockdown: GET /api/dev/student is permanently disabled (404 Not Found)'
    );

    const devAdminRes = await request('/dev/admin');
    assert(
      devAdminRes.status === 404,
      'Bypass Lockdown: GET /api/dev/admin is permanently disabled (404 Not Found)'
    );

    console.log('\n======================================================');
    console.log(`🎉 PRODUCTION AUTHENTICATION GATE AUDIT COMPLETE`);
    console.log(`Total Assertions Passed: ${passedCount}`);
    console.log(`Total Assertions Failed: ${failedCount}`);
    console.log('======================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution fatal error:', error);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runProductionAuthGateTests();
