/**
 * Complete End-to-End (E2E) Test Suite
 * Covers:
 * 1. Complete Student Journey (Register -> Login -> Dashboard -> Submit Complaint -> Attachment -> View -> Search -> Filter -> Timeline -> Logout)
 * 2. Complete Admin Journey (Login -> Dashboard Stats -> View All -> Search -> Filter -> Open -> Assign Dept -> Assign Staff -> Priority -> Status -> Comment -> Resolve -> Close -> Analytics)
 * 3. Security & Access Control (Student calling Admin API, Cross-Student Access, Unauthenticated Calls, Invalid JWT, Invalid ObjectId, Unauthorized Updates)
 * 4. File Upload Validation (Valid PNG, Valid PDF, Invalid Extension, Oversized File, Path Traversal)
 * 5. All Major API Endpoints Verification
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');

const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');
const aiRoutes = require('../routes/aiRoutes');
const { connectDB, getDBStatus } = require('../config/db');
const { mongoSanitizeMiddleware } = require('../utils/sanitize');
const { Department } = require('../models/Department');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitizeMiddleware);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health checks
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    message: 'College Complaint Management System API is running',
    environment: process.env.NODE_ENV || 'test',
    database: dbStatus,
  });
});

app.get('/api/health/db', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(dbStatus.isConnected ? 200 : 503).json({
    status: dbStatus.isConnected ? 'ok' : 'database_unavailable',
    database: dbStatus,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

let mongod;
let server;
let baseUrl;

const request = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  let headers = options.headers || {};
  let body = options.body;

  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
};

const runE2ETests = async () => {
  console.log('\n======================================================');
  console.log('🚀 RUNNING COMPLETE END-TO-END (E2E) TEST SUITE');
  console.log('======================================================\n');

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
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}/api`;
        resolve();
      });
    });

    // Seed default institutional departments
    await Department.seedDefaultsIfEmpty();

    // =========================================================================
    // PART 1: STUDENT WORKFLOW (Steps 1 to 10)
    // =========================================================================
    console.log('--- PART 1: COMPLETE STUDENT WORKFLOW ---');

    // 1. Register Student
    const studentRegPayload = {
      fullName: 'John Doe',
      email: 'john.doe@college.edu',
      studentId: 'STU-2026-001',
      department: 'Computer Science',
      password: 'StudentPassword@123',
    };

    const regRes = await request('/auth/register', {
      method: 'POST',
      body: studentRegPayload,
    });
    assert(regRes.status === 201, 'Student Step 1: Student registered successfully (201 Created)');
    assert(regRes.data?.user?.email === 'john.doe@college.edu', 'Student Step 1: Registered user email matches');
    assert(regRes.data?.role === 'student', 'Student Step 1: Role is strictly "student"');

    // 2. Login Student
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'john.doe@college.edu',
        password: 'StudentPassword@123',
      },
    });
    assert(loginRes.status === 200, 'Student Step 2: Student logged in successfully (200 OK)');
    const studentToken = loginRes.data?.token;
    const studentId = loginRes.data?.user?.id;
    assert(!!studentToken, 'Student Step 2: Valid JWT token received');

    // 3. Open Student Dashboard (Get user profile + my complaints)
    const profileRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(profileRes.status === 200, 'Student Step 3: Verified student profile via /auth/me');

    const dashboardComplaintsRes = await request('/complaints/my', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(dashboardComplaintsRes.status === 200, 'Student Step 3: Student dashboard retrieved my complaints list (200 OK)');
    assert(Array.isArray(dashboardComplaintsRes.data?.complaints), 'Student Step 3: Complaints list is an array');

    // 4 & 5. Submit Complaint with Valid Attachment (Multipart Form Data)
    const formData = new FormData();
    formData.append('title', 'Ceiling fan malfunctioning and making screeching noise');
    formData.append('description', 'The ceiling fan in Room 302 of CSE Block is shaking violently and emitting sparks.');
    formData.append('category', 'Classroom');
    formData.append('location', 'CSE Block Room 302');
    formData.append('priority', 'High');

    // Create a mock image file blob
    const imageBlob = new Blob(['mock-image-binary-data'], { type: 'image/png' });
    formData.append('attachment', imageBlob, 'fan_defect.png');

    const submitRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData,
    });

    assert(submitRes.status === 201, 'Student Step 4 & 5: Submitted complaint with valid attachment (201 Created)');
    const complaint = submitRes.data?.complaint;
    const complaintId = complaint?._id;
    const complaintTrackingCode = complaint?.complaintId;
    assert(!!complaintId, 'Student Step 4: Complaint ID assigned');
    assert(complaintTrackingCode?.startsWith('CMP-'), 'Student Step 4: Sequential CMP tracking ID generated');
    assert(complaint?.attachments?.length === 1, 'Student Step 5: Evidence attachment successfully recorded');
    assert(complaint?.attachments[0]?.fileName?.includes('evidence-'), 'Student Step 5: Safe unique filename assigned');

    // 6. View Complaint Details
    const viewRes = await request(`/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(viewRes.status === 200, 'Student Step 6: Student viewed complaint details (200 OK)');
    assert(viewRes.data?.complaint?.title === 'Ceiling fan malfunctioning and making screeching noise', 'Student Step 6: Complaint details match');

    // 7. Search Complaint
    const searchRes = await request('/complaints/my?search=screeching', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(searchRes.status === 200, 'Student Step 7: Student search query executed successfully (200 OK)');
    assert(searchRes.data?.complaints?.length === 1, 'Student Step 7: Search correctly matched keyword in description');

    // 8. Filter Complaints (by category and status)
    const filterRes = await request('/complaints/my?category=Classroom&status=Submitted', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(filterRes.status === 200, 'Student Step 8: Filter by Category=Classroom & Status=Submitted succeeded (200 OK)');
    assert(filterRes.data?.complaints?.length === 1, 'Student Step 8: Filter returned 1 matching complaint');

    const nonMatchFilterRes = await request('/complaints/my?category=Hostel', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(nonMatchFilterRes.data?.complaints?.length === 0, 'Student Step 8: Non-matching filter correctly returns empty list');

    // 9. View Complaint Timeline Updates
    const timelineRes = await request(`/complaints/${complaintId}/updates`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(timelineRes.status === 200, 'Student Step 9: Retrieved complaint timeline updates (200 OK)');
    assert(timelineRes.data?.updates?.length >= 1, 'Student Step 9: Timeline contains initial SUBMISSION event');
    assert(timelineRes.data?.updates[0]?.updateType === 'SUBMISSION', 'Student Step 9: Timeline event is SUBMISSION');

    // 10. Logout Simulation (Clearing client token / verifying auth guard after invalidation)
    const postLogoutRes = await request('/complaints/my', {
      headers: { Authorization: '' },
    });
    assert(postLogoutRes.status === 401, 'Student Step 10: Unauthenticated request post-logout correctly blocked (401 Unauthorized)');

    // =========================================================================
    // PART 2: ADMIN WORKFLOW (Steps 1 to 16)
    // =========================================================================
    console.log('\n--- PART 2: COMPLETE ADMIN WORKFLOW ---');

    // Create Admin User
    const User = require('../models/User');
    const adminUser = await User.create({
      fullName: 'Dr. Jane Smith (Admin)',
      email: 'admin.jane@college.edu',
      password: 'AdminPassword@123',
      department: 'Administration',
      role: 'admin',
    });

    // 1. Login as Admin
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin.jane@college.edu',
        password: 'AdminPassword@123',
      },
    });
    assert(adminLoginRes.status === 200, 'Admin Step 1: Admin login successful (200 OK)');
    const adminToken = adminLoginRes.data?.token;
    assert(adminLoginRes.data?.role === 'admin', 'Admin Step 1: Verified admin role');

    // 2. Open Admin Dashboard
    const adminMeRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminMeRes.status === 200, 'Admin Step 2: Verified admin profile via /auth/me');

    // 3. View Statistics
    const statsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.status === 200, 'Admin Step 3: Admin retrieved dashboard statistics (200 OK)');
    assert(statsRes.data?.stats?.total >= 1, 'Admin Step 3: Statistics include total complaint count');
    assert(statsRes.data?.sla?.onTrack !== undefined, 'Admin Step 3: SLA pipeline statistics present');

    // 4. View All Complaints
    const allComplaintsRes = await request('/admin/complaints', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(allComplaintsRes.status === 200, 'Admin Step 4: Admin retrieved all institutional complaints (200 OK)');
    assert(allComplaintsRes.data?.complaints?.length >= 1, 'Admin Step 4: Complaints list populated');

    // 5. Search Complaints
    const adminSearchRes = await request('/admin/complaints?search=Room 302', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSearchRes.status === 200, 'Admin Step 5: Admin search executed successfully (200 OK)');
    assert(adminSearchRes.data?.complaints?.length === 1, 'Admin Step 5: Search found matching complaint');

    // 6. Filter Complaints
    const adminFilterRes = await request('/admin/complaints?category=Classroom&priority=High', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminFilterRes.status === 200, 'Admin Step 6: Multi-filter Category=Classroom & Priority=High succeeded (200 OK)');
    assert(adminFilterRes.data?.complaints?.length === 1, 'Admin Step 6: Returned 1 matching record');

    // 7. Open Complaint Details (Admin view)
    const adminComplaintDetailsRes = await request(`/admin/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminComplaintDetailsRes.status === 200, 'Admin Step 7: Opened complaint management details (200 OK)');
    assert(adminComplaintDetailsRes.data?.complaint?._id === complaintId, 'Admin Step 7: Correct complaint loaded');

    // Setup Department & Staff for Assignment
    const electricalDept = await Department.findOne({ name: 'Electrical Maintenance' });
    const Staff = require('../models/Staff');
    const electricianStaff = await Staff.create({
      name: 'Robert Sparks',
      email: 'robert.sparks@college.edu',
      employeeId: 'EMP-ELEC-01',
      department: electricalDept._id,
      phone: '+1-555-0199',
      active: true,
    });

    // 8. Assign Department
    const assignDeptRes = await request(`/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { departmentId: electricalDept._id.toString() },
    });
    assert(assignDeptRes.status === 200, 'Admin Step 8: Assigned complaint to Electrical Maintenance department (200 OK)');
    assert(assignDeptRes.data?.complaint?.status === 'Assigned', 'Admin Step 8: Status transitioned to "Assigned"');

    // 9. Assign Staff
    const assignStaffRes = await request(`/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { staffId: electricianStaff._id.toString() },
    });
    assert(assignStaffRes.status === 200, 'Admin Step 9: Assigned staff technician Robert Sparks (200 OK)');
    const staffMatches =
      assignStaffRes.data?.complaint?.assignedStaffName === 'Robert Sparks' ||
      String(assignStaffRes.data?.complaint?.assignedStaff?._id || assignStaffRes.data?.complaint?.assignedStaff?.id || assignStaffRes.data?.complaint?.assignedStaff) === electricianStaff._id.toString();
    assert(staffMatches === true, 'Admin Step 9: Staff assignment persisted');

    // 10. Change Priority
    const changePriorityRes = await request(`/admin/complaints/${complaintId}/priority`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { priority: 'Critical' },
    });
    assert(changePriorityRes.status === 200, 'Admin Step 10: Changed priority to "Critical" (200 OK)');
    assert(changePriorityRes.data?.complaint?.priority === 'Critical', 'Admin Step 10: Priority updated');

    // 11. Change Status (to In Progress)
    const changeStatusRes = await request(`/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'In Progress' },
    });
    assert(changeStatusRes.status === 200, 'Admin Step 11: Changed status to "In Progress" (200 OK)');
    assert(changeStatusRes.data?.complaint?.status === 'In Progress', 'Admin Step 11: Status transitioned');

    // 12. Add Admin Comment
    const commentRes = await request(`/admin/complaints/${complaintId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { message: 'Technician dispatched with replacement capacitor and motor unit.' },
    });
    assert(commentRes.status === 201 || commentRes.status === 200, 'Admin Step 12: Added administrative comment to timeline (201 Created)');

    // 13 & 14. Add Resolution & Resolve Complaint
    const resolveRes = await request(`/admin/complaints/${complaintId}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        summary: 'Replaced fan capacitor and tightened ceiling anchor bracket.',
        actionTaken: 'Replaced fan capacitor and tightened ceiling anchor bracket. Operational test passed.',
        resolutionNotes: 'No further vibration detected. Classroom is safe for lectures.',
      },
    });
    assert(resolveRes.status === 200, 'Admin Step 13 & 14: Resolved complaint with official resolution summary (200 OK)');
    assert(resolveRes.data?.complaint?.status === 'Resolved', 'Admin Step 14: Status is now "Resolved"');
    assert(!!resolveRes.data?.complaint?.resolvedAt, 'Admin Step 14: resolvedAt timestamp recorded');

    // 15. Close Complaint
    const closeRes = await request(`/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Closed' },
    });
    assert(closeRes.status === 200, 'Admin Step 15: Closed complaint successfully (200 OK)');
    assert(closeRes.data?.complaint?.status === 'Closed', 'Admin Step 15: Status is now "Closed"');

    // 16. View Analytics Dashboard
    const analyticsRes = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(analyticsRes.status === 200, 'Admin Step 16: Admin analytics dashboard loaded successfully (200 OK)');
    assert(analyticsRes.data?.kpi?.totalComplaints >= 1, 'Admin Step 16: KPI metrics include total complaints');
    assert(analyticsRes.data?.kpi?.resolvedComplaints >= 1, 'Admin Step 16: KPI metrics include resolved count');
    assert(Array.isArray(analyticsRes.data?.departmentPerformance), 'Admin Step 16: Department performance matrix present');

    // =========================================================================
    // PART 3: SECURITY & ACCESS CONTROL VERIFICATION
    // =========================================================================
    console.log('\n--- PART 3: SECURITY & ACCESS CONTROL WORKFLOW ---');

    // 1. Student Accessing Admin Route
    const studentOnAdminRoute = await request('/admin/complaints', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentOnAdminRoute.status === 403, 'Security 1: Student accessing /api/admin/complaints blocked with 403 Forbidden');

    const studentOnAdminStats = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentOnAdminStats.status === 403, 'Security 1: Student accessing /api/admin/stats blocked with 403 Forbidden');

    // 2. Student Accessing Another Student's Complaint
    const otherStudent = await User.create({
      fullName: 'Alice Walker',
      email: 'alice.walker@college.edu',
      studentId: 'STU-2026-002',
      department: 'Physics',
      password: 'Password@123',
      role: 'student',
    });
    const otherStudentLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'alice.walker@college.edu', password: 'Password@123' },
    });
    const otherStudentToken = otherStudentLogin.data?.token;

    const crossStudentViewRes = await request(`/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(crossStudentViewRes.status === 403, 'Security 2: Student accessing another student\'s complaint blocked with 403 Forbidden');

    const crossStudentDeleteRes = await request(`/complaints/${complaintId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(crossStudentDeleteRes.status === 403, 'Security 2: Student deleting another student\'s complaint blocked with 403 Forbidden');

    // 3. Unauthenticated API Calls
    const unauthComplaintsRes = await request('/complaints/my');
    assert(unauthComplaintsRes.status === 401, 'Security 3: Unauthenticated complaint request blocked with 401 Unauthorized');

    const unauthAdminRes = await request('/admin/stats');
    assert(unauthAdminRes.status === 401, 'Security 3: Unauthenticated admin request blocked with 401 Unauthorized');

    // 4. Invalid / Tampered JWT
    const invalidJwtRes = await request('/complaints/my', {
      headers: { Authorization: 'Bearer invalid.tampered.token123' },
    });
    assert(invalidJwtRes.status === 401, 'Security 4: Tampered/Malformed JWT token rejected with 401 Unauthorized');

    // 5. Invalid ObjectId handling (Graceful 400 Bad Request)
    const invalidObjectIdRes = await request('/admin/departments/not-a-valid-object-id', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Sample' },
    });
    assert(invalidObjectIdRes.status === 400, 'Security 5: Invalid ObjectId parameter handled with 400 Bad Request');

    // 6. Unauthorized Updates (Student trying to change status/priority directly via admin endpoint)
    const studentTryingStatusChange = await request(`/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { status: 'Resolved' },
    });
    assert(studentTryingStatusChange.status === 403, 'Security 6: Student trying to change status via admin endpoint blocked with 403 Forbidden');

    // =========================================================================
    // PART 4: FILE UPLOAD SECURITY WORKFLOW
    // =========================================================================
    console.log('\n--- PART 4: FILE UPLOAD SECURITY WORKFLOW ---');

    // 1. Valid Image Upload (PNG)
    const validImageForm = new FormData();
    validImageForm.append('title', 'Valid Image Grievance');
    validImageForm.append('description', 'Valid image attachment grievance description test.');
    validImageForm.append('category', 'Laboratory');
    validImageForm.append('location', 'Physics Lab 1');
    validImageForm.append('attachment', new Blob(['image-binary'], { type: 'image/png' }), 'lab_microscope.png');

    const validImgRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: validImageForm,
    });
    assert(validImgRes.status === 201, 'Files 1: Valid PNG image upload succeeded (201 Created)');

    // 2. Valid PDF Upload
    const validPdfForm = new FormData();
    validPdfForm.append('title', 'Valid PDF Grievance');
    validPdfForm.append('description', 'Valid PDF attachment grievance description test.');
    validPdfForm.append('category', 'Library');
    validPdfForm.append('location', 'Central Library');
    validPdfForm.append('attachment', new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' }), 'book_receipt.pdf');

    const validPdfRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: validPdfForm,
    });
    assert(validPdfRes.status === 201, 'Files 2: Valid PDF document upload succeeded (201 Created)');

    // 3. Invalid Extension (.exe / .php / .sh)
    const invalidExtForm = new FormData();
    invalidExtForm.append('title', 'Invalid Script Grievance');
    invalidExtForm.append('description', 'Attempting to upload executable payload.');
    invalidExtForm.append('category', 'Wi-Fi');
    invalidExtForm.append('location', 'Hostel A');
    invalidExtForm.append('attachment', new Blob(['echo attack'], { type: 'application/x-sh' }), 'exploit.sh');

    const invalidExtRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: invalidExtForm,
    });
    assert(invalidExtRes.status === 400, 'Files 3: Invalid extension upload rejected with 400 Bad Request');

    // 4. Oversized File (> 5MB)
    const oversizedBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
    const oversizedForm = new FormData();
    oversizedForm.append('title', 'Oversized File Grievance');
    oversizedForm.append('description', 'Attempting to upload 6MB file exceeding 5MB cap.');
    oversizedForm.append('category', 'Infrastructure');
    oversizedForm.append('location', 'Auditorium');
    oversizedForm.append('attachment', new Blob([oversizedBuffer], { type: 'image/jpeg' }), 'large_banner.jpg');

    const oversizedRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: oversizedForm,
    });
    assert(oversizedRes.status === 400, 'Files 4: Oversized file (>5MB) rejected with 400 Bad Request');

    // 5. Malicious Filename / Path Traversal / Double Extension Attempt (via upload fileFilter)
    const uploadMiddleware = require('../middleware/uploadMiddleware');
    let traversalBlocked = false;
    uploadMiddleware.upload.fileFilter(
      {},
      { originalname: '../../etc/passwd.png', mimetype: 'image/png' },
      (err, allow) => {
        if (err) traversalBlocked = true;
      }
    );
    assert(traversalBlocked === true, 'Files 5: Malicious path traversal filename rejected with 400 Bad Request');

    // =========================================================================
    // PART 5: MAJOR API ENDPOINTS SANITY AUDIT
    // =========================================================================
    console.log('\n--- PART 5: MAJOR API ENDPOINTS SANITY AUDIT ---');

    // 1. Health checks
    const healthRes = await request('/health');
    assert(healthRes.status === 200 && healthRes.data?.status === 'ok', 'API 1: GET /api/health returned 200 OK');

    const healthDbRes = await request('/health/db');
    assert(healthDbRes.status === 200, 'API 2: GET /api/health/db returned 200 OK');

    // 2. AI suggestions endpoint
    const aiSuggestRes = await request('/complaints/suggest', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { title: 'Water leaking from ceiling', description: 'Water pipe broke near canteen entrance.' },
    });
    assert(aiSuggestRes.status === 200, 'API 3: POST /api/complaints/suggest returned 200 OK');
    assert(!!aiSuggestRes.data?.suggestions, 'API 3: AI suggestions payload received');

    // 3. AI duplicate detection endpoint
    const duplicateRes = await request('/complaints/check-duplicates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { title: 'Ceiling fan broken', description: 'Violent shaking room 302', category: 'Classroom' },
    });
    assert(duplicateRes.status === 200, 'API 4: POST /api/complaints/check-duplicates returned 200 OK');

    // 4. Department management endpoints
    const getDeptsRes = await request('/admin/departments', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getDeptsRes.status === 200, 'API 5: GET /api/admin/departments returned 200 OK');
    assert(getDeptsRes.data?.departments?.length >= 5, 'API 5: Default institutional departments present');

    // 5. Staff management endpoints
    const getStaffRes = await request('/admin/staff', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getStaffRes.status === 200, 'API 6: GET /api/admin/staff returned 200 OK');

    // 6. Upvote endpoint ("👍 I'm facing this issue too")
    const upvoteRes = await request(`/complaints/${complaintId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    assert(upvoteRes.status === 200, 'API 7: POST /api/complaints/:id/upvote succeeded (200 OK)');
    assert(upvoteRes.data?.hasUpvoted === true, 'API 7: Student upvote registered');

    // 7. Student Resolution Feedback endpoint (1-5 star rating)
    const feedbackRes = await request(`/complaints/${complaintId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { rating: 5, comment: 'Thank you for replacing the fan quickly!' },
    });
    assert(feedbackRes.status === 200, 'API 8: POST /api/complaints/:id/feedback succeeded (200 OK)');
    assert(feedbackRes.data?.feedback?.rating === 5, 'API 8: 5-star rating recorded');

    // 8. Soft Delete endpoint
    const deleteRes = await request(`/complaints/${complaintId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(deleteRes.status === 200, 'API 9: DELETE /api/complaints/:id soft-deleted complaint (200 OK)');

    console.log('\n======================================================');
    console.log(`🎉 END-TO-END (E2E) TEST SUITE COMPLETED: ${passed}/${total} assertions passed`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal E2E Test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((res) => server.close(res));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
};

runE2ETests();
