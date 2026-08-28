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
  console.log('🧪 Starting Admin Analytics Aggregation Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'analytics_test_db' },
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
    const eleDept = await Department.findOne({ name: 'Electrical Maintenance' });

    const staff1 = await Staff.create({
      name: 'Sarah IT Specialist',
      email: 'sarah.it@college.edu',
      employeeId: 'EMP-IT-01',
      department: itDept._id,
      phone: '+1 555-0101',
    });

    // Create student & admin
    const student = await User.create({
      fullName: 'Emma Student',
      email: 'emma.student@college.edu',
      studentId: 'STU-EMMA-01',
      department: 'Computer Science',
      password: 'password123',
      role: 'student',
    });
    const studentToken = generateToken(student._id, 'student');

    const admin = await User.create({
      fullName: 'Chief Administrator',
      email: 'chief.admin@college.edu',
      studentId: 'ADMIN-CHIEF-01',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(admin._id, 'admin');

    // Create 4 sample complaints with specific dates, statuses, and priorities
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Complaint 1: Resolved in 2 hours
    const c1 = await Complaint.create({
      title: 'Projector bulb fused in Room 101',
      description: 'The projector turns on with red lamp indicator.',
      category: 'Classroom',
      location: 'Main Block, Room 101',
      student: student._id,
      priority: 'High',
      status: 'Resolved',
      assignedDepartment: itDept._id,
      assignedDepartmentName: itDept.name,
      assignedStaff: staff1._id,
      assignedStaffName: staff1.name,
      createdAt: twoDaysAgo,
      resolvedAt: new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
    });

    await ComplaintUpdate.create({
      complaint: c1._id,
      admin: admin._id,
      adminName: admin.fullName,
      updateType: 'ASSIGNMENT',
      message: 'Assigned to IT Support',
      createdAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000), // 30 mins after creation
    });

    // Complaint 2: Critical, In Progress
    const c2 = await Complaint.create({
      title: 'Power outage in Server Room',
      description: 'UPS battery backup failed during storm.',
      category: 'Electricity',
      location: 'Data Center',
      student: student._id,
      priority: 'Critical',
      status: 'In Progress',
      assignedDepartment: eleDept._id,
      assignedDepartmentName: eleDept.name,
      createdAt: twoDaysAgo,
    });

    // Complaint 3: Water, Closed
    const c3 = await Complaint.create({
      title: 'Tap leaking in Hostel 2',
      description: 'Constant dripping from sink faucet.',
      category: 'Water',
      location: 'Hostel 2, Ground Floor',
      student: student._id,
      priority: 'Low',
      status: 'Closed',
      createdAt: tenDaysAgo,
      resolvedAt: new Date(tenDaysAgo.getTime() + 4 * 60 * 60 * 1000),
      closedAt: new Date(tenDaysAgo.getTime() + 5 * 60 * 60 * 1000),
    });

    // Complaint 4: Wi-Fi, Submitted (Unresolved, Medium)
    const c4 = await Complaint.create({
      title: 'Slow Wi-Fi in Cafeteria',
      description: 'Latency exceeds 800ms during lunch hours.',
      category: 'Wi-Fi',
      location: 'Student Cafeteria',
      student: student._id,
      priority: 'Medium',
      status: 'Submitted',
      createdAt: now,
    });

    // SCENARIO 1: Security Guard
    console.log('--- Scenario 1: Security & Authorization Guard ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/analytics`);
    assert(unauthRes.status === 401, `Unauthenticated request returns 401 Unauthorized (got ${unauthRes.status})`);

    const studentRes = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentRes.status === 403, `Student token returns 403 Forbidden (got ${studentRes.status})`);

    // SCENARIO 2: All Time Analytics Aggregation
    console.log('\n--- Scenario 2: All Time Aggregation & KPI Calculations ---');
    const allTimeRes = await fetch(`${baseUrl}/api/admin/analytics?range=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allTimeData = await allTimeRes.json();
    assert(allTimeRes.status === 200, `Admin token returns 200 OK (got ${allTimeRes.status})`);
    
    assert(allTimeData.kpi?.totalComplaints === 4, `Total complaints computed accurately (${allTimeData.kpi?.totalComplaints})`);
    assert(allTimeData.kpi?.resolvedComplaints === 2, `Resolved count includes Resolved and Closed (${allTimeData.kpi?.resolvedComplaints})`);
    assert(allTimeData.kpi?.unresolvedComplaints === 2, `Unresolved count includes In Progress and Submitted (${allTimeData.kpi?.unresolvedComplaints})`);
    assert(allTimeData.kpi?.criticalComplaints === 1, `Critical complaints count computed (${allTimeData.kpi?.criticalComplaints})`);
    assert(allTimeData.kpi?.resolutionRate === 50, `Resolution rate is 50% (${allTimeData.kpi?.resolutionRate}%)`);
    assert(allTimeData.kpi?.averageResolutionTimeFormatted?.includes('hrs') || allTimeData.kpi?.averageResolutionTimeFormatted?.includes('days'), 'Average resolution time formatted');
    assert(allTimeData.kpi?.averageTimeToAssignmentFormatted !== null, 'Average time to assignment computed');

    // SCENARIO 3: Chart Distributions
    console.log('\n--- Scenario 3: Chart Distributions Aggregation Pipelines ---');
    assert(allTimeData.charts?.byCategory?.['Classroom'] === 1, 'Category distribution includes Classroom');
    assert(allTimeData.charts?.byCategory?.['Electricity'] === 1, 'Category distribution includes Electricity');
    assert(allTimeData.charts?.byPriority?.['Critical'] === 1, 'Priority distribution includes Critical');
    assert(allTimeData.charts?.byStatus?.['Submitted'] === 1, 'Status distribution includes Submitted');
    assert(allTimeData.charts?.byStatus?.['In Progress'] === 1, 'Status distribution includes In Progress');
    assert(allTimeData.charts?.byStatus?.['Resolved'] === 1, 'Status distribution includes Resolved');
    assert(allTimeData.charts?.byStatus?.['Closed'] === 1, 'Status distribution includes Closed');
    assert(allTimeData.charts?.byDepartment?.length >= 2, `Department distribution contains populated records (found ${allTimeData.charts?.byDepartment?.length})`);
    assert(allTimeData.charts?.overTime?.length >= 1, `Over time series contains date points (found ${allTimeData.charts?.overTime?.length})`);

    // SCENARIO 4: Date Range Filtering (Last 7 Days)
    console.log('\n--- Scenario 4: Date Filter Window (Last 7 Days) ---');
    const sevenDaysRes = await fetch(`${baseUrl}/api/admin/analytics?range=7d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sevenDaysData = await sevenDaysRes.json();
    assert(sevenDaysRes.status === 200, '7-Day filter returns 200 OK');
    // c3 was 10 days ago, so 7d filter should match 3 complaints (c1, c2, c4)
    assert(sevenDaysData.kpi?.totalComplaints === 3, `7-day filter filters out 10-day-old complaint (found ${sevenDaysData.kpi?.totalComplaints})`);

    // SCENARIO 5: Custom Date Range Filter
    console.log('\n--- Scenario 5: Custom Date Range Filter ---');
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const customRes = await fetch(`${baseUrl}/api/admin/analytics?startDate=${yesterday}&endDate=${tomorrow}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const customData = await customRes.json();
    assert(customRes.status === 200, 'Custom date range returns 200 OK');
    assert(customData.kpi?.totalComplaints === 1, `Custom date range matches today's complaint (found ${customData.kpi?.totalComplaints})`);

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL ADMIN ANALYTICS AGGREGATION TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running analytics tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
