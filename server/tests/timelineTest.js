const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const { Department } = require('../models/Department');
const Staff = require('../models/Staff');
const { generateToken } = require('../utils/jwt');

// Setup test Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

let mongod;
let server;
let baseUrl;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Complaint Communication & Timeline Lifecycle Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'timeline_test_db' },
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

    // Seed departments & staff
    await Department.seedDefaultsIfEmpty();
    const itDept = await Department.findOne({ name: 'IT Support' });
    const itStaff = await Staff.create({
      name: 'Alex Network Engineer',
      email: 'alex.net@college.edu',
      employeeId: 'EMP-NET-01',
      department: itDept._id,
      phone: '+1 555-7788',
    });

    // Create students and admin
    const student1 = await User.create({
      fullName: 'Alice Walker',
      email: 'alice.walker@college.edu',
      studentId: 'STU-ALICE',
      department: 'Information Technology',
      password: 'password123',
      role: 'student',
    });
    const student1Token = generateToken(student1._id, 'student');

    const student2 = await User.create({
      fullName: 'Bob Smith',
      email: 'bob.smith@college.edu',
      studentId: 'STU-BOB',
      department: 'Mechanical',
      password: 'password123',
      role: 'student',
    });
    const student2Token = generateToken(student2._id, 'student');

    const admin = await User.create({
      fullName: 'Supervisor Johnson',
      email: 'admin.johnson@college.edu',
      studentId: 'ADMIN-SUP-01',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(admin._id, 'admin');

    // 1. Student lodges complaint
    console.log('--- Step 1: Complaint Submission & Audit Trail ---');
    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({
        title: 'Core Switch port outage in Lab 304',
        description: 'Ethernet drop 14 has no link light and does not negotiate 1Gbps.',
        category: 'Wi-Fi',
        location: 'IT Building, Lab 304',
        priority: 'High',
      }),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 201, `Complaint created with 201 Created (got ${submitRes.status})`);
    const complaintId = submitData.complaint?.complaintId;

    const initialUpdates = await ComplaintUpdate.find({ complaint: submitData.complaint?.id || submitData.complaint?._id });
    assert(initialUpdates.length === 1, `Initial update record created automatically (found ${initialUpdates.length})`);
    assert(initialUpdates[0]?.updateType === 'SUBMISSION', 'Update type is SUBMISSION');
    assert(initialUpdates[0]?.newStatus === 'Submitted', 'New status is Submitted');

    // 2. Admin moves status to Under Review
    console.log('\n--- Step 2: Status Transition to "Under Review" ---');
    const reviewRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Under Review',
        comment: 'Network team reviewing switch logs.',
      }),
    });
    assert(reviewRes.status === 200, `Status moved to Under Review (got ${reviewRes.status})`);

    const reviewUpdate = await ComplaintUpdate.findOne({ updateType: 'STATUS_CHANGE', newStatus: 'Under Review' });
    assert(reviewUpdate !== null, 'STATUS_CHANGE update recorded for Under Review');
    assert(reviewUpdate?.previousStatus === 'Submitted', 'Previous status is Submitted');

    // 3. Admin routes to IT Support and assigns staff
    console.log('\n--- Step 3: Department & Staff Assignment ---');
    const assignRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: itDept._id,
        staffId: itStaff._id,
      }),
    });
    assert(assignRes.status === 200, `Assignment updated (got ${assignRes.status})`);

    const assignUpdate = await ComplaintUpdate.findOne({ updateType: 'ASSIGNMENT' });
    assert(assignUpdate !== null, 'ASSIGNMENT update recorded');
    assert(assignUpdate?.message?.includes('IT Support'), 'Assignment message specifies department');
    assert(assignUpdate?.message?.includes('Alex Network Engineer'), 'Assignment message specifies technician');

    // 4. Admin updates priority
    console.log('\n--- Step 4: Priority Level Change ---');
    const priRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ priority: 'Critical' }),
    });
    assert(priRes.status === 200, `Priority updated to Critical (got ${priRes.status})`);

    const priUpdate = await ComplaintUpdate.findOne({ updateType: 'PRIORITY_CHANGE' });
    assert(priUpdate !== null, 'PRIORITY_CHANGE update recorded');
    assert(priUpdate?.message?.includes('Critical'), 'Priority message mentions Critical');

    // 5. Admin posts a comment
    console.log('\n--- Step 5: Official Administrative Comment ---');
    const commentRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        comment: 'Technician Alex is currently re-terminating the Cat6 jack in Lab 304.',
      }),
    });
    assert(commentRes.status === 201, `Comment posted with 201 Created (got ${commentRes.status})`);

    const commentUpdate = await ComplaintUpdate.findOne({ updateType: 'COMMENT' });
    assert(commentUpdate !== null, 'COMMENT update recorded');
    assert(commentUpdate?.message?.includes('re-terminating the Cat6 jack'), 'Comment message preserved');

    // 6. Admin resolves the complaint (test validation requirement)
    console.log('\n--- Step 6: Grievance Resolution & Timestamping ---');
    const emptyResolveRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/resolution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ summary: '' }),
    });
    assert(emptyResolveRes.status === 400, `Missing resolution summary rejected with 400 (got ${emptyResolveRes.status})`);

    const validResolveRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/resolution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        summary: 'Re-punched keystones at patch panel 2 and tested 1000BASE-T throughput successfully.',
        actionTaken: 'Patch panel keystone punch-down & Fluke cable test',
      }),
    });
    const resolveData = await validResolveRes.json();
    assert(validResolveRes.status === 200, `Resolution documented with 200 OK (got ${validResolveRes.status})`);
    assert(resolveData.complaint?.status === 'Resolved', 'Status is Resolved');
    assert(resolveData.complaint?.resolvedAt !== null, 'resolvedAt timestamp recorded');

    const resolveUpdate = await ComplaintUpdate.findOne({ updateType: 'RESOLUTION' });
    assert(resolveUpdate !== null, 'RESOLUTION update recorded in timeline');
    assert(resolveUpdate?.message?.includes('Re-punched keystones'), 'Resolution summary captured');

    // 7. Admin closes complaint
    console.log('\n--- Step 7: Grievance Ticket Closure ---');
    const closeRes = await fetch(`${baseUrl}/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Closed' }),
    });
    const closeData = await closeRes.json();
    assert(closeRes.status === 200, `Complaint closed (got ${closeRes.status})`);
    assert(closeData.complaint?.closedAt !== null, 'closedAt timestamp recorded');

    const closeUpdate = await ComplaintUpdate.findOne({ updateType: 'CLOSURE' });
    assert(closeUpdate !== null, 'CLOSURE update recorded');

    // 8. Retrieve complete chronological timeline via API
    console.log('\n--- Step 8: Timeline Retrieval & Security ---');
    const timelineRes = await fetch(`${baseUrl}/api/complaints/${complaintId}/updates`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const timelineData = await timelineRes.json();
    assert(timelineRes.status === 200, `Student gets timeline with 200 OK (got ${timelineRes.status})`);
    assert(timelineData.updates?.length >= 7, `Chronological timeline contains all 7 lifecycle events (found ${timelineData.updates?.length})`);

    // Verify chronological sorting (a.createdAt <= b.createdAt)
    let isSorted = true;
    for (let i = 0; i < timelineData.updates.length - 1; i++) {
      if (new Date(timelineData.updates[i].createdAt) > new Date(timelineData.updates[i + 1].createdAt)) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, 'Timeline events are strictly sorted in chronological order');

    // Verify privacy guard: Student 2 cannot access Student 1's timeline
    const unauthorizedTimelineRes = await fetch(`${baseUrl}/api/complaints/${complaintId}/updates`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(unauthorizedTimelineRes.status === 403, `Unauthorized student blocked from timeline with 403 (got ${unauthorizedTimelineRes.status})`);

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL COMPLAINT COMMUNICATION & TIMELINE TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running timeline tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
