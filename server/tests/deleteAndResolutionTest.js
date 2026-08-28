/**
 * Delete and Resolution Features Automated Test Suite
 * Tests soft-delete authorization & audit preservation, resolution message enforcement,
 * timeline lifecycle tracking, and cross-role privacy.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const { generateToken } = require('../utils/jwt');

// Setup test Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

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

const runDeleteAndResolutionTests = async () => {
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
  console.log('🧪 Starting Delete & Resolution Workflow Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create();
    const dbUri = mongod.getUri();
    await mongoose.connect(dbUri);
    console.log('✅ Connected to In-Memory Test Database\n');

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Seed Student A, Student B, and Admin
    const studentA = await User.create({
      fullName: 'Alice Student',
      email: 'alice@college.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-2026-001',
      department: 'Computer Science',
    });
    const tokenStudentA = generateToken(studentA._id, studentA.role);

    const studentB = await User.create({
      fullName: 'Bob Student',
      email: 'bob@college.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-2026-002',
      department: 'Mechanical',
    });
    const tokenStudentB = generateToken(studentB._id, studentB.role);

    const adminUser = await User.create({
      fullName: 'Dean of Facilities',
      email: 'dean.facilities@college.edu',
      password: 'password123',
      role: 'admin',
      department: 'Administration',
    });
    const tokenAdmin = generateToken(adminUser._id, adminUser.role);

    console.log('--- Scenario 1: Student Complaint Submission & List ---');
    // Student A submits a complaint
    const createRes = await request('/api/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
      body: {
        title: 'Broken projector in Lab 201',
        description: 'The overhead projector power module is unresponsive.',
        category: 'Laboratory',
        location: 'Block A, Lab 201',
        priority: 'High',
      },
    });
    assert(createRes.status === 201, 'Student A submits complaint (got 201)');
    const complaintIdA = createRes.data?.complaint?.complaintId;
    const complaintMongoIdA = createRes.data?.complaint?._id;

    // Student A retrieves list
    const listRes1 = await request('/api/complaints/my', {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(listRes1.status === 200, 'Student A retrieves my complaints list');
    assert(listRes1.data?.complaints?.length === 1, 'Contains 1 active complaint');

    console.log('\n--- Scenario 2: Student Delete Security & Cross-Student Isolation ---');
    // Student B attempts to delete Student A's complaint
    const unauthDeleteRes = await request(`/api/complaints/${complaintIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    assert(unauthDeleteRes.status === 403, 'Student B blocked from deleting Student A complaint with 403 Forbidden (got ' + unauthDeleteRes.status + ')');

    // Student attempts to resolve complaint directly
    const studentResolveRes = await request(`/api/admin/complaints/${complaintMongoIdA}/resolution`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
      body: { summary: 'Hacked resolution' },
    });
    assert(studentResolveRes.status === 403, 'Student blocked from admin resolution API with 403 Forbidden (got ' + studentResolveRes.status + ')');

    console.log('\n--- Scenario 3: Admin Resolution Workflow with Required Message ---');
    // Admin attempts to mark Resolved without resolution message
    const emptyResolveRes = await request(`/api/admin/complaints/${complaintMongoIdA}/resolution`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: { summary: '   ' },
    });
    assert(emptyResolveRes.status === 400, 'Admin resolution rejected when resolution summary is empty with 400 Bad Request (got ' + emptyResolveRes.status + ')');

    // Admin resolves complaint with required resolution message
    const resolveRes = await request(`/api/admin/complaints/${complaintMongoIdA}/resolution`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        summary: 'Replaced power capacitor and HDMI connector in Lab 201 projector.',
        actionTaken: 'Hardware repair & calibrated display focus.',
      },
    });
    assert(resolveRes.status === 200, 'Admin successfully resolves complaint with 200 OK (got ' + resolveRes.status + ')');
    assert(resolveRes.data?.complaint?.status === 'Resolved', 'Complaint status updated to Resolved');
    assert(Boolean(resolveRes.data?.complaint?.resolvedAt), 'resolvedAt timestamp is set');
    assert(resolveRes.data?.complaint?.resolutionDetails?.resolvedByName === 'Dean of Facilities', 'Recorded resolving admin name');

    // Student A views resolved complaint details
    const studentViewRes = await request(`/api/complaints/${complaintIdA}`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(studentViewRes.status === 200, 'Student A views resolved complaint details');
    assert(studentViewRes.data?.complaint?.status === 'Resolved', 'Student sees status as Resolved');
    assert(Boolean(studentViewRes.data?.complaint?.resolutionDetails?.summary), 'Student sees resolution summary');
    
    // Check updates timeline includes RESOLUTION event
    const timelineUpdates = studentViewRes.data?.updates || [];
    const resolutionEvent = timelineUpdates.find((u) => u.updateType === 'RESOLUTION');
    assert(Boolean(resolutionEvent), 'Timeline includes RESOLUTION audit event');
    assert(resolutionEvent?.adminName === 'Dean of Facilities', 'Timeline event attributes resolving admin');

    console.log('\n--- Scenario 4: Admin Formally Closes Resolved Complaint ---');
    const closeRes = await request(`/api/admin/complaints/${complaintMongoIdA}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: { status: 'Closed', comment: 'Student confirmed projector working during afternoon lecture.' },
    });
    assert(closeRes.status === 200, 'Admin successfully closes complaint with 200 OK (got ' + closeRes.status + ')');
    assert(closeRes.data?.complaint?.status === 'Closed', 'Complaint status updated to Closed');
    assert(Boolean(closeRes.data?.complaint?.closedAt), 'closedAt timestamp is recorded');

    console.log('\n--- Scenario 5: Student Soft-Delete Workflow & Audit Preservation ---');
    // Student A submits second complaint
    const createRes2 = await request('/api/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
      body: {
        title: 'Water tap leaking in 3rd Floor Restroom',
        description: 'Continuous leaking from the washbasin faucet.',
        category: 'Water',
        location: 'Block C, 3rd Floor Restroom',
        priority: 'Medium',
      },
    });
    const complaintIdA2 = createRes2.data?.complaint?.complaintId;

    // Student A soft-deletes the complaint
    const studentDeleteRes = await request(`/api/complaints/${complaintIdA2}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(studentDeleteRes.status === 200, 'Student A soft-deletes own complaint with 200 OK (got ' + studentDeleteRes.status + ')');

    // Verify DB record is preserved (soft delete)
    const dbComplaint = await Complaint.findOne({ complaintId: complaintIdA2 });
    assert(Boolean(dbComplaint), 'Database record is preserved for audit history');
    assert(dbComplaint?.isDeleted === true, 'isDeleted flag is set to true');
    assert(Boolean(dbComplaint?.deletedAt), 'deletedAt timestamp is stored');
    assert(dbComplaint?.deletedByRole === 'student', 'deletedByRole is stored as student');

    // Verify deleted complaint is hidden from Student A's active complaints list
    const listRes2 = await request('/api/complaints/my', {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    const containsDeleted = listRes2.data?.complaints?.some((c) => c.complaintId === complaintIdA2);
    assert(!containsDeleted, 'Soft-deleted complaint is hidden from student active list');

    // Verify deleted complaint returns 404 on standard lookup
    const lookupDeletedRes = await request(`/api/complaints/${complaintIdA2}`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    assert(lookupDeletedRes.status === 404, 'Direct lookup of deleted complaint returns 404 (got ' + lookupDeletedRes.status + ')');

    console.log('\n--- Scenario 6: Admin Soft-Delete Workflow & Statistics Exclusion ---');
    // Admin soft-deletes Complaint A
    const adminDeleteRes = await request(`/api/admin/complaints/${complaintIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminDeleteRes.status === 200, 'Admin successfully soft-deletes complaint with 200 OK (got ' + adminDeleteRes.status + ')');

    // Verify admin complaints list excludes soft-deleted records
    const adminListRes = await request('/api/admin/complaints', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminContainsDeleted = adminListRes.data?.complaints?.some((c) => c.complaintId === complaintIdA);
    assert(!adminContainsDeleted, 'Admin active registry excludes soft-deleted complaints');

    // Verify admin stats count excludes soft-deleted records
    const adminStatsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminStatsRes.data?.stats?.total === 0, 'Admin dashboard stats total excludes soft-deleted complaints (count: ' + adminStatsRes.data?.stats?.total + ')');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed}/${total} assertions passed`);
    console.log('====================================================\n');

    if (passed === total) {
      console.log('🎉 ALL DELETE AND RESOLUTION TESTS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('Test execution error:', error);
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
  runDeleteAndResolutionTests();
}

module.exports = runDeleteAndResolutionTests;
