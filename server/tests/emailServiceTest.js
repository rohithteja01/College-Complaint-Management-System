const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const emailService = require('../services/emailService');
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
  console.log('🧪 Starting Configurable Email Notification Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'email_service_test_db' },
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
    const eleDept = await Department.findOne({ name: 'Electrical Maintenance' });
    const eleStaff = await Staff.create({
      name: 'Carl Electrician',
      email: 'carl.elec@college.edu',
      employeeId: 'EMP-CARL-01',
      department: eleDept._id,
      phone: '+1 555-3322',
    });

    // 1. Create Student & Admin
    const student = await User.create({
      fullName: 'Samantha Davis',
      email: 'samantha.davis@college.edu',
      studentId: 'STU-SAMANTHA',
      department: 'Biotechnology',
      password: 'password123',
      role: 'student',
    });
    const studentToken = generateToken(student._id, 'student');

    const admin = await User.create({
      fullName: 'Dean of Student Affairs',
      email: 'dean.affairs@college.edu',
      studentId: 'ADMIN-DEAN-01',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(admin._id, 'admin');

    // SCENARIO 1: Email Transporter & Fallback Safety
    console.log('--- Scenario 1: Transporter Configuration & Fallback ---');
    const transporter = emailService.createTransporter();
    assert(transporter !== null, 'Transporter initializes without throwing errors');

    // SCENARIO 2: Complaint Submission Email Notification
    console.log('\n--- Scenario 2: Complaint Submission Notification ---');
    const submitRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Water filter leaking in Biotech Block 2nd floor',
        description: 'Water is overflowing and pooling near the classroom corridor.',
        category: 'Water',
        location: 'Biotech Block, 2nd Floor',
        priority: 'High',
      }),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 201, `Complaint submitted successfully (got ${submitRes.status})`);
    const complaint = submitData.complaint;

    const submissionEmailRes = await emailService.sendComplaintSubmissionEmail({
      student,
      complaint,
    });
    assert(submissionEmailRes.success === true, 'Submission email notification dispatches successfully');

    // SCENARIO 3: Status Transition Email Notification
    console.log('\n--- Scenario 3: Status Change Notification ---');
    const statusRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Under Review',
        comment: 'Assigned inspection team to examine the water valve.',
      }),
    });
    assert(statusRes.status === 200, `Status transitioned to Under Review (got ${statusRes.status})`);

    const statusEmailRes = await emailService.sendComplaintStatusChangeEmail({
      student,
      complaint,
      previousStatus: 'Submitted',
      newStatus: 'Under Review',
      note: 'Inspection scheduled.',
    });
    assert(statusEmailRes.success === true, 'Status change email notification dispatches successfully');

    // SCENARIO 4: Department & Staff Assignment Email Notification
    console.log('\n--- Scenario 4: Department & Staff Assignment Notification ---');
    const assignRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: eleDept._id,
        staffId: eleStaff._id,
      }),
    });
    assert(assignRes.status === 200, `Assignment updated (got ${assignRes.status})`);

    const assignEmailRes = await emailService.sendComplaintAssignmentEmail({
      student,
      complaint,
      departmentName: 'Electrical Maintenance',
      staffName: 'Carl Electrician',
    });
    assert(assignEmailRes.success === true, 'Assignment email notification dispatches successfully');

    // SCENARIO 5: Resolution Notification
    console.log('\n--- Scenario 5: Resolution Email Notification ---');
    const resolveRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/resolution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        summary: 'Replaced faulty water filter diaphragm and tight sealed the inlet joint.',
        actionTaken: 'Filter diaphragm replacement',
      }),
    });
    assert(resolveRes.status === 200, `Resolution documented (got ${resolveRes.status})`);

    const resolveEmailRes = await emailService.sendComplaintResolutionEmail({
      student,
      complaint,
      resolutionSummary: 'Replaced faulty water filter diaphragm.',
      actionTaken: 'Filter diaphragm replacement',
    });
    assert(resolveEmailRes.success === true, 'Resolution email notification dispatches successfully');

    // SCENARIO 6: Closure Notification
    console.log('\n--- Scenario 6: Closure Email Notification ---');
    const closeRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Closed' }),
    });
    assert(closeRes.status === 200, `Complaint closed (got ${closeRes.status})`);

    const closeEmailRes = await emailService.sendComplaintClosureEmail({
      student,
      complaint,
    });
    assert(closeEmailRes.success === true, 'Closure email notification dispatches successfully');

    // SCENARIO 7: Non-Blocking Fault Tolerance
    console.log('\n--- Scenario 7: Fault-Tolerance on Missing / Errored Recipient ---');
    const badEmailRes = await emailService.sendEmail({
      to: null, // missing email
      subject: 'Test',
      text: 'Test message',
    });
    assert(badEmailRes.success === false, 'Safe error response on missing recipient without throwing');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL EMAIL NOTIFICATION TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running email tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
