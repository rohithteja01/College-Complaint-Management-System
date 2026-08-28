import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Hash, 
  ShieldCheck, 
  Loader2, 
  X, 
  Save, 
  AlertCircle, 
  RefreshCw,
  Power,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminDepartmentsStaffPage() {
  const [activeTab, setActiveTab] = useState('departments');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: null, message: null });

  // Filter states
  const [deptSearch, setDeptSearch] = useState('');
  const [deptActiveFilter, setDeptActiveFilter] = useState('');

  const [staffSearch, setStaffSearch] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState('');
  const [staffActiveFilter, setStaffActiveFilter] = useState('');

  // Modals state
  const [deptModal, setDeptModal] = useState({ open: false, mode: 'create', data: null });
  const [staffModal, setStaffModal] = useState({ open: false, mode: 'create', data: null });

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: null,
  });

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    phone: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: null, message: null }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, staffRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/staff'),
      ]);
      setDepartments(deptRes.data.departments || []);
      setStaffList(staffRes.data.staff || []);
    } catch (err) {
      console.error('Error fetching departments & staff:', err);
      showFeedback('error', 'Failed to fetch departments and staff data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Department Modal Handlers
  const handleOpenCreateDept = () => {
    setDeptForm({ name: '', description: '' });
    setDeptModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditDept = (dept) => {
    setDeptForm({ name: dept.name, description: dept.description || '' });
    setDeptModal({ open: true, mode: 'edit', data: dept });
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (deptModal.mode === 'create') {
        const res = await api.post('/admin/departments', deptForm);
        setDepartments((prev) => [res.data.department, ...prev]);
        showFeedback('success', `Department "${deptForm.name}" created successfully.`);
      } else {
        const res = await api.put(`/admin/departments/${deptModal.data._id}`, deptForm);
        setDepartments((prev) =>
          prev.map((d) => (d._id === deptModal.data._id ? res.data.department : d))
        );
        showFeedback('success', `Department updated successfully.`);
      }
      setDeptModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      console.error('Save department error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to save department.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleDeptStatus = (dept) => {
    const nextStatus = !dept.active;
    setConfirmModalState({
      isOpen: true,
      title: `${nextStatus ? 'Activate' : 'Deactivate'} Department`,
      message: `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} "${dept.name}"? ${
        !nextStatus ? 'Deactivated departments cannot receive new complaint assignments.' : ''
      }`,
      type: nextStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const res = await api.patch(`/admin/departments/${dept._id}/toggle-status`);
          setDepartments((prev) =>
            prev.map((d) => (d._id === dept._id ? res.data.department : d))
          );
          showFeedback('success', `Department ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
        } catch (err) {
          showFeedback('error', err.response?.data?.message || 'Failed to toggle status.');
        } finally {
          setConfirmModalState({ isOpen: false });
        }
      },
    });
  };

  // Staff Modal Handlers
  const handleOpenCreateStaff = () => {
    setStaffForm({
      name: '',
      email: '',
      employeeId: '',
      department: departments[0]?._id || '',
      phone: '',
    });
    setStaffModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditStaff = (staff) => {
    setStaffForm({
      name: staff.name,
      email: staff.email,
      employeeId: staff.employeeId,
      department: staff.department?._id || staff.department || '',
      phone: staff.phone || '',
    });
    setStaffModal({ open: true, mode: 'edit', data: staff });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (staffModal.mode === 'create') {
        const res = await api.post('/admin/staff', staffForm);
        setStaffList((prev) => [res.data.staff, ...prev]);
        showFeedback('success', `Staff member "${staffForm.name}" created successfully.`);
      } else {
        const res = await api.put(`/admin/staff/${staffModal.data._id}`, staffForm);
        setStaffList((prev) =>
          prev.map((s) => (s._id === staffModal.data._id ? res.data.staff : s))
        );
        showFeedback('success', 'Staff member updated successfully.');
      }
      setStaffModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      console.error('Save staff error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to save staff member.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStaffStatus = (staff) => {
    const nextStatus = !staff.active;
    setConfirmModalState({
      isOpen: true,
      title: `${nextStatus ? 'Activate' : 'Deactivate'} Staff Member`,
      message: `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} technician "${staff.name}"? ${
        !nextStatus ? 'Deactivated staff members cannot receive new assignments.' : ''
      }`,
      type: nextStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const res = await api.patch(`/admin/staff/${staff._id}/toggle-status`);
          setStaffList((prev) =>
            prev.map((s) => (s._id === staff._id ? res.data.staff : s))
          );
          showFeedback('success', `Staff member ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
        } catch (err) {
          showFeedback('error', err.response?.data?.message || 'Failed to toggle status.');
        } finally {
          setConfirmModalState({ isOpen: false });
        }
      },
    });
  };

  const filteredDepartments = departments.filter((d) => {
    if (deptSearch.trim() && !d.name.toLowerCase().includes(deptSearch.toLowerCase())) {
      return false;
    }
    if (deptActiveFilter === 'active' && !d.active) return false;
    if (deptActiveFilter === 'inactive' && d.active) return false;
    return true;
  });

  const filteredStaff = staffList.filter((s) => {
    if (
      staffSearch.trim() &&
      !s.name.toLowerCase().includes(staffSearch.toLowerCase()) &&
      !s.employeeId.toLowerCase().includes(staffSearch.toLowerCase()) &&
      !s.email.toLowerCase().includes(staffSearch.toLowerCase())
    ) {
      return false;
    }
    if (staffDeptFilter && (s.department?._id || s.department) !== staffDeptFilter) {
      return false;
    }
    if (staffActiveFilter === 'active' && !s.active) return false;
    if (staffActiveFilter === 'inactive' && s.active) return false;
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link
                to="/admin/dashboard"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-purple-700">Organization</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5">
              Departments & Personnel
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs min-h-[36px]"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {activeTab === 'departments' ? (
              <button
                onClick={handleOpenCreateDept}
                className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCreateStaff}
                className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-2xs min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 space-x-4 sm:space-x-6 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-2.5 sm:pb-3 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'departments'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-2.5 sm:pb-3 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'staff'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff ({staffList.length})</span>
          </button>
        </div>

        {/* TAB 1: DEPARTMENTS (Dual View: Table on Desktop, Cards on Mobile) */}
        {activeTab === 'departments' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  placeholder="Search department..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <select
                value={deptActiveFilter}
                onChange={(e) => setDeptActiveFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : filteredDepartments.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No departments found"
                description="Create facility departments to organize complaint assignment workflows."
                actionText="Add Department"
                onActionClick={handleOpenCreateDept}
              />
            ) : (
              <>
                {/* 1. Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredDepartments.map((dept) => (
                    <div key={dept._id} className="p-3.5 space-y-2 hover:bg-slate-50/70">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{dept.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md border font-semibold text-[10px] ${
                            dept.active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {dept.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600">
                        {dept.description || <span className="text-slate-400 italic">No description</span>}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleDeptStatus(dept)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                            dept.active ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {dept.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Department Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDepartments.map((dept) => (
                        <tr key={dept._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {dept.name}
                          </td>
                          <td className="py-3 px-4 max-w-sm text-slate-600 truncate">
                            {dept.description || <span className="text-slate-400 italic">No description provided</span>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                dept.active
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {dept.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleOpenEditDept(dept)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
                              title="Edit department"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleDeptStatus(dept)}
                              className={`p-1.5 rounded-md transition-colors ${
                                dept.active
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={dept.active ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: STAFF (Dual View: Table on Desktop, Cards on Mobile) */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff name, ID, email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={staffDeptFilter}
                  onChange={(e) => setStaffDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 flex-1 sm:flex-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>

                <select
                  value={staffActiveFilter}
                  onChange={(e) => setStaffActiveFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 flex-1 sm:flex-none"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff members found"
                description="Add support engineers and facility technicians to assign complaint resolution tickets."
                actionText="Add Staff Member"
                onActionClick={handleOpenCreateStaff}
              />
            ) : (
              <>
                {/* 1. Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredStaff.map((staff) => (
                    <div key={staff._id} className="p-3.5 space-y-2 hover:bg-slate-50/70">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{staff.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">{staff.employeeId}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md border font-semibold text-[10px] ${
                            staff.active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {staff.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600">
                        <div>Dept: <strong>{staff.department?.name || 'Unassigned'}</strong></div>
                        <div>Email: {staff.email}</div>
                        {staff.phone && <div>Phone: {staff.phone}</div>}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditStaff(staff)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStaffStatus(staff)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                            staff.active ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {staff.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Staff Name</th>
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStaff.map((staff) => (
                        <tr key={staff._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {staff.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                            {staff.employeeId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                            {staff.department?.name || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            <div>{staff.email}</div>
                            {staff.phone && <div className="text-[11px] text-slate-400">{staff.phone}</div>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                staff.active
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {staff.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleOpenEditStaff(staff)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
                              title="Edit staff"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(staff)}
                              className={`p-1.5 rounded-md transition-colors ${
                                staff.active
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={staff.active ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Department Modal (Responsive Scroll Protection) */}
      {deptModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl w-[94vw] sm:w-full max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {deptModal.mode === 'create' ? 'Create Department' : 'Edit Department'}
              </h3>
              <button
                onClick={() => setDeptModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g., Electrical Maintenance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Scope of responsibilities..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeptModal({ open: false, mode: 'create', data: null })}
                  className="px-3 py-1.5 font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal (Responsive Scroll Protection) */}
      {staffModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl w-[94vw] sm:w-full max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {staffModal.mode === 'create' ? 'Create Staff Member' : 'Edit Staff Member'}
              </h3>
              <button
                onClick={() => setStaffModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g., Rajesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.employeeId}
                    onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                    placeholder="EMP-104"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="staff@college.edu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStaffModal({ open: false, mode: 'create', data: null })}
                  className="px-3 py-1.5 font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        type={confirmModalState.type}
      />
    </div>
  );
}
