const mongoose = require('mongoose');
const { Department, DEFAULT_DEPARTMENTS } = require('../models/Department');
const Staff = require('../models/Staff');
const { escapeRegex } = require('../utils/sanitize');

/**
 * =========================================================================
 * DEPARTMENT CONTROLLERS
 * =========================================================================
 */

/**
 * Get all departments with optional staff count aggregation
 * Route: GET /api/admin/departments
 */
const getDepartments = async (req, res) => {
  try {
    // Seed defaults if empty
    await Department.seedDefaultsIfEmpty();

    const { active } = req.query;
    const filter = {};
    if (active !== undefined) {
      filter.active = active === 'true';
    }

    const departments = await Department.find(filter).sort({ name: 1 });

    // Aggregate staff count per department
    const staffCounts = await Staff.aggregate([
      { $group: { _id: '$department', totalStaff: { $sum: 1 }, activeStaff: { $sum: { $cond: ['$active', 1, 0] } } } },
    ]);

    const countMap = {};
    staffCounts.forEach((item) => {
      if (item._id) {
        countMap[item._id.toString()] = {
          total: item.totalStaff,
          active: item.activeStaff,
        };
      }
    });

    const result = departments.map((dept) => {
      const counts = countMap[dept._id.toString()] || { total: 0, active: 0 };
      return {
        ...dept.toJSON(),
        staffCount: counts.total,
        activeStaffCount: counts.active,
      };
    });

    return res.status(200).json({
      status: 'success',
      count: result.length,
      departments: result,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving departments list.',
    });
  }
};

/**
 * Create a new department
 * Route: POST /api/admin/departments
 */
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Department name is required and must be a valid text string.',
      });
    }

    const trimmedName = name.trim();
    const safeRegexName = escapeRegex(trimmedName);

    // Check duplicate with escaped regex
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${safeRegexName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: `A department named "${trimmedName}" already exists.`,
      });
    }

    const department = await Department.create({
      name: trimmedName,
      description: description && typeof description === 'string' ? description.trim() : '',
      active: true,
    });

    return res.status(201).json({
      status: 'success',
      message: `Department "${department.name}" created successfully.`,
      department,
    });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error creating department.',
    });
  }
};

/**
 * Update department details
 * Route: PUT /api/admin/departments/:id
 */
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid department ID format.',
      });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Department name is required.',
      });
    }

    const trimmedName = name.trim();
    const safeRegexName = escapeRegex(trimmedName);

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found.',
      });
    }

    // Check name uniqueness if changed
    if (department.name.toLowerCase() !== trimmedName.toLowerCase()) {
      const duplicate = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${safeRegexName}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({
          status: 'error',
          message: `Another department named "${trimmedName}" already exists.`,
        });
      }
    }

    department.name = trimmedName;
    if (description !== undefined) {
      department.description = description && typeof description === 'string' ? description.trim() : '';
    }

    await department.save();

    return res.status(200).json({
      status: 'success',
      message: `Department "${department.name}" updated successfully.`,
      department,
    });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error updating department.',
    });
  }
};

/**
 * Toggle department active status
 * Route: PATCH /api/admin/departments/:id/status
 */
const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid department ID format.',
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found.',
      });
    }

    department.active = active !== undefined ? Boolean(active) : !department.active;
    await department.save();

    return res.status(200).json({
      status: 'success',
      message: `Department "${department.name}" is now ${department.active ? 'Active' : 'Inactive'}.`,
      department,
    });
  } catch (error) {
    console.error('Toggle department status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error toggling department status.',
    });
  }
};

/**
 * =========================================================================
 * STAFF CONTROLLERS
 * =========================================================================
 */

/**
 * Get all staff with department populated
 * Route: GET /api/admin/staff
 */
const getAllStaff = async (req, res) => {
  try {
    const { department, active, search } = req.query;
    const query = {};

    if (department && mongoose.Types.ObjectId.isValid(department)) {
      query.department = department;
    }

    if (active !== undefined) {
      query.active = active === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
      ];
    }

    const staffList = await Staff.find(query)
      .sort({ name: 1 })
      .populate('department', 'name active');

    return res.status(200).json({
      status: 'success',
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    console.error('Get all staff error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving staff list.',
    });
  }
};

/**
 * Get staff members belonging to a specific department
 * Route: GET /api/admin/departments/:departmentId/staff
 */
const getStaffByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { activeOnly = 'true' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid department ID format.',
      });
    }

    const query = { department: departmentId };
    if (activeOnly === 'true') {
      query.active = true;
    }

    const staffMembers = await Staff.find(query)
      .sort({ name: 1 })
      .populate('department', 'name active');

    return res.status(200).json({
      status: 'success',
      count: staffMembers.length,
      staff: staffMembers,
    });
  } catch (error) {
    console.error('Get staff by department error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving department staff.',
    });
  }
};

/**
 * Create a new staff member
 * Route: POST /api/admin/staff
 */
const createStaff = async (req, res) => {
  try {
    const { name, email, employeeId, department, phone } = req.body;

    if (!name || !email || !employeeId || !department) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, email, employeeId, and department.',
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedEmpId = String(employeeId).trim().toUpperCase();

    // Verify department exists and is active
    let deptDoc;
    if (mongoose.Types.ObjectId.isValid(department)) {
      deptDoc = await Department.findById(department);
    } else {
      deptDoc = await Department.findOne({ name: String(department).trim() });
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
        message: `Cannot assign staff to inactive department "${deptDoc.name}".`,
      });
    }

    // Check duplicate email
    const duplicateEmail = await Staff.findOne({ email: trimmedEmail });
    if (duplicateEmail) {
      return res.status(400).json({
        status: 'error',
        message: `A staff member with email "${trimmedEmail}" already exists.`,
      });
    }

    // Check duplicate employeeId
    const duplicateEmpId = await Staff.findOne({ employeeId: trimmedEmpId });
    if (duplicateEmpId) {
      return res.status(400).json({
        status: 'error',
        message: `Employee ID "${trimmedEmpId}" is already registered.`,
      });
    }

    const staffMember = await Staff.create({
      name: trimmedName,
      email: trimmedEmail,
      employeeId: trimmedEmpId,
      department: deptDoc._id,
      phone: phone ? String(phone).trim() : '',
      active: true,
    });

    await staffMember.populate('department', 'name active');

    return res.status(201).json({
      status: 'success',
      message: `Staff member "${staffMember.name}" created successfully.`,
      staff: staffMember,
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error creating staff member.',
    });
  }
};

/**
 * Update staff details
 * Route: PUT /api/admin/staff/:id
 */
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, employeeId, department, phone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid staff ID format.',
      });
    }

    const staffMember = await Staff.findById(id);
    if (!staffMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found.',
      });
    }

    if (name) staffMember.name = String(name).trim();
    if (phone !== undefined) staffMember.phone = phone ? String(phone).trim() : '';

    // Check email uniqueness if changed
    if (email && String(email).trim().toLowerCase() !== staffMember.email) {
      const newEmail = String(email).trim().toLowerCase();
      const duplicateEmail = await Staff.findOne({ _id: { $ne: id }, email: newEmail });
      if (duplicateEmail) {
        return res.status(400).json({
          status: 'error',
          message: `Another staff member with email "${newEmail}" already exists.`,
        });
      }
      staffMember.email = newEmail;
    }

    // Check employeeId uniqueness if changed
    if (employeeId && String(employeeId).trim().toUpperCase() !== staffMember.employeeId) {
      const newEmpId = String(employeeId).trim().toUpperCase();
      const duplicateEmp = await Staff.findOne({ _id: { $ne: id }, employeeId: newEmpId });
      if (duplicateEmp) {
        return res.status(400).json({
          status: 'error',
          message: `Another staff member with Employee ID "${newEmpId}" already exists.`,
        });
      }
      staffMember.employeeId = newEmpId;
    }

    // Check department if changed
    if (department && department.toString() !== staffMember.department.toString()) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid department ID.',
        });
      }
      const deptDoc = await Department.findById(department);
      if (!deptDoc) {
        return res.status(400).json({
          status: 'error',
          message: 'Selected department does not exist.',
        });
      }
      staffMember.department = deptDoc._id;
    }

    await staffMember.save();
    await staffMember.populate('department', 'name active');

    return res.status(200).json({
      status: 'success',
      message: `Staff member "${staffMember.name}" updated successfully.`,
      staff: staffMember,
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error updating staff member.',
    });
  }
};

/**
 * Toggle staff active status
 * Route: PATCH /api/admin/staff/:id/status
 */
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid staff ID format.',
      });
    }

    const staffMember = await Staff.findById(id);
    if (!staffMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found.',
      });
    }

    staffMember.active = active !== undefined ? Boolean(active) : !staffMember.active;
    await staffMember.save();
    await staffMember.populate('department', 'name active');

    return res.status(200).json({
      status: 'success',
      message: `Staff member "${staffMember.name}" is now ${staffMember.active ? 'Active' : 'Inactive'}.`,
      staff: staffMember,
    });
  } catch (error) {
    console.error('Toggle staff status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error toggling staff status.',
    });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  getAllStaff,
  getStaffByDepartment,
  createStaff,
  updateStaff,
  toggleStaffStatus,
};
