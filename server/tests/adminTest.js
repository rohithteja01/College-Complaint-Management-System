const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
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
  console.log('🧪 Starting Admin Dashboard & Complaint Management Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'admin_dashboard_test_db' },
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

    // Seed departments
    await Department.seedDefaultsIfEmpty();
    const electricalDept = await Department.findOne({ name: 'Electrical Maintenance' });
    const civilDept = await Department.findOne({ name: 'Infrastructure' });
    const itDept = await Department.findOne({ name: 'IT Support' });

    // 1. Create student and admin users
    const student = await User.create({
      fullName: 'Lucas Scott',
      email: 'lucas.scott@college.edu',
      studentId: 'CS2026-301',
      department: 'Computer Science',
      password: 'password123',
      role: 'student',
    });
    const studentToken = generateToken(student._id, 'student');

    const admin = await User.create({
      fullName: 'Dean Williams',
      email: 'dean.williams@college.edu',
      studentId: 'ADMIN-002',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(admin._id, 'admin');

    // Create 3 sample complaints with different categories, statuses, and priorities
    const c1 = await Complaint.create({
      title: 'Broken fluorescent bulb in Room 102',
      description: 'The overhead lights are flickering and making buzzing noises.',
      category: 'Electricity',
      location: 'Block A, Room 102',
      student: student._id,
      priority: 'Medium',
      status: 'Submitted',
    });

    const c2 = await Complaint.create({
      title: 'Water leaking in 2nd Floor Washroom',
      description: 'Pipe joint burst in washroom causing flooding on the floor.',
      category: 'Water',
      location: 'Hostel 1, 2nd Floor',
      student: student._id,
      priority: 'Critical',
      status: 'In Progress',
      assignedDepartment: civilDept._id,
      assignedDepartmentName: civilDept.name,
    });

    const c3 = await Complaint.create({
      title: 'Wi-Fi access point down in Library',
      description: 'The Library East wing router is not broadcasting SSID.',
      category: 'Wi-Fi',
      location: 'Central Library, 1st Floor',
      student: student._id,
      priority: 'High',
      status: 'Resolved',
      assignedDepartment: itDept._id,
      assignedDepartmentName: itDept.name,
      resolvedAt: new Date(),
    });

    // SCENARIO 1: Security & Role Restrictions
    console.log('--- Scenario 1: Security & Role Authorization ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/stats`);
    assert(unauthRes.status === 401, `Unauthenticated request returns 401 Unauthorized (got ${unauthRes.status})`);

    const studentForbiddenRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentForbiddenRes.status === 403, `Student token returns 403 Forbidden (got ${studentForbiddenRes.status})`);

    const adminStatsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await adminStatsRes.json();
    assert(adminStatsRes.status === 200, `Admin token returns 200 OK (got ${adminStatsRes.status})`);
    assert(statsData.stats?.total === 3, `Total complaints calculated correctly (${statsData.stats?.total})`);
    assert(statsData.stats?.submitted === 1, `Submitted count calculated correctly (${statsData.stats?.submitted})`);
    assert(statsData.stats?.inProgress === 1, `In Progress count calculated correctly (${statsData.stats?.inProgress})`);
    assert(statsData.stats?.resolved === 1, `Resolved count calculated correctly (${statsData.stats?.resolved})`);
    assert(statsData.stats?.critical === 1, `Critical complaints calculated correctly (${statsData.stats?.critical})`);
    assert(statsData.distributions?.byCategory?.['Electricity'] === 1, 'Category distribution calculated');
    assert(statsData.distributions?.byPriority?.['Critical'] === 1, 'Priority distribution calculated');

    // SCENARIO 2: Admin Complaints List & Search/Filters
    console.log('\n--- Scenario 2: Admin Search & Multi-Filter Querying ---');
    // Search by title
    const searchRes = await fetch(`${baseUrl}/api/admin/complaints?search=fluorescent`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = await searchRes.json();
    assert(searchData.count === 1, `Search by title returns matching record (count: ${searchData.count})`);

    // Search by student roll number
    const rollSearchRes = await fetch(`${baseUrl}/api/admin/complaints?search=CS2026-301`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rollSearchData = await rollSearchRes.json();
    assert(rollSearchData.count === 3, `Search by student ID matches all 3 student complaints`);

    // Filter by priority
    const priFilterRes = await fetch(`${baseUrl}/api/admin/complaints?priority=Critical`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const priFilterData = await priFilterRes.json();
    assert(priFilterData.count === 1 && priFilterData.complaints[0]?.priority === 'Critical', 'Filter by priority returns Critical complaints');

    // Filter by category
    const catFilterRes = await fetch(`${baseUrl}/api/admin/complaints?category=Water`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catFilterData = await catFilterRes.json();
    assert(catFilterData.count === 1 && catFilterData.complaints[0]?.category === 'Water', 'Filter by category returns Water complaints');

    // SCENARIO 3: Status Transition Workflow Rules
    console.log('\n--- Scenario 3: Status Transitions & Validation Rules ---');
    // 3a. Valid transition: Submitted -> Under Review
    const validTransRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Under Review',
        comment: 'Assigned inspection team to review the electrical room.',
      }),
    });
    const validTransData = await validTransRes.json();
    assert(validTransRes.status === 200, `Valid status update to "Under Review" succeeded (got ${validTransRes.status})`);
    assert(validTransData.complaint?.status === 'Under Review', 'Status field updated in document');
    assert(validTransData.complaint?.adminComments?.length === 1, 'Status change comment appended');

    // 3b. Invalid transition without force: Under Review directly to Closed
    const invalidTransRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Resolved', // Disallowed skip: Under Review cannot jump to Resolved directly
      }),
    });
    assert(invalidTransRes.status === 400, `Invalid status jump rejected with 400 Bad Request (got ${invalidTransRes.status})`);

    // SCENARIO 4: Department & Staff Assignment
    console.log('\n--- Scenario 4: Department & Staff Assignment ---');
    const assignRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: electricalDept._id,
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 200, `Department assignment succeeded (got ${assignRes.status})`);
    assert(assignData.complaint?.assignedDepartment?.name === 'Electrical Maintenance', 'Department assigned correctly');
    assert(assignData.complaint?.status === 'Assigned', 'Status auto-transitioned to "Assigned" upon department routing');

    // SCENARIO 5: Priority Modifier
    console.log('\n--- Scenario 5: Priority Modifier ---');
    const priRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        priority: 'Critical',
      }),
    });
    const priData = await priRes.json();
    assert(priRes.status === 200, `Priority update succeeded (got ${priRes.status})`);
    assert(priData.complaint?.priority === 'Critical', 'Priority updated to Critical');

    // SCENARIO 6: Administrative Comments
    console.log('\n--- Scenario 6: Posting Administrative Comments ---');
    const commentRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        comment: 'Parts ordered from campus electrical supplier.',
      }),
    });
    const commentData = await commentRes.json();
    assert(commentRes.status === 201, `Admin comment created with 201 Created (got ${commentRes.status})`);
    assert(commentData.complaint?.adminComments?.length === 2, 'Comment added to adminComments array');
    assert(commentData.complaint?.adminComments[1]?.commentedByName === 'Dean Williams', 'Admin author details captured');

    // SCENARIO 7: Grievance Resolution Documentation
    console.log('\n--- Scenario 7: Resolution Documentation ---');
    const resolveRes = await fetch(`${baseUrl}/api/admin/complaints/${c1.complaintId}/resolution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        summary: 'Replaced 4 ballast units and installed energy-efficient LED tubes.',
        actionTaken: 'Electrical Ballast Replacement',
      }),
    });
    const resolveData = await resolveRes.json();
    assert(resolveRes.status === 200, `Resolution documented with 200 OK (got ${resolveRes.status})`);
    assert(resolveData.complaint?.status === 'Resolved', 'Status transitioned to "Resolved"');
    assert(resolveData.complaint?.resolvedAt !== null, 'resolvedAt timestamp recorded');
    assert(resolveData.complaint?.resolutionDetails?.summary?.includes('LED tubes'), 'Resolution summary recorded');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL ADMIN DASHBOARD & MANAGEMENT TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running admin tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
