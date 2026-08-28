/**
 * Advanced Production Features Automated Test Suite
 * Tests:
 * 1. SLA Engine (Deadlines, status calculation, auto-escalation).
 * 2. Issue Scale & Affected Students (Upvote system, duplicate prevention, impact level calculation).
 * 3. Student Resolution Feedback (1-5 star ratings, comments, authorization rules).
 * 4. Master Complaint Linking (clustering, relationship tracking, timeline events).
 * 5. Department & Category Analytics Pipelines (with Canteen category & ratings).
 * 6. Timeline Lifecycle Events (SUBMISSION, STATUS_CHANGE, ESCALATION, FEEDBACK, LINK_MASTER, etc.).
 */

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
const { generateToken } = require('../utils/jwt');
const { calculateDueDate, getSlaStatus, getImpactLevel, SLA_HOURS } = require('../config/slaConfig');

// Setup test Express app
const app = express();
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
  return { status: res.status, data };
};

const runAdvancedFeaturesTests = async () => {
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
    console.log('\n======================================================');
    console.log('🚀 STARTING ADVANCED PRODUCTION FEATURES TEST SUITE');
    console.log('======================================================\n');

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}/api`;
        resolve();
      });
    });

    // Seed test users
    const student1 = await User.create({
      fullName: 'Alice Student',
      email: 'alice@college.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-001',
      department: 'Computer Science',
    });

    const student2 = await User.create({
      fullName: 'Bob Student',
      email: 'bob@college.edu',
      password: 'password123',
      role: 'student',
      studentId: 'STU-002',
      department: 'Mechanical Engineering',
    });

    const admin = await User.create({
      fullName: 'Chief Administrator',
      email: 'admin@college.edu',
      password: 'adminpassword123',
      role: 'admin',
      department: 'Administration',
    });

    const deptElectrical = await Department.create({
      name: 'Electrical Maintenance',
      description: 'Power systems & fixtures',
      active: true,
    });

    const student1Token = generateToken(student1._id, student1.role);
    const student2Token = generateToken(student2._id, student2.role);
    const adminToken = generateToken(admin._id, admin.role);

    // ==========================================
    // 1. SLA CONFIG & DEADLINE CALCULATION TESTS
    // ==========================================
    console.log('\n--- SUITE 1: SLA Deadline & Status Calculations ---');
    const now = new Date();
    const criticalDue = calculateDueDate('Critical', now);
    const highDue = calculateDueDate('High', now);
    const mediumDue = calculateDueDate('Medium', now);
    const lowDue = calculateDueDate('Low', now);

    assert(
      Math.round((criticalDue - now) / (1000 * 60 * 60)) === SLA_HOURS.Critical,
      `Critical SLA calculated as ${SLA_HOURS.Critical} hours`
    );
    assert(
      Math.round((highDue - now) / (1000 * 60 * 60)) === SLA_HOURS.High,
      `High SLA calculated as ${SLA_HOURS.High} hours`
    );
    assert(
      Math.round((mediumDue - now) / (1000 * 60 * 60)) === SLA_HOURS.Medium,
      `Medium SLA calculated as ${SLA_HOURS.Medium} hours`
    );
    assert(
      Math.round((lowDue - now) / (1000 * 60 * 60)) === SLA_HOURS.Low,
      `Low SLA calculated as ${SLA_HOURS.Low} hours (7 days)`
    );

    // SLA Status checks
    const overdueComp = { status: 'Submitted', dueDate: new Date(now.getTime() - 100000) };
    const dueTodayComp = { status: 'Assigned', dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 3) };
    const onTrackComp = { status: 'In Progress', dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 96) };
    const resolvedComp = { status: 'Resolved', dueDate: new Date(now.getTime() - 100000), resolvedAt: new Date(now.getTime() - 200000) };

    assert(getSlaStatus(overdueComp, now).status === 'Overdue', 'Correctly identifies Overdue status');
    assert(getSlaStatus(dueTodayComp, now).status === 'Due Today', 'Correctly identifies Due Today status');
    assert(getSlaStatus(onTrackComp, now).status === 'On Track', 'Correctly identifies On Track status');
    assert(getSlaStatus(resolvedComp, now).status === 'Resolved On Time', 'Correctly identifies Resolved status');

    // ==========================================
    // 2. ISSUE SCALE & AFFECTED STUDENTS TESTS
    // ==========================================
    console.log('\n--- SUITE 2: Issue Scale & Impact Level Calculations ---');
    assert(getImpactLevel(1) === 'Low', '1 student = Low impact');
    assert(getImpactLevel(5) === 'Low', '5 students = Low impact');
    assert(getImpactLevel(6) === 'Medium', '6 students = Medium impact');
    assert(getImpactLevel(20) === 'Medium', '20 students = Medium impact');
    assert(getImpactLevel(21) === 'High', '21 students = High impact');
    assert(getImpactLevel(50) === 'High', '50 students = High impact');
    assert(getImpactLevel(51) === 'Critical', '51+ students = Critical impact');

    // ==========================================
    // 3. COMPLAINT SUBMISSION & UPVOTE SYSTEM
    // ==========================================
    console.log('\n--- SUITE 3: Complaint Submission, SLA Auto-Population & Upvoting ---');
    const createRes = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        title: 'Water filter leaking near Block C Canteen',
        description: 'Clean drinking water dispenser is leaking heavily onto the corridor floor creating slip hazard.',
        category: 'Canteen',
        priority: 'High',
        location: 'Block C 1st Floor Canteen',
      },
    });

    assert(createRes.status === 201, 'Student successfully lodged Canteen complaint');
    const complaint1 = createRes.data.complaint;
    assert(complaint1.dueDate !== null, 'Complaint automatically received calculated dueDate');
    assert(complaint1.affectedStudentsCount === 1, 'Initial affected students count is 1');
    assert(complaint1.impactLevel === 'Low', 'Initial impact level is Low');

    // Student 2 clicks "👍 I'm facing this issue too" (Upvote)
    const upvoteRes = await request(`/complaints/${complaint1.complaintId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
    });

    assert(upvoteRes.status === 200, 'Student 2 successfully upvoted complaint');
    assert(upvoteRes.data.hasUpvoted === true, 'Response confirms student 2 has upvoted');
    assert(upvoteRes.data.affectedStudentsCount === 2, 'Affected count incremented to 2');

    // Student 2 toggles upvote again (Un-upvote)
    const unUpvoteRes = await request(`/complaints/${complaint1.complaintId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(unUpvoteRes.data.hasUpvoted === false, 'Toggling upvote removes student from affected list');
    assert(unUpvoteRes.data.affectedStudentsCount === 1, 'Affected count decremented back to 1');

    // Re-upvote to maintain affected state
    await request(`/complaints/${complaint1.complaintId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
    });

    // ==========================================
    // 4. MASTER ISSUE LINKING & TIMELINE
    // ==========================================
    console.log('\n--- SUITE 4: Master Complaint Association ---');
    // Create a 2nd complaint
    const createRes2 = await request('/complaints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
      body: {
        title: 'Floor slippery near cafeteria water dispenser',
        description: 'Water accumulation making cafeteria entrance dangerous.',
        category: 'Canteen',
        priority: 'Medium',
        location: 'Block C Canteen Hall',
      },
    });
    const complaint2 = createRes2.data.complaint;

    // Admin links Complaint 2 to Complaint 1 as Master
    const linkRes = await request(`/admin/complaints/${complaint2.complaintId}/link-master`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        masterComplaintId: complaint1.complaintId,
      },
    });

    assert(linkRes.status === 200, 'Admin successfully linked complaint to master issue');
    const updatedComp2 = await Complaint.findById(complaint2._id);
    assert(
      updatedComp2.masterComplaint.toString() === complaint1._id.toString(),
      'Complaint 2 stores masterComplaint reference'
    );

    const masterDoc = await Complaint.findById(complaint1._id);
    assert(
      masterDoc.relatedComplaints.includes(complaint2._id),
      'Master complaint includes child complaint in relatedComplaints array'
    );

    // ==========================================
    // 5. RESOLUTION & STUDENT FEEDBACK RULES
    // ==========================================
    console.log('\n--- SUITE 5: Resolution & Student Resolution Feedback ---');
    // Attempt feedback before resolution (Must be rejected)
    const prematureFeedback = await request(`/complaints/${complaint1.complaintId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        rating: 5,
        comment: 'Great job!',
      },
    });
    assert(prematureFeedback.status === 400, 'Rejects feedback for unresolved complaint');

    // Admin resolves Complaint 1
    const resolveRes = await request(`/admin/complaints/${complaint1.complaintId}/resolution`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        summary: 'Replaced faulty water dispenser gasket and sanitized surrounding area.',
        actionTaken: 'Plumbing and sanitation maintenance completed',
      },
    });
    assert(resolveRes.status === 200, 'Complaint successfully resolved by admin');

    // Non-owner student attempts to rate resolution (Must be rejected 403)
    const unauthorizedFeedback = await request(`/complaints/${complaint1.complaintId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
      body: {
        rating: 4,
        comment: 'Not my ticket',
      },
    });
    assert(unauthorizedFeedback.status === 403, 'Rejects rating from non-owner student (403 Forbidden)');

    // Owner student submits 1-5 star feedback with comment
    const validFeedback = await request(`/complaints/${complaint1.complaintId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` },
      body: {
        rating: 5,
        comment: 'Dispenser is working perfectly now, and the floor is clean and dry. Thanks!',
      },
    });
    assert(validFeedback.status === 200, 'Owner student successfully submitted 5-star resolution feedback');
    assert(validFeedback.data.feedback.rating === 5, 'Stored rating is 5');
    assert(
      validFeedback.data.feedback.comment.includes('working perfectly'),
      'Stored feedback comment successfully'
    );

    // Verify FEEDBACK event in timeline
    const updatesRes = await request(`/complaints/${complaint1.complaintId}/updates`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const feedbackEvent = updatesRes.data.updates.find((u) => u.updateType === 'FEEDBACK');
    assert(feedbackEvent !== undefined, 'FEEDBACK event recorded in timeline');
    assert(
      feedbackEvent.message.includes('5/5 stars'),
      'Timeline event displays feedback rating'
    );

    // ==========================================
    // 6. SLA AUTO-ESCALATION ENGINE
    // ==========================================
    console.log('\n--- SUITE 6: SLA Auto-Escalation Engine ---');
    // Create an overdue unresolved complaint
    const pastDueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day in the past
    const overdueComplaint = await Complaint.create({
      title: 'Power outage in chemistry lab',
      description: 'MCB breaker trip has disabled ventilation hoods.',
      category: 'Laboratory',
      priority: 'Critical',
      location: 'Science Block Lab 3',
      student: student1._id,
      studentName: student1.fullName,
      studentEmail: student1.email,
      dueDate: pastDueDate,
      status: 'In Progress',
    });

    // Run escalation check endpoint
    const escalationRes = await request('/admin/complaints/check-escalations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(escalationRes.status === 200, 'Escalation check completed successfully');
    assert(escalationRes.data.escalatedCount >= 1, 'Overdue complaint was newly escalated');

    const refreshedOverdue = await Complaint.findById(overdueComplaint._id);
    assert(refreshedOverdue.isEscalated === true, 'Complaint document marked isEscalated: true');

    const overdueUpdates = await ComplaintUpdate.find({ complaint: overdueComplaint._id });
    const escalationUpdate = overdueUpdates.find((u) => u.updateType === 'ESCALATION');
    assert(escalationUpdate !== undefined, 'ESCALATION update recorded in ComplaintUpdate timeline');

    // ==========================================
    // 7. DEPARTMENT & CATEGORY ANALYTICS DASHBOARD
    // ==========================================
    console.log('\n--- SUITE 7: Department & Category Analytics Aggregations ---');
    const analyticsRes = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(analyticsRes.status === 200, 'Admin analytics dashboard returned successfully');
    const analyticsData = analyticsRes.data;

    // Verify SLA metrics in analytics
    assert(analyticsData.sla.overdue >= 1, 'Analytics reports overdue complaints count');

    // Verify Feedback in analytics
    assert(analyticsData.feedback.averageRating === 5, 'Overall average feedback rating is 5.0');
    assert(analyticsData.feedback.totalRatings === 1, 'Total ratings count is 1');
    assert(analyticsData.feedback.distribution['5'] === 1, '5-star distribution bucket is 1');

    // Verify Category Performance includes Canteen
    const canteenPerf = analyticsData.categoryPerformance.find((c) => c.category === 'Canteen');
    assert(canteenPerf !== undefined, 'Category performance includes Canteen category');
    assert(canteenPerf.total >= 2, 'Canteen complaints count aggregated accurately');
    assert(canteenPerf.resolved >= 1, 'Canteen resolved count aggregated accurately');

    // Verify Department Performance
    assert(Array.isArray(analyticsData.departmentPerformance), 'Department performance matrix returned as array');

    // ==========================================
    // 8. ADMIN DASHBOARD STATS WITH SLA & FEEDBACK
    // ==========================================
    console.log('\n--- SUITE 8: Admin Dashboard Statistics ---');
    const statsRes = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(statsRes.status === 200, 'Admin dashboard stats returned successfully');
    assert(statsRes.data.sla !== undefined, 'Stats payload includes SLA pipeline breakdown');
    assert(statsRes.data.feedback !== undefined, 'Stats payload includes Feedback summary');
    assert(statsRes.data.stats.canteen >= 2, 'Stats payload includes accurate Canteen counter');

    console.log('\n======================================================');
    console.log(`✅ TEST SUITE FINISHED: ${passed}/${total} assertions passed`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((res) => server.close(res));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runAdvancedFeaturesTests();
