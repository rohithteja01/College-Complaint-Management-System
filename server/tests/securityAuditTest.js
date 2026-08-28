/**
 * Comprehensive Security Audit & Hardening Test Suite
 * Validates Authentication, Authorization, Input Validation, NoSQL Injection,
 * ReDoS Resistance, File Upload Security, and Security Headers.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const helmet = require('helmet');

const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const adminRoutes = require('../routes/adminRoutes');

const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const { Department } = require('../models/Department');
const Staff = require('../models/Staff');
const { generateToken, verifyToken } = require('../utils/jwt');
const { escapeRegex, sanitizeNoSql, mongoSanitizeMiddleware } = require('../utils/sanitize');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { protect, requireAdmin, requireStudent } = require('../middleware/authMiddleware');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitizeMiddleware);

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
  return { status: res.status, data, headers: res.headers };
};

const runSecurityAuditTests = async () => {
  console.log('\n======================================================');
  console.log('🔒 STARTING COMPREHENSIVE SECURITY AUDIT TEST SUITE');
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

    // =========================================================================
    // 1. AUTHENTICATION & PASSWORD HASHING AUDIT
    // =========================================================================
    console.log('--- 1. Authentication & Password Security ---');

    const rawPassword = 'StudentSecret@123';
    const studentUser = await User.create({
      fullName: 'Vulnerability Auditor',
      email: 'auditor@college.edu',
      studentId: 'STU-SEC-001',
      department: 'Computer Science',
      password: rawPassword,
      role: 'student',
    });

    assert(
      studentUser.password !== rawPassword,
      'Passwords are never stored in plain text (bcrypt hash verified)'
    );

    const isMatch = await studentUser.comparePassword(rawPassword);
    assert(isMatch === true, 'bcrypt compare accurately validates correct password');

    const isWrongMatch = await studentUser.comparePassword('WrongPassword!');
    assert(isWrongMatch === false, 'bcrypt compare strictly rejects invalid password');

    // JWT Signing & Expiration Integrity
    const studentToken = generateToken(studentUser._id, studentUser.role);
    assert(typeof studentToken === 'string' && studentToken.split('.').length === 3, 'JWT token is properly formatted with 3 parts');

    const decoded = verifyToken(studentToken);
    assert(decoded.id.toString() === studentUser._id.toString(), 'Decoded JWT payload contains correct user ID');
    assert(decoded.role === 'student', 'Decoded JWT payload contains correct user role');

    // Tampered Token Rejection
    let tamperedError = false;
    try {
      verifyToken(studentToken + 'tampered_signature_bits');
    } catch (e) {
      tamperedError = true;
    }
    assert(tamperedError === true, 'Tampered token signature is rejected by JWT verification');

    // =========================================================================
    // 2. PRIVILEGE ESCALATION ATTEMPT ON REGISTRATION
    // =========================================================================
    console.log('\n--- 2. Privilege Escalation Prevention on Registration ---');

    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Hacker User',
        email: 'hacker@college.edu',
        studentId: 'STU-HACK-01',
        department: 'Information Technology',
        password: 'Password123!',
        role: 'admin', // Malicious attempt to escalate role to admin
      },
    });

    assert(regRes.status === 201, 'Registration request completes successfully (201)');
    const registeredUser = await User.findOne({ email: 'hacker@college.edu' });
    assert(
      registeredUser.role === 'student',
      'Privilege escalation thwarted: Registration forcefully restricts role to "student"'
    );

    // =========================================================================
    // 3. AUTHORIZATION & STRICT ROLE-BASED ACCESS CONTROL
    // =========================================================================
    console.log('\n--- 3. Role-Based Access Control & Ownership Isolation ---');

    // 3.1 Unauthenticated Request Rejection
    const unauthRes = await request('/complaints/my');
    assert(unauthRes.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');

    // 3.2 Student Attempting Admin Protected Route
    const studentCallingAdminRes = await request('/admin/complaints', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentCallingAdminRes.status === 403,
      'Student calling Admin-only API /api/admin/complaints is blocked with 403 Forbidden'
    );

    // 3.3 Admin Accessing Admin APIs
    const adminUser = await User.create({
      fullName: 'System Security Admin',
      email: 'admin.sec@college.edu',
      password: 'AdminPassword123!',
      department: 'Administration',
      role: 'admin',
    });
    const adminToken = generateToken(adminUser._id, adminUser.role);

    const adminCallingAdminRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminCallingAdminRes.status === 200,
      'Admin successfully accesses protected administrative API /api/admin/stats'
    );

    // 3.4 Cross-Student Data Privacy Isolation
    const victimComplaint = await Complaint.create({
      title: 'Confidential Disciplinary Inquiry Grievance',
      description: 'Private complaint submitted by Alice.',
      category: 'Other',
      priority: 'High',
      location: 'Administrative Block',
      student: studentUser._id,
      studentName: studentUser.fullName,
      studentEmail: studentUser.email,
      status: 'Submitted',
    });

    const attackerStudent = await User.create({
      fullName: 'Eve Attacker',
      email: 'eve@college.edu',
      studentId: 'STU-EVE-001',
      department: 'Computer Science',
      password: 'Password123!',
      role: 'student',
    });
    const attackerToken = generateToken(attackerStudent._id, attackerStudent.role);

    // Attacker tries to read victim's complaint
    const attackerReadRes = await request(`/complaints/${victimComplaint._id}`, {
      headers: { Authorization: `Bearer ${attackerToken}` },
    });
    assert(
      attackerReadRes.status === 403,
      'Cross-student complaint inspection blocked with 403 Forbidden'
    );

    // Attacker tries to delete victim's complaint
    const attackerDeleteRes = await request(`/complaints/${victimComplaint._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${attackerToken}` },
    });
    assert(
      attackerDeleteRes.status === 403,
      'Cross-student complaint deletion blocked with 403 Forbidden'
    );

    // =========================================================================
    // 4. INPUT VALIDATION & MONGODB OBJECTID HANDLING
    // =========================================================================
    console.log('\n--- 4. Input Validation & Fault-Tolerant Parameter Handling ---');

    // Invalid ObjectId format should return 400 Bad Request rather than 500 CastError
    const invalidIdRes = await request('/admin/departments/invalid-non-hex-id', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'New Name' },
    });
    assert(
      invalidIdRes.status === 400,
      'Malformed ObjectId parameter handled gracefully with 400 Bad Request'
    );

    // =========================================================================
    // 5. NOSQL INJECTION & REGEX RE-DOS MITIGATION
    // =========================================================================
    console.log('\n--- 5. NoSQL Injection & ReDoS Mitigation ---');

    // 5.1 NoSQL Operator Sanitization
    const maliciousPayload = {
      username: 'student',
      password: { $ne: null },
      nested: {
        $gt: 0,
        safeField: 'hello',
      },
    };
    const sanitizedPayload = sanitizeNoSql(maliciousPayload);
    assert(
      sanitizedPayload.password === undefined,
      'NoSQL injection: $ne operator stripped from sanitized payload'
    );
    assert(
      sanitizedPayload.nested.$gt === undefined && sanitizedPayload.nested.safeField === 'hello',
      'Nested NoSQL operators stripped while retaining valid properties'
    );

    // 5.2 Regex ReDoS Protection
    const evilRegexString = '.*+?^${}()|[]\\test';
    const safeRegexResult = escapeRegex(evilRegexString);
    assert(
      safeRegexResult === '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\test',
      'Special regex metacharacters correctly escaped to prevent ReDoS attacks'
    );

    // Search query with malicious regex characters does not crash server
    const searchRes = await request('/admin/complaints?search=(((((((a+)+)+)+)+)+)+)', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(searchRes.status === 200, 'Search query containing malicious regex metacharacters handles safely (200 OK)');

    // =========================================================================
    // 6. FILE UPLOAD SECURITY AUDIT
    // =========================================================================
    console.log('\n--- 6. File Upload Security Verification ---');

    const testFile = (filename, mimetype) => {
      let isAllowed = false;
      let errorMsg = null;
      uploadMiddleware.upload.fileFilter(
        {},
        { originalname: filename, mimetype },
        (err, allow) => {
          if (err) errorMsg = err.message;
          isAllowed = allow;
        }
      );
      return { isAllowed, errorMsg };
    };

    const validPng = testFile('evidence.png', 'image/png');
    assert(validPng.isAllowed === true, 'Permits valid PNG image upload');

    const validPdf = testFile('document.pdf', 'application/pdf');
    assert(validPdf.isAllowed === true, 'Permits valid PDF document upload');

    const scriptUpload = testFile('webshell.php', 'application/x-php');
    assert(scriptUpload.isAllowed === false, 'Strictly blocks .php script upload');

    const exeUpload = testFile('virus.exe', 'application/x-msdownload');
    assert(exeUpload.isAllowed === false, 'Strictly blocks .exe binary upload');

    const doubleExtUpload = testFile('shell.php.jpg', 'image/jpeg');
    assert(
      doubleExtUpload.isAllowed === false,
      'Strictly blocks dangerous double-extension uploads (e.g. shell.php.jpg)'
    );

    const traversalUpload = testFile('../../etc/passwd.png', 'image/png');
    assert(
      traversalUpload.isAllowed === false,
      'Strictly blocks path traversal filename patterns'
    );

    // =========================================================================
    // 7. SECURITY HEADERS & PRODUCTION LOCKDOWN
    // =========================================================================
    console.log('\n--- 7. Security Headers & Production Configuration ---');

    // Verify Helmet security headers
    const healthHeadersRes = await request('/complaints/my', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      healthHeadersRes.headers.get('x-content-type-options') === 'nosniff',
      'Helmet sets X-Content-Type-Options: nosniff security header'
    );

    // Verify Production Lockdown of Dev Endpoints
    const { ensureDevMode } = require('../controllers/devAuthController');
    const mockDevReq = {};
    const mockDevRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
    };
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    ensureDevMode(mockDevReq, mockDevRes, () => {});
    assert(
      mockDevRes.statusCode === 404,
      'In production environment, Dev auth bypass endpoint returns 404 Not Found'
    );

    process.env.NODE_ENV = prevEnv;

    console.log('\n======================================================');
    console.log(`✅ SECURITY AUDIT SUITE FINISHED: ${passed}/${total} assertions passed`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal Security Audit error:', err);
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

runSecurityAuditTests();
