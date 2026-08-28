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
  console.log('🧪 Starting Department & Staff Management Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'dept_staff_test_db' },
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

    // 1. Create student and admin users
    const student = await User.create({
      fullName: 'Emma Watson',
      email: 'emma.watson@college.edu',
      studentId: 'STU-2026-99',
      department: 'Electrical Engineering',
      password: 'password123',
      role: 'student',
    });
    const studentToken = generateToken(student._id, 'student');

    const admin = await User.create({
      fullName: 'Chief Administrator',
      email: 'admin.chief@college.edu',
      studentId: 'ADMIN-CHIEF',
      department: 'Administration',
      password: 'adminpassword123',
      role: 'admin',
    });
    const adminToken = generateToken(admin._id, 'admin');

    // Create a complaint
    const complaint = await Complaint.create({
      title: 'Power failure in Physics Laboratory B',
      description: 'Main breaker tripped and outlets have no current.',
      category: 'Electricity',
      location: 'Physics Block, Lab B',
      student: student._id,
      priority: 'High',
      status: 'Submitted',
    });

    // SCENARIO 1: Security & Student Access Rejection
    console.log('--- Scenario 1: Security & Role Authorization ---');
    const studentDeptRes = await fetch(`${baseUrl}/api/admin/departments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDeptRes.status === 403, `Student token returns 403 Forbidden on /api/admin/departments (got ${studentDeptRes.status})`);

    const studentStaffRes = await fetch(`${baseUrl}/api/admin/staff`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentStaffRes.status === 403, `Student token returns 403 Forbidden on /api/admin/staff (got ${studentStaffRes.status})`);

    // SCENARIO 2: Department Auto-seeding & Listing
    console.log('\n--- Scenario 2: Department Management CRUD ---');
    const getDeptsRes = await fetch(`${baseUrl}/api/admin/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptsData = await getDeptsRes.json();
    assert(getDeptsRes.status === 200, `Admin gets departments with 200 OK (got ${getDeptsRes.status})`);
    assert(deptsData.departments?.length >= 9, `Default institutional departments seeded (found ${deptsData.departments?.length})`);

    // SCENARIO 3: Department Creation & Duplication Prevention
    const createDeptRes = await fetch(`${baseUrl}/api/admin/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Robotics & Mechatronics Lab',
        description: 'Specialized lab for autonomous systems and 3D printing',
      }),
    });
    const createDeptData = await createDeptRes.json();
    assert(createDeptRes.status === 201, `Department creation returns 201 Created (got ${createDeptRes.status})`);
    assert(createDeptData.department?.name === 'Robotics & Mechatronics Lab', 'Department name saved properly');

    const duplicateDeptRes = await fetch(`${baseUrl}/api/admin/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Robotics & Mechatronics Lab',
      }),
    });
    assert(duplicateDeptRes.status === 400, `Duplicate department name rejected with 400 Bad Request (got ${duplicateDeptRes.status})`);

    // SCENARIO 4: Department Status Toggle
    const toggleDeptRes = await fetch(`${baseUrl}/api/admin/departments/${createDeptData.department.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: false }),
    });
    const toggleDeptData = await toggleDeptRes.json();
    assert(toggleDeptRes.status === 200, `Department deactivated successfully (got ${toggleDeptRes.status})`);
    assert(toggleDeptData.department?.active === false, 'Department active flag is now false');

    // SCENARIO 5: Staff Management CRUD
    console.log('\n--- Scenario 5: Staff Creation & Validation ---');
    const electricalDept = await Department.findOne({ name: 'Electrical Maintenance' });
    const itDept = await Department.findOne({ name: 'IT Support' });

    // 5a. Create staff member in Electrical Maintenance
    const createStaffRes = await fetch(`${baseUrl}/api/admin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'James Electrician',
        email: 'james.elec@college.edu',
        employeeId: 'EMP-ELEC-01',
        department: electricalDept._id,
        phone: '+1 555-4321',
      }),
    });
    const createStaffData = await createStaffRes.json();
    assert(createStaffRes.status === 201, `Staff member creation returns 201 Created (got ${createStaffRes.status})`);
    assert(createStaffData.staff?.name === 'James Electrician', 'Staff name saved');
    assert(createStaffData.staff?.employeeId === 'EMP-ELEC-01', 'Employee ID saved in uppercase');

    // 5b. Create staff member in IT Support
    const createITStaffRes = await fetch(`${baseUrl}/api/admin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Sarah IT Specialist',
        email: 'sarah.it@college.edu',
        employeeId: 'EMP-IT-01',
        department: itDept._id,
        phone: '+1 555-9876',
      }),
    });
    const createITStaffData = await createITStaffRes.json();
    assert(createITStaffRes.status === 201, `IT Staff created returns 201 Created (got ${createITStaffRes.status})`);

    // 5c. Prevent duplicate staff email
    const dupEmailRes = await fetch(`${baseUrl}/api/admin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Guy',
        email: 'james.elec@college.edu',
        employeeId: 'EMP-NEW-99',
        department: electricalDept._id,
      }),
    });
    assert(dupEmailRes.status === 400, `Duplicate staff email rejected with 400 Bad Request (got ${dupEmailRes.status})`);

    // 5d. Prevent assigning staff to an inactive department
    const inactiveDeptStaffRes = await fetch(`${baseUrl}/api/admin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Robotics Tech',
        email: 'robo.tech@college.edu',
        employeeId: 'EMP-ROBO-01',
        department: createDeptData.department.id, // Deactivated department
      }),
    });
    assert(inactiveDeptStaffRes.status === 400, `Assigning staff to inactive department rejected (got ${inactiveDeptStaffRes.status})`);

    // SCENARIO 6: Fetch Staff by Department
    console.log('\n--- Scenario 6: Fetch Staff by Department ---');
    const deptStaffRes = await fetch(`${baseUrl}/api/admin/departments/${electricalDept._id}/staff?activeOnly=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptStaffData = await deptStaffRes.json();
    assert(deptStaffRes.status === 200, `Fetch staff by department returns 200 OK (got ${deptStaffRes.status})`);
    assert(deptStaffData.staff?.length === 1, `Electrical department has exactly 1 staff member`);
    assert(deptStaffData.staff[0]?.employeeId === 'EMP-ELEC-01', 'Correct staff record retrieved');

    // SCENARIO 7: Complaint Assignment Validation
    console.log('\n--- Scenario 7: Complaint Assignment Validation Rules ---');
    
    // 7a. Reject assigning to inactive department
    const assignInactiveDeptRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: createDeptData.department.id, // Inactive department
      }),
    });
    assert(assignInactiveDeptRes.status === 400, `Assigning complaint to inactive department rejected with 400 Bad Request (got ${assignInactiveDeptRes.status})`);

    // 7b. Reject assigning staff who does not belong to the selected department
    const assignMismatchedStaffRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: electricalDept._id,
        staffId: createITStaffData.staff.id, // Staff belongs to IT, not Electrical!
      }),
    });
    assert(assignMismatchedStaffRes.status === 400, `Assigning staff from mismatched department rejected with 400 Bad Request (got ${assignMismatchedStaffRes.status})`);

    // 7c. Reject assigning inactive staff
    await Staff.findByIdAndUpdate(createStaffData.staff.id, { active: false });
    const assignInactiveStaffRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: electricalDept._id,
        staffId: createStaffData.staff.id, // Now inactive
      }),
    });
    assert(assignInactiveStaffRes.status === 400, `Assigning inactive staff rejected with 400 Bad Request (got ${assignInactiveStaffRes.status})`);

    // Reactivate staff and assign successfully
    await Staff.findByIdAndUpdate(createStaffData.staff.id, { active: true });
    const validAssignRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint.complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: electricalDept._id,
        staffId: createStaffData.staff.id,
      }),
    });
    const validAssignData = await validAssignRes.json();
    assert(validAssignRes.status === 200, `Valid department and technician assignment succeeded (got ${validAssignRes.status})`);
    assert(validAssignData.complaint?.status === 'Assigned', 'Status auto-transitioned to "Assigned"');
    assert(validAssignData.complaint?.assignedDepartment?.name === 'Electrical Maintenance', 'Department populated in response');
    assert(validAssignData.complaint?.assignedStaff?.name === 'James Electrician', 'Staff technician populated in response');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL DEPARTMENT & STAFF MANAGEMENT TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running dept/staff tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
