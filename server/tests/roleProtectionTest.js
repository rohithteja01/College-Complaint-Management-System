/**
 * Strict Role-Based Route & API Protection Test Suite
 * Tests 403 Forbidden enforcement on all administrative endpoints for student tokens,
 * data ownership privacy between students, and authorized access for admin tokens.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const devAuthRoutes = require('../routes/devAuthRoutes');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const { generateToken } = require('../utils/jwt');

// Setup test Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dev', devAuthRoutes);

let mongod;
let server;
let baseUrl;

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

const runRoleProtectionTests = async () => {
  let passed = 0;
  let total = 0;

  const assert = (condition, message) => {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  };

  console.log('\n====================================================');
  console.log('🧪 Starting Strict Role-Based Protection Tests');
  console.log('====================================================\n');

  try {
    let dbUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
    let isMemory = false;

    try {
      if (!dbUri) {
        mongod = await MongoMemoryServer.create();
        dbUri = mongod.getUri();
        isMemory = true;
      }
      await mongoose.connect(dbUri);
      console.log(`✅ Connected to ${isMemory ? 'In-Memory Test Database' : 'Database'}`);
    } catch (e) {
      if (!isMemory) {
        mongod = await MongoMemoryServer.create();
        dbUri = mongod.getUri();
        await mongoose.connect(dbUri);
        console.log('✅ Connected to In-Memory Fallback Test Database');
      }
    }

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`✅ Test server running on ${baseUrl}\n`);

    // Clean up test collections
    await User.deleteMany({ email: /@test-role.edu$/ });
    await Complaint.deleteMany({ location: /RoleTest/ });

    // Seed Student A
    const studentA = await User.create({
      fullName: 'Alice Student',
      email: 'alice.student@test-role.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-ROLE-001',
      department: 'Computer Science',
    });
    const tokenStudentA = generateToken(studentA._id, studentA.role);

    // Seed Student B
    const studentB = await User.create({
      fullName: 'Bob Student',
      email: 'bob.student@test-role.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-ROLE-002',
      department: 'Mechanical',
    });
    const tokenStudentB = generateToken(studentB._id, studentB.role);

    // Seed Admin
    const adminUser = await User.create({
      fullName: 'Admin User',
      email: 'admin.user@test-role.edu',
      password: 'password123',
      role: 'admin',
      department: 'Administration',
    });
    const tokenAdmin = generateToken(adminUser._id, adminUser.role);

    // Seed Complaint for Student A
    const complaintA = await Complaint.create({
      complaintId: 'CMP-ROLE-00001',
      student: studentA._id,
      title: 'Broken projector in Lab 201',
      category: 'Laboratory',
      location: 'Block A, Lab 201 [RoleTest]',
      description: 'The overhead projector does not turn on.',
      priority: 'Medium',
      status: 'Submitted',
    });

    console.log('--- Scenario 1: Unauthenticated Endpoint Protection (401 Unauthorized) ---');
    const unauthStats = await request('/api/admin/stats');
    assert(unauthStats.status === 401, 'Unauthenticated access to /api/admin/stats returns 401 (got ' + unauthStats.status + ')');

    const unauthMy = await request('/api/complaints/my');
    assert(unauthMy.status === 401, 'Unauthenticated access to /api/complaints/my returns 401 (got ' + unauthMy.status + ')');

    console.log('\n--- Scenario 2: Student Blocked from Administrative APIs (403 Forbidden) ---');
    const sStats = await request('/api/admin/stats', { headers: { Authorization: `Bearer ${tokenStudentA}` } });
    assert(sStats.status === 403, 'Student calling GET /api/admin/stats blocked with 403 Forbidden (got ' + sStats.status + ')');

    const sComplaints = await request('/api/admin/complaints', { headers: { Authorization: `Bearer ${tokenStudentA}` } });
    assert(sComplaints.status === 403, 'Student calling GET /api/admin/complaints blocked with 403 Forbidden (got ' + sComplaints.status + ')');

    const sAnalytics = await request('/api/admin/analytics', { headers: { Authorization: `Bearer ${tokenStudentA}` } });
    assert(sAnalytics.status === 403, 'Student calling GET /api/admin/analytics blocked with 403 Forbidden (got ' + sAnalytics.status + ')');

    const sDepartments = await request('/api/admin/departments', { headers: { Authorization: `Bearer ${tokenStudentA}` } });
    assert(sDepartments.status === 403, 'Student calling GET /api/admin/departments blocked with 403 Forbidden (got ' + sDepartments.status + ')');

    const sStaff = await request('/api/admin/staff', { headers: { Authorization: `Bearer ${tokenStudentA}` } });
    assert(sStaff.status === 403, 'Student calling GET /api/admin/staff blocked with 403 Forbidden (got ' + sStaff.status + ')');

    const sStatusPatch = await request(`/api/admin/complaints/${complaintA._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
      body: { status: 'Resolved' },
    });
    assert(sStatusPatch.status === 403, 'Student calling PATCH /api/admin/complaints/:id/status blocked with 403 Forbidden (got ' + sStatusPatch.status + ')');

    const sAssignPatch = await request(`/api/admin/complaints/${complaintA._id}/assign`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
      body: { departmentId: '123' },
    });
    assert(sAssignPatch.status === 403, 'Student calling PATCH /api/admin/complaints/:id/assign blocked with 403 Forbidden (got ' + sAssignPatch.status + ')');

    console.log('\n--- Scenario 3: Cross-Student Data Privacy & Ownership Isolation ---');
    // Student B attempts to access Student A's complaint
    const bViewsA = await request(`/api/complaints/${complaintA.complaintId}`, {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    assert(bViewsA.status === 403, 'Student B accessing Student A complaint blocked with 403 Forbidden (got ' + bViewsA.status + ')');

    // Student B attempts to access Student A's updates
    const bViewsAUpdates = await request(`/api/complaints/${complaintA.complaintId}/updates`, {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    assert(bViewsAUpdates.status === 403, 'Student B accessing Student A updates blocked with 403 Forbidden (got ' + bViewsAUpdates.status + ')');

    // Student A accesses their own complaint
    const aViewsA = await request(`/api/complaints/${complaintA.complaintId}`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(aViewsA.status === 200, 'Student A successfully accesses their own complaint (got 200)');
    assert(aViewsA.data?.complaint?.complaintId === complaintA.complaintId, 'Returned correct complaint ID');

    // Student A queries GET /api/complaints (must return only their own complaints)
    const aList = await request('/api/complaints', {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(aList.status === 200, 'Student A calling GET /api/complaints returns 200 (got 200)');
    assert(aList.data?.complaints?.length === 1, 'Student A list contains exactly 1 complaint (found ' + aList.data?.complaints?.length + ')');

    // Student B queries GET /api/complaints (must return 0 complaints, never Student A's)
    const bList = await request('/api/complaints', {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    assert(bList.status === 200, 'Student B calling GET /api/complaints returns 200 (got 200)');
    assert(bList.data?.complaints?.length === 0, 'Student B list is empty (found ' + bList.data?.complaints?.length + ')');

    console.log('\n--- Scenario 4: Admin Privileged Universal Access ---');
    const aStats = await request('/api/admin/stats', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(aStats.status === 200, 'Admin successfully accesses GET /api/admin/stats (got 200)');

    const aComplaints = await request('/api/admin/complaints', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(aComplaints.status === 200, 'Admin successfully accesses GET /api/admin/complaints (got 200)');

    const aAnalytics = await request('/api/admin/analytics', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(aAnalytics.status === 200, 'Admin successfully accesses GET /api/admin/analytics (got 200)');

    const aDepartments = await request('/api/admin/departments', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(aDepartments.status === 200, 'Admin successfully accesses GET /api/admin/departments (got 200)');

    const aStaff = await request('/api/admin/staff', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    assert(aStaff.status === 200, 'Admin successfully accesses GET /api/admin/staff (got 200)');

    // Admin accesses student complaint via standard endpoint
    const adminViewsStudentComplaint = await request(`/api/complaints/${complaintA.complaintId}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminViewsStudentComplaint.status === 200, 'Admin successfully accesses student complaint via standard /api/complaints/:id (got 200)');

    // Admin accesses student complaint via admin route
    const adminViewsComplaint = await request(`/api/admin/complaints/${complaintA._id}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminViewsComplaint.status === 200, 'Admin successfully accesses complaint details via admin route (got 200)');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed}/${total} assertions passed`);
    console.log('====================================================\n');

    if (passed === total) {
      console.log('🎉 ALL STRICT ROLE-BASED PROTECTION TESTS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Test execution exception:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
};

if (require.main === module) {
  runRoleProtectionTests();
}

module.exports = runRoleProtectionTests;
