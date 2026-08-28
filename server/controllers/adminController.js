const mongoose = require('mongoose');
const { Complaint, CATEGORIES, PRIORITIES, STATUSES } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const User = require('../models/User');
const { Department } = require('../models/Department');
const Staff = require('../models/Staff');
const emailService = require('../services/emailService');
const aiService = require('../services/aiService');
const { escapeRegex } = require('../utils/sanitize');

// Allowed status progression map
const VALID_TRANSITIONS = {
  Submitted: ['Under Review', 'Assigned', 'Closed'],
  'Under Review': ['Assigned', 'In Progress', 'Closed'],
  Assigned: ['In Progress', 'Under Review', 'Closed'],
  'In Progress': ['Resolved', 'Under Review', 'Closed'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['Under Review', 'In Progress'], // Re-opening if necessary
};

/**
 * Format duration milliseconds into human-readable hours or days
 */
const formatDuration = (ms) => {
  if (!ms || isNaN(ms) || ms <= 0) return 'N/A';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) {
    const minutes = Math.round(ms / (1000 * 60));
    return `${minutes} mins`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} hrs`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
};

/**
 * Get comprehensive analytics using MongoDB Aggregation Pipelines
 * Route: GET /api/admin/analytics
 */
const getAnalyticsDashboard = async (req, res) => {
  try {
    const { range = '30d', startDate, endDate } = req.query;

    const matchStage = {
      isDeleted: { $ne: true },
    };
    const now = new Date();

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    } else if (range && range !== 'all') {
      let days = 30;
      if (range === '7d') days = 7;
      else if (range === '30d') days = 30;
      else if (range === '90d') days = 90;
      else if (range === '180d') days = 180;

      const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      matchStage.createdAt = { $gte: fromDate };
    }

    // 1. Execute Core Aggregation Pipeline with $facet for maximum database performance
    const [facetResults] = await Complaint.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Total, Resolved, Unresolved, Critical counts
          kpiMetrics: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                resolved: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0],
                  },
                },
                unresolved: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 0, 1],
                  },
                },
                critical: {
                  $sum: {
                    $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0],
                  },
                },
              },
            },
          ],

          // Average Resolution Time Pipeline
          resolutionTime: [
            {
              $match: {
                resolvedAt: { $ne: null, $exists: true },
              },
            },
            {
              $project: {
                durationMs: { $subtract: ['$resolvedAt', '$createdAt'] },
              },
            },
            {
              $match: {
                durationMs: { $gte: 0 },
              },
            },
            {
              $group: {
                _id: null,
                avgResolutionTimeMs: { $avg: '$durationMs' },
                count: { $sum: 1 },
              },
            },
          ],

          // Distribution by Category
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          // Distribution by Status
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          // Distribution by Priority
          byPriority: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],

          // Distribution over Time (Daily trend)
          overTime: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    // 2. Department Breakdown & Performance Pipeline
    const departmentAggregation = await Complaint.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'departments',
          localField: 'assignedDepartment',
          foreignField: '_id',
          as: 'deptInfo',
        },
      },
      {
        $project: {
          departmentName: {
            $cond: {
              if: { $gt: [{ $size: '$deptInfo' }, 0] },
              then: { $arrayElemAt: ['$deptInfo.name', 0] },
              else: {
                $ifNull: ['$assignedDepartmentName', 'Unassigned'],
              },
            },
          },
          status: '$status',
          isResolved: { $in: ['$status', ['Resolved', 'Closed']] },
          isOverdue: {
            $and: [
              { $not: { $in: ['$status', ['Resolved', 'Closed']] } },
              { $lt: ['$dueDate', now] },
            ],
          },
          durationMs: {
            $cond: [
              { $and: [{ $ne: ['$resolvedAt', null] }, { $gte: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 0] }] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null,
            ],
          },
          rating: '$feedback.rating',
        },
      },
      {
        $group: {
          _id: '$departmentName',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
          pending: { $sum: { $cond: ['$isResolved', 0, 1] } },
          overdue: { $sum: { $cond: ['$isOverdue', 1, 0] } },
          avgResolutionTimeMs: { $avg: '$durationMs' },
          avgRating: { $avg: '$rating' },
          ratingCount: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 3. Category Performance Pipeline (including Canteen & all categories)
    const categoryPerformanceAggregation = await Complaint.aggregate([
      { $match: matchStage },
      {
        $project: {
          category: '$category',
          isResolved: { $in: ['$status', ['Resolved', 'Closed']] },
          isPending: { $not: { $in: ['$status', ['Resolved', 'Closed']] } },
          durationMs: {
            $cond: [
              { $and: [{ $ne: ['$resolvedAt', null] }, { $gte: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 0] }] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null,
            ],
          },
          rating: '$feedback.rating',
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
          pending: { $sum: { $cond: ['$isPending', 1, 0] } },
          avgResolutionTimeMs: { $avg: '$durationMs' },
          avgRating: { $avg: '$rating' },
          ratingCount: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 4. Student Feedback Analytics Pipeline
    const feedbackSummaryAggregation = await Complaint.aggregate([
      { $match: { ...matchStage, 'feedback.rating': { $ne: null } } },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$feedback.rating' },
                totalRatings: { $sum: 1 },
              },
            },
          ],
          distribution: [
            {
              $group: {
                _id: '$feedback.rating',
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
          ],
        },
      },
    ]);

    // 5. Average Time to First Assignment Pipeline (using ComplaintUpdate collection)
    const assignmentTimeAggregation = await ComplaintUpdate.aggregate([
      {
        $match: {
          updateType: 'ASSIGNMENT',
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$complaint',
          firstAssignedAt: { $first: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: '_id',
          as: 'complaintDoc',
        },
      },
      { $unwind: '$complaintDoc' },
      // Apply date match stage on complaint creation date
      ...(matchStage.createdAt
        ? [{ $match: { 'complaintDoc.createdAt': matchStage.createdAt } }]
        : []),
      {
        $project: {
          timeToAssignMs: {
            $subtract: ['$firstAssignedAt', '$complaintDoc.createdAt'],
          },
        },
      },
      {
        $match: {
          timeToAssignMs: { $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgTimeToAssignmentMs: { $avg: '$timeToAssignMs' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Parse KPI Metrics
    const kpiRaw = facetResults?.kpiMetrics?.[0] || {
      total: 0,
      resolved: 0,
      unresolved: 0,
      critical: 0,
    };

    const avgResolutionTimeMs = facetResults?.resolutionTime?.[0]?.avgResolutionTimeMs || 0;
    const avgTimeToAssignmentMs =
      assignmentTimeAggregation?.[0]?.avgTimeToAssignmentMs || 0;

    // Normalizing By Category (Ensuring all categories are represented)
    const categoryMap = {};
    CATEGORIES.forEach((cat) => {
      categoryMap[cat] = 0;
    });
    (facetResults?.byCategory || []).forEach((item) => {
      if (item._id) categoryMap[item._id] = item.count;
    });

    // Normalizing By Status (Ensuring all official workflow statuses)
    const statusMap = {};
    STATUSES.forEach((st) => {
      statusMap[st] = 0;
    });
    (facetResults?.byStatus || []).forEach((item) => {
      if (item._id) statusMap[item._id] = item.count;
    });

    // Normalizing By Priority
    const priorityMap = {};
    PRIORITIES.forEach((pri) => {
      priorityMap[pri] = 0;
    });
    (facetResults?.byPriority || []).forEach((item) => {
      if (item._id) priorityMap[item._id] = item.count;
    });

    // Format over time trend array: [{ date: '2026-08-20', count: 4 }, ...]
    const overTimeTrend = (facetResults?.overTime || []).map((item) => ({
      date: item._id,
      count: item.count,
    }));

    // Format department breakdown & performance
    const departmentPerformance = departmentAggregation.map((item) => ({
      department: item._id || 'Unassigned',
      total: item.total,
      resolved: item.resolved,
      pending: item.pending,
      overdue: item.overdue,
      avgResolutionTimeMs: Math.round(item.avgResolutionTimeMs || 0),
      avgResolutionTimeFormatted: formatDuration(item.avgResolutionTimeMs),
      avgRating: item.avgRating ? Number(item.avgRating.toFixed(1)) : null,
      ratingCount: item.ratingCount || 0,
    }));

    const departmentBreakdown = departmentPerformance.map((d) => ({
      department: d.department,
      count: d.total,
    }));

    // Format Category Performance
    const categoryPerformanceMap = {};
    CATEGORIES.forEach((cat) => {
      categoryPerformanceMap[cat] = {
        category: cat,
        total: 0,
        resolved: 0,
        pending: 0,
        avgResolutionTimeMs: 0,
        avgResolutionTimeFormatted: 'N/A',
        avgRating: null,
        ratingCount: 0,
      };
    });

    categoryPerformanceAggregation.forEach((item) => {
      if (item._id) {
        categoryPerformanceMap[item._id] = {
          category: item._id,
          total: item.total,
          resolved: item.resolved,
          pending: item.pending,
          avgResolutionTimeMs: Math.round(item.avgResolutionTimeMs || 0),
          avgResolutionTimeFormatted: formatDuration(item.avgResolutionTimeMs),
          avgRating: item.avgRating ? Number(item.avgRating.toFixed(1)) : null,
          ratingCount: item.ratingCount || 0,
        };
      }
    });

    const categoryPerformanceList = Object.values(categoryPerformanceMap);

    // Feedback analytics
    const feedbackOverall = feedbackSummaryAggregation?.[0]?.overall?.[0] || {
      avgRating: 0,
      totalRatings: 0,
    };
    const feedbackDistMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (feedbackSummaryAggregation?.[0]?.distribution || []).forEach((d) => {
      if (d._id && feedbackDistMap[d._id] !== undefined) {
        feedbackDistMap[d._id] = d.count;
      }
    });

    // SLA breakdown for match window
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const activeFilter = { ...matchStage, status: { $nin: ['Resolved', 'Closed'] } };
    const overdueCount = await Complaint.countDocuments({ ...activeFilter, dueDate: { $lt: now } });
    const dueTodayCount = await Complaint.countDocuments({ ...activeFilter, dueDate: { $gte: now, $lte: endOfToday } });
    const dueSoonCount = await Complaint.countDocuments({ ...activeFilter, dueDate: { $gt: endOfToday, $lte: in48Hours } });
    const onTrackCount = await Complaint.countDocuments({ ...activeFilter, $or: [{ dueDate: { $gt: in48Hours } }, { dueDate: null }] });

    const resolutionRate = kpiRaw.total > 0
      ? Number(((kpiRaw.resolved / kpiRaw.total) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      status: 'success',
      filter: {
        range,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      kpi: {
        totalComplaints: kpiRaw.total,
        resolvedComplaints: kpiRaw.resolved,
        unresolvedComplaints: kpiRaw.unresolved,
        criticalComplaints: kpiRaw.critical,
        resolutionRate,
        averageResolutionTimeMs: Math.round(avgResolutionTimeMs),
        averageResolutionTimeFormatted: formatDuration(avgResolutionTimeMs),
        averageTimeToAssignmentMs: Math.round(avgTimeToAssignmentMs),
        averageTimeToAssignmentFormatted: formatDuration(avgTimeToAssignmentMs),
        averageRating: feedbackOverall.avgRating ? Number(feedbackOverall.avgRating.toFixed(1)) : 0,
        totalRatings: feedbackOverall.totalRatings || 0,
      },
      sla: {
        overdue: overdueCount,
        dueToday: dueTodayCount,
        dueSoon: dueSoonCount,
        onTrack: onTrackCount,
      },
      feedback: {
        averageRating: feedbackOverall.avgRating ? Number(feedbackOverall.avgRating.toFixed(1)) : 0,
        totalRatings: feedbackOverall.totalRatings || 0,
        distribution: feedbackDistMap,
        departmentRatings: departmentPerformance.filter((d) => d.ratingCount > 0),
      },
      departmentPerformance,
      categoryPerformance: categoryPerformanceList,
      charts: {
        byCategory: categoryMap,
        byDepartment: departmentBreakdown,
        byStatus: statusMap,
        byPriority: priorityMap,
        overTime: overTimeTrend,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error calculating analytics dashboard data.',
    });
  }
};

/**
 * Get comprehensive analytics for Admin Dashboard
 * Route: GET /api/admin/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const baseFilter = { isDeleted: { $ne: true } };
    const total = await Complaint.countDocuments(baseFilter);
    const submitted = await Complaint.countDocuments({ ...baseFilter, status: 'Submitted' });
    const underReview = await Complaint.countDocuments({ ...baseFilter, status: 'Under Review' });
    const assigned = await Complaint.countDocuments({ ...baseFilter, status: 'Assigned' });
    const inProgress = await Complaint.countDocuments({ ...baseFilter, status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ ...baseFilter, status: 'Resolved' });
    const closed = await Complaint.countDocuments({ ...baseFilter, status: 'Closed' });
    const critical = await Complaint.countDocuments({ ...baseFilter, priority: 'Critical' });

    // SLA counts
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const activeFilter = { ...baseFilter, status: { $nin: ['Resolved', 'Closed'] } };
    const overdue = await Complaint.countDocuments({ ...activeFilter, dueDate: { $lt: now } });
    const dueToday = await Complaint.countDocuments({ ...activeFilter, dueDate: { $gte: now, $lte: endOfToday } });
    const dueSoon = await Complaint.countDocuments({ ...activeFilter, dueDate: { $gt: endOfToday, $lte: in48Hours } });
    const onTrack = await Complaint.countDocuments({ ...activeFilter, $or: [{ dueDate: { $gt: in48Hours } }, { dueDate: null }] });

    // Feedback rating metrics
    const feedbackAggregation = await Complaint.aggregate([
      { $match: { ...baseFilter, 'feedback.rating': { $ne: null } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$feedback.rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);
    const averageRating = feedbackAggregation[0] ? Number(feedbackAggregation[0].avgRating.toFixed(1)) : 0;
    const totalRatings = feedbackAggregation[0] ? feedbackAggregation[0].totalRatings : 0;

    // Aggregate by Category
    const categoryAggregation = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const byCategory = {};
    CATEGORIES.forEach((cat) => {
      byCategory[cat] = 0;
    });
    categoryAggregation.forEach((item) => {
      if (item._id) byCategory[item._id] = item.count;
    });

    // Aggregate by Priority
    const priorityAggregation = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const byPriority = {};
    PRIORITIES.forEach((pri) => {
      byPriority[pri] = 0;
    });
    priorityAggregation.forEach((item) => {
      if (item._id) byPriority[item._id] = item.count;
    });

    // Aggregate by Status
    const statusAggregation = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = {};
    STATUSES.forEach((st) => {
      byStatus[st] = 0;
    });
    statusAggregation.forEach((item) => {
      if (item._id) byStatus[item._id] = item.count;
    });

    // Recent 5 complaints
    const recentComplaints = await Complaint.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'fullName email studentId department')
      .populate('assignedDepartment', 'name')
      .populate('assignedStaff', 'name email employeeId phone');

    return res.status(200).json({
      status: 'success',
      stats: {
        total,
        submitted,
        underReview,
        assigned,
        inProgress,
        resolved,
        closed,
        critical,
        canteen: byCategory.Canteen || 0,
      },
      sla: {
        overdue,
        dueToday,
        dueSoon,
        onTrack,
      },
      feedback: {
        averageRating,
        totalRatings,
      },
      distributions: {
        byCategory,
        byPriority,
        byStatus,
      },
      recentComplaints,
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving admin dashboard statistics.',
    });
  }
};

/**
 * Get all complaints with search, multi-criteria filtering, and sorting
 * Route: GET /api/admin/complaints
 */
const getAllComplaints = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      priority,
      department,
      startDate,
      endDate,
      sortBy = 'newest',
    } = req.query;

    const query = {
      isDeleted: { $ne: true },
    };

    // Filter by status
    if (status && STATUSES.includes(status)) {
      query.status = status;
    }

    // Filter by category
    if (category && CATEGORIES.includes(category)) {
      query.category = category;
    }

    // Filter by priority
    if (priority && PRIORITIES.includes(priority)) {
      query.priority = priority;
    }

    // Filter by assigned department
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.assignedDepartment = department;
      } else {
        const deptDoc = await Department.findOne({ name: department.trim() });
        if (deptDoc) {
          query.$or = [
            { assignedDepartment: deptDoc._id },
            { assignedDepartmentName: department.trim() },
          ];
        } else {
          query.assignedDepartmentName = department.trim();
        }
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // If search term provided, find matching students first if searching student name/ID
    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      const studentMatchQuery = {
        $or: [
          { fullName: { $regex: safeSearch, $options: 'i' } },
          { studentId: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
        ],
      };
      const matchingStudents = await User.find(studentMatchQuery).select('_id');
      const studentIds = matchingStudents.map((s) => s._id);

      query.$or = [
        { complaintId: { $regex: safeSearch, $options: 'i' } },
        { title: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { student: { $in: studentIds } },
      ];
    }

    // Determine sort
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'updated') {
      sortOptions = { updatedAt: -1 };
    } else if (sortBy === 'priority') {
      sortOptions = { priority: 1, createdAt: -1 };
    }

    const complaints = await Complaint.find(query)
      .sort(sortOptions)
      .populate('student', 'fullName email studentId department')
      .populate('assignedDepartment', 'name active')
      .populate('assignedStaff', 'name email employeeId phone active');

    return res.status(200).json({
      status: 'success',
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error('Admin get all complaints error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving complaints list.',
    });
  }
};

/**
 * Get single complaint details for Admin (including full lifecycle updates)
 * Route: GET /api/admin/complaints/:id
 */
const getAdminComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query)
      .populate('student', 'fullName email studentId department')
      .populate('assignedDepartment', 'name description active')
      .populate('assignedStaff', 'name email employeeId phone active');

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    // Fetch all chronological lifecycle timeline updates
    const updates = await ComplaintUpdate.find({ complaint: complaint._id })
      .sort({ createdAt: 1 })
      .populate('admin', 'fullName role department');

    return res.status(200).json({
      status: 'success',
      complaint,
      updates,
    });
  } catch (error) {
    console.error('Admin get complaint by ID error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving complaint details.',
    });
  }
};

/**
 * Update complaint status with logical workflow validation & audit logging & email alerts
 * Route: PATCH /api/admin/complaints/:id/status
 */
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, comment, resolutionSummary, actionTaken, force = false } = req.body;

    if (!newStatus || !STATUSES.includes(newStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status "${newStatus}". Allowed statuses: ${STATUSES.join(', ')}`,
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    const currentStatus = complaint.status;

    // If transitioning to Resolved, auto-fill resolutionDetails if needed
    if (newStatus === 'Resolved') {
      const summary = (resolutionSummary || comment || complaint.resolutionDetails?.summary || 'Grievance resolved and actions completed.').trim();
      const now = new Date();
      complaint.resolutionDetails = {
        summary,
        actionTaken: actionTaken ? actionTaken.trim() : complaint.resolutionDetails?.actionTaken || 'Maintenance Completed',
        resolvedBy: req.user._id,
        resolvedByName: req.user.fullName,
        resolvedAt: now,
      };
      complaint.resolvedAt = now;
    }

    // Auto-set closedAt on Closed transition
    if (newStatus === 'Closed') {
      complaint.closedAt = new Date();
      if (!complaint.resolvedAt) {
        complaint.resolvedAt = new Date();
      }
    }

    complaint.status = newStatus;

    // If an optional comment was provided during status change
    if (comment && comment.trim()) {
      complaint.adminComments.push({
        comment: comment.trim(),
        commentedBy: req.user._id,
        commentedByName: req.user.fullName,
        createdAt: new Date(),
      });
    }

    await complaint.save();

    // Create ComplaintUpdate Audit Record
    let updateType = 'STATUS_CHANGE';
    let updateMsg = `Status changed from "${currentStatus}" to "${newStatus}".`;
    if (comment && comment.trim()) {
      updateMsg += ` Note: "${comment.trim()}"`;
    }
    if (newStatus === 'Resolved') {
      updateType = 'RESOLUTION';
      updateMsg = `Grievance marked as Resolved. Summary: "${complaint.resolutionDetails?.summary}"`;
    } else if (newStatus === 'Closed') {
      updateType = 'CLOSURE';
      updateMsg = 'Grievance ticket was formally closed.';
    }

    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      updateType,
      message: updateMsg,
      previousStatus: currentStatus,
      newStatus,
    });

    await complaint.populate('student', 'fullName email studentId department');
    await complaint.populate('assignedDepartment', 'name active');
    await complaint.populate('assignedStaff', 'name email employeeId phone active');

    // Send non-blocking email notification to the student
    if (newStatus === 'Closed') {
      emailService.sendComplaintClosureEmail({
        student: complaint.student,
        complaint,
      }).catch((err) => console.error('[EmailService] Closure email error:', err));
    } else if (newStatus === 'Resolved') {
      emailService.sendComplaintResolutionEmail({
        student: complaint.student,
        complaint,
        resolutionSummary: complaint.resolutionDetails?.summary,
        actionTaken: complaint.resolutionDetails?.actionTaken,
      }).catch((err) => console.error('[EmailService] Resolution email error:', err));
    } else {
      emailService.sendComplaintStatusChangeEmail({
        student: complaint.student,
        complaint,
        previousStatus: currentStatus,
        newStatus,
        note: comment,
      }).catch((err) => console.error('[EmailService] Status change email error:', err));
    }

    return res.status(200).json({
      status: 'success',
      message: `Status successfully updated to "${newStatus}".`,
      complaint,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error updating complaint status.',
    });
  }
};

/**
 * Assign department and staff to a complaint with active validation & email alert
 * Route: PATCH /api/admin/complaints/:id/assign
 */
const assignDepartmentAndStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, departmentId, staffId } = req.body;
    const targetDept = department || departmentId;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    let deptDoc = null;
    let staffDoc = null;

    // Validate Department if provided
    if (targetDept !== undefined) {
      if (targetDept) {
        if (mongoose.Types.ObjectId.isValid(targetDept)) {
          deptDoc = await Department.findById(targetDept);
        } else {
          deptDoc = await Department.findOne({ name: targetDept.trim() });
        }

        if (!deptDoc) {
          return res.status(400).json({
            status: 'error',
            message: 'Selected department does not exist.',
          });
        }

        if (!deptDoc.active) {
          return res.status(400).json({
            status: 'error',
            message: `Cannot assign inactive department "${deptDoc.name}".`,
          });
        }

        complaint.assignedDepartment = deptDoc._id;
        complaint.assignedDepartmentName = deptDoc.name;
      } else {
        complaint.assignedDepartment = null;
        complaint.assignedDepartmentName = null;
      }
    } else if (complaint.assignedDepartment) {
      deptDoc = await Department.findById(complaint.assignedDepartment);
    }

    // Validate Staff if provided
    if (staffId !== undefined) {
      if (staffId) {
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid staff ID format.',
          });
        }

        staffDoc = await Staff.findById(staffId);
        if (!staffDoc) {
          return res.status(400).json({
            status: 'error',
            message: 'Selected staff member does not exist.',
          });
        }

        if (!staffDoc.active) {
          return res.status(400).json({
            status: 'error',
            message: `Cannot assign inactive staff member "${staffDoc.name}".`,
          });
        }

        // Check if staff belongs to the selected department
        if (deptDoc && staffDoc.department.toString() !== deptDoc._id.toString()) {
          return res.status(400).json({
            status: 'error',
            message: `Staff member "${staffDoc.name}" does not belong to the selected department "${deptDoc.name}".`,
          });
        }

        complaint.assignedStaff = staffDoc._id;
        complaint.assignedStaffName = staffDoc.name;
      } else {
        complaint.assignedStaff = null;
        complaint.assignedStaffName = null;
      }
    }

    const previousStatus = complaint.status;

    // Automatically transition to 'Assigned' if currently Submitted/Under Review and department assigned
    if (
      (complaint.status === 'Submitted' || complaint.status === 'Under Review') &&
      complaint.assignedDepartment
    ) {
      complaint.status = 'Assigned';
    }

    await complaint.save();

    // Create ComplaintUpdate Audit Record
    let assignMsg = deptDoc
      ? `Routed to department "${deptDoc.name}"`
      : 'Department routing removed';
    if (staffDoc) {
      assignMsg += ` and assigned to technician "${staffDoc.name}" (${staffDoc.employeeId})`;
    }

    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      updateType: 'ASSIGNMENT',
      message: assignMsg,
      previousStatus,
      newStatus: complaint.status,
    });

    await complaint.populate('student', 'fullName email studentId department');
    await complaint.populate('assignedDepartment', 'name active');
    await complaint.populate('assignedStaff', 'name email employeeId phone active');

    // Send non-blocking email notification for assignment
    emailService.sendComplaintAssignmentEmail({
      student: complaint.student,
      complaint,
      departmentName: deptDoc ? deptDoc.name : null,
      staffName: staffDoc ? staffDoc.name : null,
    }).catch((err) => console.error('[EmailService] Assignment email error:', err));

    return res.status(200).json({
      status: 'success',
      message: 'Department and staff assignment updated successfully.',
      complaint,
    });
  } catch (error) {
    console.error('Assign department error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during assignment.',
    });
  }
};

/**
 * Update complaint priority with audit logging
 * Route: PATCH /api/admin/complaints/:id/priority
 */
const updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!priority || !PRIORITIES.includes(priority)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid priority "${priority}". Allowed priorities: ${PRIORITIES.join(', ')}`,
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    const oldPriority = complaint.priority;
    complaint.priority = priority;
    await complaint.save();

    // Create ComplaintUpdate Audit Record
    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      updateType: 'PRIORITY_CHANGE',
      message: `Priority updated from "${oldPriority}" to "${priority}".`,
      previousStatus: complaint.status,
      newStatus: complaint.status,
    });

    await complaint.populate('student', 'fullName email studentId department');
    await complaint.populate('assignedDepartment', 'name active');
    await complaint.populate('assignedStaff', 'name email employeeId phone active');

    return res.status(200).json({
      status: 'success',
      message: `Priority updated to "${priority}".`,
      complaint,
    });
  } catch (error) {
    console.error('Update priority error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error updating priority.',
    });
  }
};

/**
 * Add an official administrative comment with audit logging
 * Route: POST /api/admin/complaints/:id/comments
 */
const addAdminComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, message } = req.body || {};
    const targetComment = (comment || message || '').trim();

    if (!targetComment) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment text is required.',
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    complaint.adminComments.push({
      comment: targetComment,
      commentedBy: req.user._id,
      commentedByName: req.user.fullName,
      createdAt: new Date(),
    });

    await complaint.save();

    // Create ComplaintUpdate Audit Record
    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      updateType: 'COMMENT',
      message: targetComment,
      previousStatus: complaint.status,
      newStatus: complaint.status,
    });

    await complaint.populate('student', 'fullName email studentId department');
    await complaint.populate('assignedDepartment', 'name active');
    await complaint.populate('assignedStaff', 'name email employeeId phone active');

    return res.status(201).json({
      status: 'success',
      message: 'Admin comment posted successfully.',
      complaint,
    });
  } catch (error) {
    console.error('Add admin comment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error adding admin comment.',
    });
  }
};

/**
 * Record resolution details and resolve complaint with email alert
 * Route: POST /api/admin/complaints/:id/resolution
 */
const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, actionTaken, resolutionNotes } = req.body || {};
    const finalSummary = (summary || actionTaken || resolutionNotes || '').trim();

    if (!finalSummary) {
      return res.status(400).json({
        status: 'error',
        message: 'Resolution details summary is required.',
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    const now = new Date();
    const oldStatus = complaint.status;

    complaint.resolutionDetails = {
      summary: finalSummary,
      actionTaken: actionTaken ? actionTaken.trim() : 'Maintenance Completed',
      resolvedBy: req.user._id,
      resolvedByName: req.user.fullName,
      resolvedAt: now,
    };
    complaint.status = 'Resolved';
    complaint.resolvedAt = now;

    await complaint.save();

    // Create ComplaintUpdate Audit Record
    await ComplaintUpdate.create({
      complaint: complaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      updateType: 'RESOLUTION',
      message: `Grievance resolved: ${finalSummary}${actionTaken ? ` (Action: ${actionTaken.trim()})` : ''}`,
      previousStatus: oldStatus,
      newStatus: 'Resolved',
      createdAt: now,
    });

    await complaint.populate('student', 'fullName email studentId department');
    await complaint.populate('assignedDepartment', 'name active');
    await complaint.populate('assignedStaff', 'name email employeeId phone active');

    // Trigger resolution notification email
    emailService.sendComplaintResolutionEmail({
      student: complaint.student,
      complaint,
      resolutionSummary: summary.trim(),
      actionTaken: actionTaken ? actionTaken.trim() : 'Maintenance Completed',
    }).catch((err) => console.error('[EmailService] Resolution email error:', err));

    return res.status(200).json({
      status: 'success',
      message: 'Complaint resolved and resolution details documented.',
      complaint,
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error recording complaint resolution.',
    });
  }
};

/**
 * Trigger AI re-analysis on demand (Admin only)
 * Route: POST /api/admin/complaints/:id/ai-analyze
 */
const reanalyzeComplaintWithAi = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    const aiResult = await aiService.analyzeComplaint({
      title: complaint.title,
      description: complaint.description,
      location: complaint.location,
    });

    complaint.aiAnalysis = aiResult;
    await complaint.save();

    return res.status(200).json({
      status: 'success',
      message: 'AI grievance intelligence re-analysis completed.',
      aiAnalysis: complaint.aiAnalysis,
    });
  } catch (error) {
    console.error('AI reanalyze error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error performing AI re-analysis.',
    });
  }
};

/**
 * Trigger escalation sweep for overdue unresolved complaints
 * Route: POST /api/admin/complaints/check-escalations
 */
const checkAndEscalateOverdueComplaints = async (req, res) => {
  try {
    const now = new Date();
    const overdueComplaints = await Complaint.find({
      isDeleted: { $ne: true },
      status: { $nin: ['Resolved', 'Closed'] },
      dueDate: { $lt: now },
      isEscalated: { $ne: true },
    });

    let newlyEscalatedCount = 0;
    for (const comp of overdueComplaints) {
      comp.isEscalated = true;
      comp.escalatedAt = now;
      await comp.save();

      await ComplaintUpdate.create({
        complaint: comp._id,
        performedByRole: 'system',
        performedByName: 'SLA Escalation Engine',
        updateType: 'ESCALATION',
        message: `⚠️ Complaint escalated: Resolution deadline exceeded for ${comp.priority} priority grievance.`,
        createdAt: now,
      });
      newlyEscalatedCount++;
    }

    const totalOverdueCount = await Complaint.countDocuments({
      isDeleted: { $ne: true },
      status: { $nin: ['Resolved', 'Closed'] },
      dueDate: { $lt: now },
    });

    return res.status(200).json({
      status: 'success',
      message: `Escalation check completed. ${newlyEscalatedCount} complaints newly escalated.`,
      escalatedCount: newlyEscalatedCount,
      totalOverdueCount,
    });
  } catch (error) {
    console.error('Check escalations error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error checking overdue escalations.',
    });
  }
};

/**
 * Link a complaint to a master issue or unlink
 * Route: POST /api/admin/complaints/:id/link-master
 */
const linkMasterComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { masterComplaintId } = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { complaintId: id.toUpperCase() };

    const childComplaint = await Complaint.findOne(query);
    if (!childComplaint) {
      return res.status(404).json({
        status: 'error',
        message: `Complaint not found with ID: ${id}`,
      });
    }

    if (!masterComplaintId) {
      // Unlink
      if (childComplaint.masterComplaint) {
        await Complaint.findByIdAndUpdate(childComplaint.masterComplaint, {
          $pull: { relatedComplaints: childComplaint._id },
        });
      }
      childComplaint.masterComplaint = null;
      await childComplaint.save();

      return res.status(200).json({
        status: 'success',
        message: 'Complaint unlinked from master ticket.',
        complaint: childComplaint,
      });
    }

    const isMasterObjectId = mongoose.Types.ObjectId.isValid(masterComplaintId);
    const masterQuery = isMasterObjectId ? { _id: masterComplaintId } : { complaintId: masterComplaintId.toUpperCase() };

    const masterComplaint = await Complaint.findOne(masterQuery);
    if (!masterComplaint) {
      return res.status(404).json({
        status: 'error',
        message: `Master complaint not found with ID: ${masterComplaintId}`,
      });
    }

    if (masterComplaint._id.toString() === childComplaint._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'A complaint cannot be linked to itself as master.',
      });
    }

    childComplaint.masterComplaint = masterComplaint._id;
    await childComplaint.save();

    // Add to master's related complaints array if not already present
    if (!masterComplaint.relatedComplaints.includes(childComplaint._id)) {
      masterComplaint.relatedComplaints.push(childComplaint._id);
      await masterComplaint.save();
    }

    await ComplaintUpdate.create({
      complaint: childComplaint._id,
      admin: req.user._id,
      adminName: req.user.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: 'admin',
      updateType: 'LINK_MASTER',
      message: `Associated with master issue ticket ${masterComplaint.complaintId} ("${masterComplaint.title}").`,
    });

    return res.status(200).json({
      status: 'success',
      message: `Complaint linked to master issue ${masterComplaint.complaintId}.`,
      complaint: childComplaint,
    });
  } catch (error) {
    console.error('Link master complaint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error linking master complaint.',
    });
  }
};

module.exports = {
  getAnalyticsDashboard,
  getDashboardStats,
  getAllComplaints,
  getAdminComplaintById,
  updateComplaintStatus,
  assignDepartmentAndStaff,
  updatePriority,
  addAdminComment,
  resolveComplaint,
  reanalyzeComplaintWithAi,
  checkAndEscalateOverdueComplaints,
  linkMasterComplaint,
};
