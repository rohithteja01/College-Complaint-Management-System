const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');
const authRoutes = require('../routes/authRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// Setup test Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

let mongod;
let server;
let baseUrl;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Complaint Submission & Upload Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'complaint_submission_test_db' },
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

    // 1. Create two student users for ownership testing
    const student1 = await User.create({
      fullName: 'Emma Watson',
      email: 'emma.watson@college.edu',
      studentId: 'CS2026-201',
      department: 'Computer Science',
      password: 'password123',
      role: 'student',
    });
    const token1 = generateToken(student1._id, 'student');

    const student2 = await User.create({
      fullName: 'David Miller',
      email: 'david.miller@college.edu',
      studentId: 'EE2026-202',
      department: 'Electrical Engineering',
      password: 'password123',
      role: 'student',
    });
    const token2 = generateToken(student2._id, 'student');

    // SCENARIO 1: Successful Complaint Creation with Attachment
    console.log('--- Scenario 1: Successful Complaint Creation ---');
    const form1 = new FormData();
    form1.append('title', 'Faulty Air Conditioning in Lab 3');
    form1.append('category', 'Laboratory');
    form1.append('location', 'Science Block, Lab 301');
    form1.append('priority', 'High');
    form1.append('description', 'The central AC unit has been leaking water onto workstation desks since yesterday.');
    
    // Attach valid image file
    const sampleImageBlob = new Blob(['sample-image-content-bytes'], { type: 'image/png' });
    form1.append('attachment', sampleImageBlob, 'ac_leak.png');

    const res1 = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
      },
      body: form1,
    });
    const data1 = await res1.json();

    assert(res1.status === 201, `Status code is 201 Created (got ${res1.status})`);
    assert(data1.complaint?.complaintId?.startsWith('CMP-'), `Complaint ID auto-generated (${data1.complaint?.complaintId})`);
    assert(data1.complaint?.status === 'Submitted', 'Initial status automatically set to "Submitted"');
    assert(data1.complaint?.student?.email === 'emma.watson@college.edu', 'Associated with authenticated student');
    assert(data1.complaint?.attachments?.length === 1, 'Attachment saved in complaint document');
    assert(data1.complaint?.attachments[0]?.fileType === 'image/png', 'Attachment mimetype preserved');

    const student1ComplaintId = data1.complaint.complaintId;
    const student1MongoId = data1.complaint.id || data1.complaint._id;

    // SCENARIO 2: Missing Mandatory Fields
    console.log('\n--- Scenario 2: Validation of Missing Fields ---');
    const missingForm = new FormData();
    missingForm.append('title', 'Incomplete Complaint');
    // Missing category, location, description
    const resMissing = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: missingForm,
    });
    const dataMissing = await resMissing.json();
    assert(resMissing.status === 400, `Missing fields return 400 Bad Request (got ${resMissing.status})`);
    assert(dataMissing.message.includes('required fields'), 'Error message lists required fields');

    // SCENARIO 3: Invalid Category
    console.log('\n--- Scenario 3: Invalid Category Validation ---');
    const invalidCatForm = new FormData();
    invalidCatForm.append('title', 'Water Cooler Issue');
    invalidCatForm.append('category', 'CafeteriaSpecial'); // Not in enum
    invalidCatForm.append('location', 'Block C');
    invalidCatForm.append('description', 'The water dispenser temperature is incorrect.');
    const resInvalidCat = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: invalidCatForm,
    });
    const dataInvalidCat = await resInvalidCat.json();
    assert(resInvalidCat.status === 400, `Invalid category returns 400 Bad Request (got ${resInvalidCat.status})`);
    assert(dataInvalidCat.message.includes('Invalid category'), 'Error message specifies invalid category');

    // SCENARIO 4: Invalid File Format (e.g. .exe / .txt)
    console.log('\n--- Scenario 4: Disallowed File Format Rejection ---');
    const exeForm = new FormData();
    exeForm.append('title', 'Software Bug Report');
    exeForm.append('category', 'Wi-Fi');
    exeForm.append('location', 'Library');
    exeForm.append('description', 'Wi-Fi login script failure.');
    const exeBlob = new Blob(['binary-executable-content'], { type: 'application/x-msdownload' });
    exeForm.append('attachment', exeBlob, 'malicious.exe');

    const resExe = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: exeForm,
    });
    const dataExe = await resExe.json();
    assert(resExe.status === 400, `Executable file upload returns 400 Bad Request (got ${resExe.status})`);
    assert(dataExe.message.includes('Invalid file format'), 'Error explains allowed formats');

    // SCENARIO 5: Oversized File (> 5MB)
    console.log('\n--- Scenario 5: Oversized File Rejection ---');
    const largeForm = new FormData();
    largeForm.append('title', 'Large Video Evidence');
    largeForm.append('category', 'Infrastructure');
    largeForm.append('location', 'Main Gate');
    largeForm.append('description', 'Road repair needed near main gate.');
    // 6MB buffer
    const largeBuffer = new Uint8Array(6 * 1024 * 1024);
    const largeBlob = new Blob([largeBuffer], { type: 'image/png' });
    largeForm.append('attachment', largeBlob, 'giant_photo.png');

    const resLarge = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: largeForm,
    });
    const dataLarge = await resLarge.json();
    assert(resLarge.status === 400, `File > 5MB returns 400 Bad Request (got ${resLarge.status})`);
    assert(dataLarge.message.includes('too large') || dataLarge.message.includes('5MB'), 'Error mentions size limit');

    // SCENARIO 6: Unauthenticated Request
    console.log('\n--- Scenario 6: Unauthenticated Access ---');
    const unauthRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthenticated Attempt',
        category: 'Classroom',
        location: 'Room 101',
        description: 'Trying to submit without JWT token.',
      }),
    });
    assert(unauthRes.status === 401, `Unauthenticated request returns 401 Unauthorized (got ${unauthRes.status})`);

    // SCENARIO 7: Student Accessing Another Student's Complaint
    console.log('\n--- Scenario 7: Student Ownership & Privacy Guard ---');
    // Student 2 attempts to access Student 1's complaint
    const forbiddenRes = await fetch(`${baseUrl}/api/complaints/${student1ComplaintId}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const dataForbidden = await forbiddenRes.json();
    assert(forbiddenRes.status === 403, `Accessing another student's complaint returns 403 Forbidden (got ${forbiddenRes.status})`);
    assert(dataForbidden.message.includes('Access denied'), 'Error message indicates unauthorized access');

    // Student 1 accessing their own complaint
    const ownerRes = await fetch(`${baseUrl}/api/complaints/${student1ComplaintId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const dataOwner = await ownerRes.json();
    assert(ownerRes.status === 200, `Student accessing own complaint returns 200 OK (got ${ownerRes.status})`);
    assert(dataOwner.complaint?.complaintId === student1ComplaintId, 'Correct complaint details returned to owner');

    // SCENARIO 8: Student My Complaints List
    console.log('\n--- Scenario 8: GET /api/complaints/my ---');
    const myRes1 = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const dataMy1 = await myRes1.json();
    assert(myRes1.status === 200, `GET /api/complaints/my returns 200 OK (got ${myRes1.status})`);
    assert(dataMy1.count === 1, `Student 1 receives 1 complaint (got ${dataMy1.count})`);

    const myRes2 = await fetch(`${baseUrl}/api/complaints/my`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const dataMy2 = await myRes2.json();
    assert(dataMy2.count === 0, `Student 2 receives 0 complaints (got ${dataMy2.count})`);

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL COMPLAINT SUBMISSION & ACCESS CONTROL TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running submission tests:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
