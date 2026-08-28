import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Eye, 
  MapPin, 
  Building2, 
  User, 
  Calendar, 
  Loader2, 
  ArrowLeft, 
  X, 
  ArrowUpDown,
  Download,
  Shield,
  Layers,
  Inbox,
  ChevronRight,
  RefreshCw,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = [
  'Classroom',
  'Laboratory',
  'Hostel',
  'Wi-Fi',
  'Infrastructure',
  'Transportation',
  'Cleanliness',
  'Library',
  'Electricity',
  'Water',
  'Canteen',
  'Other',
];

const STATUSES = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUS_COLORS = {
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PRIORITY_COLORS = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
};

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchComplaints = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (category) params.category = category;
      if (priority) params.priority = priority;
      if (department) params.department = department;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (sortBy) params.sortBy = sortBy;

      const response = await api.get('/admin/complaints', { params });
      setComplaints(response.data.complaints || []);
    } catch (err) {
      console.error('Failed to fetch admin complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments');
      setDepartments(response.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [status, category, priority, department, startDate, endDate, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    complaintId: null,
    complaintTitle: '',
    loading: false,
  });
  const [actionNotice, setActionNotice] = useState(null);

  const confirmDelete = (c) => {
    setDeleteModal({
      isOpen: true,
      complaintId: c._id || c.complaintId,
      complaintTitle: c.title,
      loading: false,
    });
  };

  const executeDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/admin/complaints/${deleteModal.complaintId}`);
      setComplaints((prev) =>
        prev.filter(
          (c) => c._id !== deleteModal.complaintId && c.complaintId !== deleteModal.complaintId
        )
      );
      setActionNotice(`Complaint ${deleteModal.complaintId} was successfully deleted.`);
      setDeleteModal({ isOpen: false, complaintId: null, complaintTitle: '', loading: false });
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error('Delete complaint error:', err);
      alert(err.response?.data?.message || 'Failed to delete complaint.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setPriority('');
    setDepartment('');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  const hasActiveFilters = search || status || category || priority || department || startDate || endDate || sortBy !== 'newest';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
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
              <span className="text-xs font-bold text-slate-700">Complaint Registry</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5">
              Campus Grievances Registry
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchComplaints(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Multi-Filter Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs space-y-2.5 sm:space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, title, student..."
                className="block w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((pri) => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.name} value={dept._id || dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </form>

          {/* Date & Sort Row */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              />
              <span className="text-slate-400 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="priority">Sort: Critical First</option>
                <option value="updated">Sort: Updated</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Complaints Table / Mobile Cards Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Total Records: <strong>{complaints.length}</strong>
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : complaints.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={hasActiveFilters ? 'No grievances match your search' : 'No grievances logged'}
              description={
                hasActiveFilters
                  ? 'Try broadening your filter criteria or clearing search keywords.'
                  : 'New student grievance submissions will populate this administrative registry.'
              }
              secondaryText={hasActiveFilters ? 'Reset Filters' : null}
              onSecondaryClick={hasActiveFilters ? resetFilters : null}
            />
          ) : (
            <>
              {/* 1. Mobile Cards View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {complaints.map((c) => (
                  <div key={c._id || c.complaintId} className="p-3.5 space-y-2 hover:bg-slate-50/70">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.complaintId}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[c.priority] || 'bg-slate-100'}`}>
                          {c.priority}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${STATUS_COLORS[c.status] || 'bg-slate-100'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>

                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                      <div>Student: <strong>{c.student?.fullName || 'Student'}</strong> ({c.student?.studentId || c.student?.email})</div>
                      <div>Location: <strong>{c.location}</strong> • Dept: <strong>{c.assignedDepartment?.name || 'Unassigned'}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{c.category} • {new Date(c.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => confirmDelete(c)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                        <Link
                          to={`/admin/complaints/${c._id || c.complaintId}`}
                          className="inline-flex items-center space-x-1 font-bold text-purple-700 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Complaint ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Title & Location</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Filed</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {complaints.map((c) => (
                      <tr
                        key={c._id || c.complaintId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link
                            to={`/admin/complaints/${c._id || c.complaintId}`}
                            className="hover:underline hover:text-purple-700"
                          >
                            {c.complaintId}
                          </Link>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{c.student?.fullName || 'Student'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{c.student?.studentId || c.student?.email}</p>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span>{c.location}</span>
                          </p>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                          {c.category}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.assignedDepartment ? (
                            <span className="text-slate-800 font-medium">
                              {c.assignedDepartment.name || c.assignedDepartment}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[11px] ${
                              PRIORITY_COLORS[c.priority] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md border font-semibold text-[11px] ${
                              STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => confirmDelete(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Complaint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/admin/complaints/${c._id || c.complaintId}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Confirmation Modal for Soft Deletion */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, complaintId: null, complaintTitle: '', loading: false })}
          onConfirm={executeDelete}
          title="Delete Complaint"
          message={`Are you sure you want to delete complaint "${deleteModal.complaintTitle}" (${deleteModal.complaintId})? This will soft-delete the ticket and remove it from active complaint registries.`}
          confirmText="Delete Complaint"
          cancelText="Cancel"
          type="danger"
          loading={deleteModal.loading}
        />
      </div>
    </div>
  );
}
