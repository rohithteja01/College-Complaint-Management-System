const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Complaint, CATEGORIES, PRIORITIES, STATUSES } = require('../models/Complaint');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { getDBStatus } = require('../config/db');

let mongod;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Complaint Model & Database Tests');
  console.log('====================================================\n');

  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'complaint_structure_test_db' },
      spawn: { startupTimeout: 120000 },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('✅ Connected to Test Database\n');

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

    // 1. Database Connection Status Helper
    console.log('--- Scenario 1: Database Status Inspection ---');
    const dbStatus = getDBStatus();
    assert(dbStatus.isConnected === true, 'Database status reports connected');
    assert(dbStatus.state === 'connected', 'Database state is "connected"');
    assert(dbStatus.databaseName !== null, `Database name resolved: ${dbStatus.databaseName}`);

    // Create a student user for relationship testing
    const student = await User.create({
      fullName: 'John Doe',
      email: 'john.doe@college.edu',
      studentId: 'CS2026-050',
      department: 'Computer Science & Engineering',
      password: 'password123',
      role: 'student',
    });
    assert(student._id !== undefined, 'Sample student created successfully');

    // 2. Complaint Creation & ID Generation
    console.log('\n--- Scenario 2: Complaint ID Generation & Population ---');
    const complaint1 = await Complaint.create({
      title: 'Broken projector in Room 304',
      description: 'The overhead HDMI projector is flickering constantly and shuts down after 5 minutes.',
      category: 'Classroom',
      location: 'Block A, Room 304',
      student: student._id,
      priority: 'High',
    });

    const currentYear = new Date().getFullYear();
    const expectedId1 = `CMP-${currentYear}-00001`;

    assert(complaint1.complaintId === expectedId1, `First complaint ID is formatted correctly (${complaint1.complaintId})`);
    assert(complaint1.status === 'Submitted', 'Initial status defaults to "Submitted"');
    assert(complaint1.priority === 'High', 'Priority set correctly to "High"');

    // Second complaint to verify sequential numbering
    const complaint2 = await Complaint.create({
      title: 'Hostel Wi-Fi intermittent connection',
      description: 'The Wi-Fi router on Hostel Block 3 2nd floor drops connection every 10 minutes.',
      category: 'Wi-Fi',
      location: 'Hostel Block 3, 2nd Floor',
      student: student._id,
      priority: 'Critical',
    });
    const expectedId2 = `CMP-${currentYear}-00002`;
    assert(complaint2.complaintId === expectedId2, `Second complaint ID incremented sequentially (${complaint2.complaintId})`);

    // Verify Population
    const populated = await Complaint.findOne({ complaintId: expectedId1 }).populate(
      'student',
      'fullName email studentId department'
    );
    assert(populated.student.fullName === 'John Doe', 'Student relation populated with full name');
    assert(populated.student.studentId === 'CS2026-050', 'Student relation populated with student ID');

    // 3. Category Validation & Enum Checking
    console.log('\n--- Scenario 3: Category Enum Validation ---');
    assert(CATEGORIES.length === 12, `All 12 required categories defined (found ${CATEGORIES.length})`);
    
    // Check all required categories are present
    const requiredCategories = [
      'Classroom', 'Laboratory', 'Hostel', 'Wi-Fi', 'Infrastructure',
      'Transportation', 'Cleanliness', 'Library', 'Electricity', 'Water', 'Canteen', 'Other'
    ];
    const hasAllCategories = requiredCategories.every((cat) => CATEGORIES.includes(cat));
    assert(hasAllCategories, 'All requested categories match the specification');

    // Attempt invalid category
    let invalidCategoryError = null;
    try {
      await Complaint.create({
        title: 'Invalid Category Test',
        description: 'Testing if invalid category throws validation error.',
        category: 'NonExistentCategory',
        location: 'Grounds',
        student: student._id,
      });
    } catch (err) {
      invalidCategoryError = err;
    }
    assert(invalidCategoryError !== null, 'Invalid category triggers validation error');

    // 4. Priority Enum Validation
    console.log('\n--- Scenario 4: Priority Enum Validation ---');
    const requiredPriorities = ['Low', 'Medium', 'High', 'Critical'];
    assert(
      requiredPriorities.every((p) => PRIORITIES.includes(p)),
      'All requested priorities (Low, Medium, High, Critical) are supported'
    );

    let invalidPriorityError = null;
    try {
      await Complaint.create({
        title: 'Invalid Priority Test',
        description: 'Testing if invalid priority throws error.',
        category: 'Classroom',
        location: 'Room 101',
        student: student._id,
        priority: 'UltraUrgent',
      });
    } catch (err) {
      invalidPriorityError = err;
    }
    assert(invalidPriorityError !== null, 'Invalid priority triggers validation error');

    // 5. Status Workflow Transitions & Automatic Timestamps
    console.log('\n--- Scenario 5: Status Workflow & Timestamps ---');
    const requiredWorkflow = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    assert(
      requiredWorkflow.every((s) => STATUSES.includes(s)),
      'Official workflow enum matches: Submitted → Under Review → Assigned → In Progress → Resolved → Closed'
    );

    // Update status to Resolved and verify resolvedAt timestamp
    complaint1.status = 'Resolved';
    complaint1.resolutionDetails = {
      summary: 'Replaced faulty HDMI power board with new unit.',
      actionTaken: 'Hardware replacement',
    };
    await complaint1.save();
    assert(complaint1.resolvedAt !== null, 'resolvedAt timestamp automatically generated on status transition to Resolved');

    // Update status to Closed and verify closedAt timestamp
    complaint1.status = 'Closed';
    await complaint1.save();
    assert(complaint1.closedAt !== null, 'closedAt timestamp automatically generated on status transition to Closed');

    // 6. Validation of Missing Fields
    console.log('\n--- Scenario 6: Mandatory Field Validation ---');
    const testMandatory = async (payload, fieldName) => {
      try {
        await Complaint.create(payload);
        return false;
      } catch (err) {
        return err.name === 'ValidationError';
      }
    };

    assert(
      await testMandatory({ description: 'Valid Description', category: 'Water', location: 'Block C', student: student._id }, 'title'),
      'Missing title rejected'
    );
    assert(
      await testMandatory({ title: 'Valid Title', category: 'Water', location: 'Block C', student: student._id }, 'description'),
      'Missing description rejected'
    );
    assert(
      await testMandatory({ title: 'Valid Title', description: 'Valid description text', location: 'Block C', student: student._id }, 'category'),
      'Missing category rejected'
    );
    assert(
      await testMandatory({ title: 'Valid Title', description: 'Valid description text', category: 'Water', student: student._id }, 'location'),
      'Missing location rejected'
    );
    assert(
      await testMandatory({ title: 'Valid Title', description: 'Valid description text', category: 'Water', location: 'Block C' }, 'student'),
      'Missing student reference rejected'
    );

    // 7. Attachments and Admin Comments
    console.log('\n--- Scenario 7: Attachments & Admin Comments ---');
    complaint2.attachments.push({
      fileName: 'wifi_speedtest.png',
      fileUrl: '/uploads/wifi_speedtest.png',
      fileType: 'image/png',
      fileSize: 1048576,
    });
    complaint2.adminComments.push({
      comment: 'Network technician dispatched to inspect Block 3 access point.',
      commentedByName: 'IT Helpdesk Admin',
    });
    await complaint2.save();

    const reloaded = await Complaint.findById(complaint2._id);
    assert(reloaded.attachments.length === 1, 'File attachment saved in complaint document');
    assert(reloaded.attachments[0].fileName === 'wifi_speedtest.png', 'Attachment filename preserved');
    assert(reloaded.adminComments.length === 1, 'Admin comment saved in complaint document');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} assertions passed`);
    console.log('====================================================\n');

    if (testsPassed === testsTotal) {
      console.log('🎉 ALL COMPLAINT MODEL & DATABASE TESTS PASSED PERFECTLY!');
    } else {
      console.error('❌ Some tests failed.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error running complaint tests:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runTests();
