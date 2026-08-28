/**
 * Canteen Complaint Category End-to-End Automated Test Suite
 * Tests Canteen category submission, AI categorization & heuristics, department routing,
 * lifecycle progression, resolution, filtering, and analytics integration.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const aiRoutes = require('../routes/aiRoutes');
const User = require('../models/User');
const { Complaint, CATEGORIES } = require('../models/Complaint');
const { Department } = require('../models/Department');
const Staff = require('../models/Staff');
const { generateToken } = require('../utils/jwt');
const aiService = require('../services/aiService');

// Setup test Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

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

const runCanteenCategoryTests = async () => {
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
  console.log('🧪 Starting Canteen Complaint Category Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create();
    const dbUri = mongod.getUri();
    await mongoose.connect(dbUri);
    console.log('✅ Connected to In-Memory Test Database\n');

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed default departments including Canteen Management
    await Department.seedDefaultsIfEmpty();

    // 1. Seed Student and Admin
    const student = await User.create({
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@college.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-2026-045',
      department: 'Electrical Engineering',
    });
    const tokenStudent = generateToken(student._id, student.role);

    const admin = await User.create({
      fullName: 'Campus Admin',
      email: 'admin@college.edu',
      password: 'password123',
      role: 'admin',
      department: 'Administration',
    });
    const tokenAdmin = generateToken(admin._id, admin.role);

    console.log('--- Scenario 1: Backend Enum & Model Validation ---');
    assert(CATEGORIES.includes('Canteen'), 'CATEGORIES enum includes "Canteen"');

    console.log('\n--- Scenario 2: AI Suggestion & Heuristic Recognition for Canteen ---');
    const aiAnalysis = await aiService.analyzeComplaint({
      title: 'Food quality and hygiene issue in central cafeteria',
      description: 'The food served in the college canteen was not hygienic and drinking water cooler was dirty.',
      location: 'Central Canteen, Ground Floor',
    });
    assert(aiAnalysis.suggestedCategory === 'Canteen', 'AI correctly suggests category "Canteen" (got ' + aiAnalysis.suggestedCategory + ')');
    assert(Array.isArray(aiAnalysis.actionItems) && aiAnalysis.actionItems.length > 0, 'AI generates canteen-specific action items');
    assert(
      aiAnalysis.actionItems.some((item) => item.toLowerCase().includes('food') || item.toLowerCase().includes('canteen') || item.toLowerCase().includes('kitchen')),
      'Action items contain food/canteen inspection instructions'
    );

    console.log('\n--- Scenario 3: Student Submits Canteen Grievance ---');
    const submitRes = await request('/api/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent}` },
      body: {
        title: 'Overcharging and poor food hygiene in block B canteen',
        description: 'Snacks sold above MRP and canteen staff was not wearing gloves or hairnets.',
        category: 'Canteen',
        location: 'Block B Canteen',
        priority: 'High',
      },
    });
    assert(submitRes.status === 201, 'Student successfully submits Canteen complaint with 201 Created (got ' + submitRes.status + ')');
    assert(submitRes.data?.complaint?.category === 'Canteen', 'Saved complaint has category "Canteen"');
    const complaintId = submitRes.data?.complaint?.complaintId;
    const complaintMongoId = submitRes.data?.complaint?._id;

    console.log('\n--- Scenario 4: Student Retrieval & Timeline View ---');
    const myComplaintsRes = await request('/api/complaints/my', {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    assert(myComplaintsRes.status === 200, 'Student retrieves my complaints list');
    const foundCanteen = myComplaintsRes.data?.complaints?.find((c) => c.complaintId === complaintId);
    assert(Boolean(foundCanteen), 'Canteen complaint returned in student list');
    assert(foundCanteen?.category === 'Canteen', 'Category is strictly "Canteen"');

    const detailsRes = await request(`/api/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    assert(detailsRes.status === 200, 'Student views Canteen complaint details (got 200)');
    assert(detailsRes.data?.complaint?.category === 'Canteen', 'Details view reflects category "Canteen"');

    console.log('\n--- Scenario 5: Admin Department Routing to "Canteen Management" ---');
    const deptsRes = await request('/api/admin/departments', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(deptsRes.status === 200, 'Admin fetches institutional departments list');
    const canteenDept = deptsRes.data?.departments?.find((d) => d.name === 'Canteen Management');
    assert(Boolean(canteenDept), 'Institutional departments include "Canteen Management"');

    const canteenDeptId = canteenDept.id || canteenDept._id;

    // Create a staff member under Canteen Management
    const canteenStaff = await Staff.create({
      name: 'Chef Suresh Kumar',
      email: 'suresh.canteen@college.edu',
      employeeId: 'EMP-CANT-001',
      phone: '+91 9876543210',
      department: canteenDeptId,
      active: true,
    });

    // Admin assigns Canteen complaint to Canteen Management and Chef Suresh
    const assignRes = await request(`/api/admin/complaints/${complaintMongoId}/assign`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        departmentId: canteenDeptId.toString(),
        staffId: canteenStaff._id.toString(),
      },
    });
    assert(assignRes.status === 200, 'Admin successfully routes complaint to Canteen Management department (got 200)');
    assert(assignRes.data?.complaint?.status === 'Assigned', 'Status transitioned to Assigned');

    console.log('\n--- Scenario 6: Status Lifecycle & Resolution Workflow ---');
    // In Progress
    const inProgressRes = await request(`/api/admin/complaints/${complaintMongoId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: { status: 'In Progress', comment: 'Canteen supervisor inspecting Block B stall.' },
    });
    assert(inProgressRes.status === 200, 'Status updated to In Progress');

    // Resolve
    const resolveRes = await request(`/api/admin/complaints/${complaintMongoId}/resolution`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        summary: 'Enforced official college MRP price list and mandated hairnets/gloves for all food handlers.',
        actionTaken: 'Food inspection completed, pricing warning issued to vendor, sanitation audit verified.',
      },
    });
    assert(resolveRes.status === 200, 'Admin resolves Canteen complaint with 200 OK (got 200)');
    assert(resolveRes.data?.complaint?.status === 'Resolved', 'Status updated to Resolved');
    assert(Boolean(resolveRes.data?.complaint?.resolutionDetails?.summary), 'Resolution summary is recorded');

    console.log('\n--- Scenario 7: Admin Category Filter & Search ---');
    const filterRes = await request('/api/admin/complaints?category=Canteen', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(filterRes.status === 200, 'Admin filters complaints by category=Canteen (got 200)');
    assert(filterRes.data?.complaints?.length === 1, 'Filter returns exactly 1 Canteen complaint');
    assert(filterRes.data?.complaints[0]?.complaintId === complaintId, 'Returned correct complaint ID');

    console.log('\n--- Scenario 8: Dashboard Statistics & Analytics Aggregations ---');
    const statsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(statsRes.status === 200, 'Admin gets dashboard stats (got 200)');
    assert(statsRes.data?.distributions?.byCategory?.Canteen === 1, 'Category statistics include Canteen count = 1');

    const analyticsRes = await request('/api/admin/analytics?range=all', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(analyticsRes.status === 200, 'Admin gets analytics dashboard (got 200)');
    assert(analyticsRes.data?.charts?.byCategory?.Canteen === 1, 'Analytics category count for Canteen is 1');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed}/${total} assertions passed`);
    console.log('====================================================\n');

    if (passed === total) {
      console.log('🎉 ALL CANTEEN CATEGORY TESTS PASSED PERFECTLY!');
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
  runCanteenCategoryTests();
}

module.exports = runCanteenCategoryTests;
