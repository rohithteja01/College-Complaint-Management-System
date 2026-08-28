/**
 * Dual Host Cross-Origin & Shared Database Integration Test Suite
 * 
 * Verifies:
 * 1. CORS accepts Origin: http://localhost:5173 (Student Frontend)
 * 2. CORS accepts Origin: http://localhost:5174 (Admin Frontend)
 * 3. Student registers on http://localhost:5173 -> Persists in Shared Database
 * 4. Student logs in and files Canteen grievance -> Saved with Complaint ID & Timeline in Shared Database
 * 5. Admin logs in on http://localhost:5174 -> Queries shared database and sees Canteen grievance
 * 6. Admin assigns department, updates priority, and resolves grievance with official resolution message
 * 7. Student on http://localhost:5173 retrieves grievance -> Sees status 'Resolved', staff assignment, resolution notes & updated timeline
 * 8. Security verification: Student cannot access Admin APIs (/api/admin/*)
 * 9. Privacy verification: Another student cannot access first student's grievance
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const { Department } = require('../models/Department');
const Staff = require('../models/Staff');

// Setup test Express app mimicking server.js
const app = express();
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true,
}));
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
  return { status: res.status, headers: res.headers, data };
};

const runDualHostTests = async () => {
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

  try {
    console.log('\n============================================================');
    console.log('🚀 DUAL HOST (5173/5174) SHARED BACKEND & DB TEST SUITE');
    console.log('============================================================\n');

    // 1. Start In-Memory MongoDB and Express Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Seed Admin Account into Shared DB
    const adminUser = await User.create({
      fullName: 'System Administrator',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      role: 'admin',
      department: 'Administration',
      isApproved: true,
    });

    // Seed Department into Shared DB
    const canteenDept = await Department.create({
      name: 'Canteen & Food Services',
      description: 'Campus cafeteria, food quality and hygiene management',
    });

    // Seed Staff into Shared DB
    const canteenStaff = await Staff.create({
      name: 'Chef Gordon',
      email: 'gordon@college.edu',
      employeeId: 'EMP-CAN-001',
      department: canteenDept._id,
    });

    // =========================================================================
    // TEST 1: CORS validation for Student Host (http://localhost:5173)
    // =========================================================================
    console.log('--- TEST GROUP 1: CORS Configuration ---');
    const corsResStudent = await request('/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: { email: 'invalid@test.com', password: 'test' }
    });
    assert(corsResStudent.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS allows Student Host (http://localhost:5173)');

    // =========================================================================
    // TEST 2: CORS validation for Admin Host (http://localhost:5174)
    // =========================================================================
    const corsResAdmin = await request('/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5174' },
      body: { email: 'invalid@test.com', password: 'test' }
    });
    assert(corsResAdmin.headers.get('access-control-allow-origin') === 'http://localhost:5174', 'CORS allows Admin Host (http://localhost:5174)');

    // =========================================================================
    // TEST 3: Student Registration via Port 5173 Origin
    // =========================================================================
    console.log('\n--- TEST GROUP 2: Student Flow (Port 5173) ---');
    const studentRegisterRes = await request('/api/auth/student/register', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: {
        fullName: 'Rahul Sharma',
        email: 'rahul.sharma@college.edu',
        studentId: 'STU-2026-001',
        department: 'Computer Science',
        password: 'Password@123',
      }
    });

    assert(studentRegisterRes.status === 201, 'Student successfully registered via /api/auth/student/register');
    assert(studentRegisterRes.data.user.email === 'rahul.sharma@college.edu', 'Registered student data returned correctly');

    // =========================================================================
    // TEST 4: Student Login via Port 5173 Origin
    // =========================================================================
    const studentLoginRes = await request('/api/auth/student/login', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: {
        email: 'rahul.sharma@college.edu',
        password: 'Password@123',
      }
    });

    assert(studentLoginRes.status === 200, 'Student successfully logged in via /api/auth/student/login');
    const studentToken = studentLoginRes.data.token;
    assert(!!studentToken, 'JWT token generated for student');

    // =========================================================================
    // TEST 5: Student Files Grievance (Canteen food issue) -> Saved in Shared DB
    // =========================================================================
    const submitGrievanceRes = await request('/api/complaints', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: `Bearer ${studentToken}`
      },
      body: {
        title: 'Poor hygiene and cold food served at North Canteen',
        category: 'Canteen',
        location: 'North Block Canteen Floor 1',
        priority: 'High',
        description: 'The food served today was cold and cafeteria staff were not wearing gloves or hairnets.',
      }
    });

    assert(submitGrievanceRes.status === 201, 'Grievance submitted successfully into shared database');
    const complaint = submitGrievanceRes.data.complaint;
    const complaintId = complaint.complaintId;
    assert(complaint.status === 'Submitted', 'Initial complaint status is Submitted');
    assert(complaint.category === 'Canteen', 'Complaint category recorded as Canteen');
    assert(!!complaintId, `Complaint assigned auto-generated ID: ${complaintId}`);

    // =========================================================================
    // TEST 6: Admin Flow (Port 5174) -> Login via /api/auth/admin/login
    // =========================================================================
    console.log('\n--- TEST GROUP 3: Admin Flow (Port 5174) & Cross-Host Verification ---');
    const adminLoginRes = await request('/api/auth/admin/login', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5174' },
      body: {
        email: 'admin@college.edu',
        password: 'AdminPassword@123',
      }
    });

    assert(adminLoginRes.status === 200, 'Admin successfully logged in via /api/auth/admin/login');
    const adminToken = adminLoginRes.data.token;
    assert(adminLoginRes.data.user.role === 'admin', 'Admin role verified');

    // =========================================================================
    // TEST 7: Admin Fetches All Complaints from Shared Database
    // =========================================================================
    const adminComplaintsRes = await request('/api/admin/complaints', {
      headers: {
        Origin: 'http://localhost:5174',
        Authorization: `Bearer ${adminToken}`
      }
    });

    assert(adminComplaintsRes.status === 200, 'Admin successfully fetched all complaints from shared DB');
    const complaintsList = adminComplaintsRes.data.complaints;
    const foundComplaint = complaintsList.find(c => c.complaintId === complaintId);
    assert(!!foundComplaint, `Admin sees the complaint submitted by student on port 5173 (ID: ${complaintId})`);

    // =========================================================================
    // TEST 8: Admin Assigns Department & Staff to Grievance
    // =========================================================================
    const assignDeptRes = await request(`/api/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        Origin: 'http://localhost:5174',
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        department: canteenDept._id,
        staffId: canteenStaff._id,
      }
    });

    assert(assignDeptRes.status === 200, 'Admin assigned Department & Staff in shared DB');
    assert(assignDeptRes.data.complaint.assignedDepartmentName === 'Canteen & Food Services', 'Department recorded');
    assert(assignDeptRes.data.complaint.assignedStaffName === 'Chef Gordon', 'Assigned staff recorded');

    // =========================================================================
    // TEST 9: Admin Updates Status to "In Progress"
    // =========================================================================
    const inProgressRes = await request(`/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        Origin: 'http://localhost:5174',
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        status: 'In Progress',
        comment: 'Inspection team dispatched to North Canteen cafeteria.'
      }
    });

    assert(inProgressRes.status === 200, 'Admin updated status to In Progress');
    assert(inProgressRes.data.complaint.status === 'In Progress', 'Status updated in shared DB');

    // =========================================================================
    // TEST 10: Admin Resolves Grievance with Resolution Message
    // =========================================================================
    const resolveRes = await request(`/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        Origin: 'http://localhost:5174',
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        status: 'Resolved',
        resolutionSummary: 'North Canteen food heating equipment replaced and mandatory hairnets/gloves hygiene policy enforced for all cafeteria staff.',
        actionTaken: 'Equipment Replaced & Hygiene Inspection Passed'
      }
    });

    assert(resolveRes.status === 200, 'Admin resolved grievance with official resolution message');
    assert(resolveRes.data.complaint.status === 'Resolved', 'Status is Resolved');
    assert(!!resolveRes.data.complaint.resolutionDetails?.summary, 'Resolution message stored in shared DB');
    assert(!!resolveRes.data.complaint.resolvedAt, 'resolvedAt timestamp recorded');

    // =========================================================================
    // TEST 11: Student on Port 5173 Views Complaint Details -> Realtime DB Sync
    // =========================================================================
    console.log('\n--- TEST GROUP 4: Student Verification of Admin Updates (Port 5173) ---');
    const studentCheckRes = await request(`/api/complaints/${complaintId}`, {
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert(studentCheckRes.status === 200, 'Student retrieves grievance on port 5173');
    const studentViewComplaint = studentCheckRes.data.complaint;
    assert(studentViewComplaint.status === 'Resolved', 'Student sees status as Resolved');
    assert(studentViewComplaint.assignedDepartmentName === 'Canteen & Food Services' || studentViewComplaint.assignedDepartment?.name === 'Canteen & Food Services', 'Student sees assigned department');
    assert(studentViewComplaint.assignedStaffName === 'Chef Gordon' || studentViewComplaint.assignedStaff?.name === 'Chef Gordon', 'Student sees assigned staff');
    assert(studentViewComplaint.resolutionDetails?.summary?.includes('heating equipment replaced'), 'Student sees exact resolution message entered by Admin on port 5174');
    assert(studentCheckRes.data.updates && studentCheckRes.data.updates.length >= 3, `Student sees full lifecycle timeline entries (${studentCheckRes.data.updates.length} events)`);

    // =========================================================================
    // TEST 12: Security - Student Blocked from Admin APIs
    // =========================================================================
    console.log('\n--- TEST GROUP 5: Security & Access Isolation ---');
    const studentAdminAttempt = await request('/api/admin/complaints', {
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: `Bearer ${studentToken}`
      }
    });

    assert(studentAdminAttempt.status === 403, 'Student token is blocked from /api/admin/complaints (403 Forbidden)');

    // =========================================================================
    // TEST 13: Privacy - Student 2 Cannot Access Student 1's Grievance
    // =========================================================================
    const student2RegisterRes = await request('/api/auth/student/register', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: {
        fullName: 'Priya Patel',
        email: 'priya.patel@college.edu',
        studentId: 'STU-2026-002',
        department: 'Electronics',
        password: 'Password@123',
      }
    });
    const student2Token = student2RegisterRes.data.token;

    const student2AttemptRes = await request(`/api/complaints/${complaintId}`, {
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: `Bearer ${student2Token}`
      }
    });

    assert(student2AttemptRes.status === 404 || student2AttemptRes.status === 403, 'Student 2 cannot view Student 1 complaint (Forbidden / Not Found)');

    console.log('\n============================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Test run failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runDualHostTests();
