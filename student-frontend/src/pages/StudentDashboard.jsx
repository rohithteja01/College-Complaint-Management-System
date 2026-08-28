import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlusCircle, 
  ArrowRight, 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  MapPin, 
  Calendar, 
  Loader2, 
  RefreshCw,
  Eye,
  Tag,
  Inbox,
  AlertTriangle,
  FileCheck2,
  Archive,
  ArrowUpDown,
  Layers,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Sparkles,
  SearchCode,
  Compass,
  Star,
  Lock,
  Wrench,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { StatsSkeleton, TableSkeleton } from '../components/Skeleton';
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

const PRIORITY_BADGES = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_BADGES = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

// 5-Stage Stepper Definition
const TRACKING_STAGES = [
  { key: 'Submitted', label: 'Submitted', desc: 'Complaint Logged' },
  { key: 'Under Review', label: 'Under Review', desc: 'Admin Triage' },
  { key: 'In Progress', label: 'In Progress', desc: 'Technician Assigned' },
  { key: 'Resolved', label: 'Resolved', desc: 'Work Completed' },
  { key: 'Closed', label: 'Closed', desc: 'Ticket Closed' },
];

const getStageIndex = (status) => {
  if (status === 'Submitted') return 0;
  if (status === 'Under Review') return 1;
  if (status === 'Assigned' || status === 'In Progress') return 2;
  if (status === 'Resolved') return 3;
  if (status === 'Closed') return 4;
  return 0;
};

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Tracking State
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'resolved'

  // Deletion Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    complaintId: null,
    complaintTitle: '',
    loading: false,
  });

  const fetchMyComplaints = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/complaints/my');
      const list = response.data.complaints || [];
      setComplaints(list);

      // Auto-set the most recent complaint into the tracker if none is selected
      if (list.length > 0 && !trackedComplaint) {
        setTrackedComplaint(list[0]);
        setTrackingIdInput(list[0].complaintId);
      }
    } catch (err) {
      console.error('Failed to fetch student complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  // Track Complaint by ID Handler
  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    const queryId = trackingIdInput.trim().toUpperCase();
    if (!queryId) return;

    // Check if complaint is already in memory
    const existing = complaints.find(
      (c) => c.complaintId?.toUpperCase() === queryId || c._id === queryId || c.id === queryId
    );
    if (existing) {
      setTrackedComplaint(existing);
      setTrackingError(null);
      return;
    }

    // Otherwise fetch directly from backend API
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await api.get(`/complaints/${queryId}`);
      if (res.data.complaint) {
        setTrackedComplaint(res.data.complaint);
      } else {
        setTrackingError(`No complaint found with tracking reference "${queryId}".`);
      }
    } catch (err) {
      setTrackingError(err.response?.data?.message || `Complaint ID "${queryId}" not found.`);
    } finally {
      setTrackingLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;
    const submitted = complaints.filter((c) => c.status === 'Submitted').length;
    const underReview = complaints.filter((c) => c.status === 'Under Review').length;
    const inProgress = complaints.filter(
      (c) => c.status === 'In Progress' || c.status === 'Assigned'
    ).length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    const closed = complaints.filter((c) => c.status === 'Closed').length;

    return { total, submitted, underReview, inProgress, resolved, closed };
  }, [complaints]);

  // Find recently resolved complaint for notification area
  const recentResolvedComplaint = useMemo(() => {
    return complaints.find(
      (c) => (c.status === 'Resolved' || c.status === 'Closed') && (c.resolvedAt || c.resolutionDetails?.summary || c.resolutionDetails?.message)
    ) || complaints.find((c) => c.status === 'Resolved');
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = c.title?.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          const matchId = c.complaintId?.toLowerCase().includes(q);
          const matchLoc = c.location?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchId && !matchLoc) return false;
        }
        if (categoryFilter && c.category !== categoryFilter) return false;
        if (statusFilter && c.status !== statusFilter) return false;
        if (priorityFilter && c.priority !== priorityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortBy === 'updated') {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [complaints, searchQuery, categoryFilter, statusFilter, priorityFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || categoryFilter || statusFilter || priorityFilter || sortBy !== 'newest'
  );

  const location = useLocation();
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(
    location.state?.accessDenied
      ? `Access Denied: You do not have administrator privileges to access "${location.state.blockedPath}". You were redirected to your Student Dashboard.`
      : null
  );

  // Trigger Delete Confirmation
  const confirmDelete = (c) => {
    setDeleteModal({
      isOpen: true,
      complaintId: c.complaintId || c._id,
      complaintTitle: c.title,
      loading: false,
    });
  };

  // Execute Soft Delete
  const handleExecuteDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/complaints/${deleteModal.complaintId}`);
      setComplaints((prev) =>
        prev.filter(
          (c) => c.complaintId !== deleteModal.complaintId && c._id !== deleteModal.complaintId
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

  // Current tracked stage calculation
  const currentStageIdx = trackedComplaint ? getStageIndex(trackedComplaint.status) : -1;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Access Denied Redirection Alert */}
        {accessDeniedMessage && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start justify-between gap-3 animate-in fade-in shadow-2xs">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <strong className="font-bold block">Restricted Administrative Route</strong>
                <p className="text-xs mt-0.5 text-amber-800">{accessDeniedMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setAccessDeniedMessage(null)}
              className="text-amber-600 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Header & Student Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-2xs flex-shrink-0">
              {currentUser?.fullName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                  {currentUser?.fullName || 'Student Portal'}
                </h1>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  Student Console
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate">{currentUser?.email}</span>
                {currentUser?.studentId && <span>• ID: <strong className="font-mono text-slate-700">{currentUser.studentId}</strong></span>}
                {currentUser?.department && <span className="hidden sm:inline">• {currentUser.department}</span>}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchMyComplaints(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 min-h-[36px]"
              title="Refresh complaints"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/submit-complaint"
              className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs flex-shrink-0 min-h-[36px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lodge Grievance</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LIVE GRIEVANCE TRACKER (MAIN DASHBOARD TRACKING CONSOLE)                  */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Live Grievance Tracker
                </h2>
                <p className="text-[11px] text-slate-300">
                  Track real-time resolution progress, technician assignment, and status updates
                </p>
              </div>
            </div>

            {/* Quick Track Input Form */}
            <form onSubmit={handleTrackSubmit} className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={trackingIdInput}
                  onChange={(e) => setTrackingIdInput(e.target.value)}
                  placeholder="Enter ID: CMP-2026-00001"
                  className="w-48 sm:w-56 px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading || !trackingIdInput.trim()}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-2xs disabled:opacity-50 flex items-center space-x-1"
              >
                {trackingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchCode className="w-3.5 h-3.5" />}
                <span>Track</span>
              </button>
            </form>
          </div>

          {/* Tracking Body */}
          <div className="p-4 sm:p-6 space-y-5">
            {trackingError && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackedComplaint ? (
              <div className="space-y-6">
                {/* Tracked Ticket Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                        {trackedComplaint.complaintId}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${STATUS_BADGES[trackedComplaint.status] || 'bg-slate-100'}`}>
                        {trackedComplaint.status}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_BADGES[trackedComplaint.priority] || 'bg-slate-100'}`}>
                        {trackedComplaint.priority} Priority
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded">
                        {trackedComplaint.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate mt-1">
                      {trackedComplaint.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trackedComplaint.location}</span>
                      {trackedComplaint.assignedDepartment && (
                        <span>• Dept: <strong>{trackedComplaint.assignedDepartment.name || trackedComplaint.assignedDepartment}</strong></span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Link
                      to={`/complaints/${trackedComplaint.id || trackedComplaint._id || trackedComplaint.complaintId}`}
                      className="inline-flex items-center space-x-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      <span>Full Timeline & Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* 5-STAGE PROGRESS STEPPER VISUALIZATION */}
                <div className="py-2">
                  <div className="relative">
                    {/* Background Connecting Line */}
                    <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0 hidden sm:block">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${(Math.max(0, currentStageIdx) / (TRACKING_STAGES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Stepper Nodes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative z-10">
                      {TRACKING_STAGES.map((stage, idx) => {
                        const isCompleted = idx < currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <div
                            key={stage.key}
                            className="flex sm:flex-col items-center sm:text-center space-x-3 sm:space-x-0"
                          >
                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all flex-shrink-0 ${
                                isCompleted
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                  : isCurrent
                                  ? 'bg-white border-emerald-600 text-emerald-700 ring-4 ring-emerald-100 font-extrabold'
                                  : 'bg-slate-100 border-slate-300 text-slate-400'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : isCurrent ? (
                                <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            <div className="mt-0 sm:mt-2 text-left sm:text-center">
                              <p
                                className={`text-xs font-bold leading-tight ${
                                  isCurrent
                                    ? 'text-emerald-900 font-extrabold'
                                    : isCompleted
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stage.label}
                              </p>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {stage.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Resolution Summary Box if Resolved */}
                {['Resolved', 'Closed'].includes(trackedComplaint.status) && (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Official Resolution Completed
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                        "{trackedComplaint.resolutionDetails?.summary || trackedComplaint.resolutionDetails?.message || 'The issue was inspected and resolved by campus staff.'}"
                      </p>
                    </div>

                    <Link
                      to={`/complaints/${trackedComplaint.id || trackedComplaint._id || trackedComplaint.complaintId}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex-shrink-0 shadow-2xs"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>{trackedComplaint.feedback?.rating ? 'View Rating' : 'Rate Resolution'}</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <p>No grievance selected. Type a complaint reference above (e.g. <strong>CMP-2026-00001</strong>) to view live progress.</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistical Summary Cards */}
        {loading ? (
          <StatsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total Filed</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.total}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">All time submissions</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">In Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-900">
                {stats.submitted + stats.underReview}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Awaiting assignment</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-700">In Progress</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-purple-900">{stats.inProgress}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Under maintenance</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Resolved</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-900">{stats.resolved + stats.closed}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Resolved & closed</p>
            </div>
          </div>
        )}

        {/* Complaints Filter & Search Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
          
          {/* Quick Filter Tab Navigation */}
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Submissions ({complaints.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'active'
                  ? 'bg-purple-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Active / In Progress ({stats.submitted + stats.underReview + stats.inProgress})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-emerald-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Resolved & Completed ({stats.resolved + stats.closed})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints by title, ID, location, description..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Stats or Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Complaints Table & Cards Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Showing <strong>{filteredComplaints.length}</strong> of <strong>{complaints.length}</strong> grievances
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredComplaints.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={hasActiveFilters ? 'No grievances match your filter' : 'No grievances logged yet'}
              description={
                hasActiveFilters
                  ? 'Try broadening your search keywords or resetting active filter criteria.'
                  : 'You have not submitted any grievance tickets yet. Use the Lodge Grievance button to submit your first report.'
              }
              actionText={!hasActiveFilters ? 'Lodge New Grievance' : null}
              actionLink={!hasActiveFilters ? '/submit-complaint' : null}
              secondaryText={hasActiveFilters ? 'Reset Filters' : null}
              onSecondaryClick={hasActiveFilters ? resetFilters : null}
            />
          ) : (
            <>
              {/* 1. Mobile Cards View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredComplaints.map((c) => (
                  <div key={c._id || c.complaintId} className="p-3.5 space-y-2 hover:bg-slate-50/70">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.complaintId}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_BADGES[c.priority] || 'bg-slate-100'}`}>
                          {c.priority}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${STATUS_BADGES[c.status] || 'bg-slate-100'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{c.title}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{c.category} • {new Date(c.createdAt).toLocaleDateString()}</span>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setTrackedComplaint(c);
                            setTrackingIdInput(c.complaintId);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1"
                          title="Track on live stepper"
                        >
                          <Compass className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Track</span>
                        </button>
                        <Link
                          to={`/complaints/${c.id || c._id || c.complaintId}`}
                          className="inline-flex items-center space-x-1 font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                        >
                          <span>View</span>
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
                      <th className="py-3 px-4">Title & Location</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredComplaints.map((c) => (
                      <tr
                        key={c._id || c.complaintId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link
                            to={`/complaints/${c.id || c._id || c.complaintId}`}
                            className="hover:underline hover:text-emerald-700"
                          >
                            {c.complaintId}
                          </Link>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span>{c.location}</span>
                          </p>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                          {c.category}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] ${PRIORITY_BADGES[c.priority] || 'bg-slate-100'}`}>
                            {c.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-md border font-semibold text-[11px] ${STATUS_BADGES[c.status] || 'bg-slate-100'}`}>
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setTrackedComplaint(c);
                                setTrackingIdInput(c.complaintId);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                              title="Track Live Progress"
                            >
                              <Compass className="w-3 h-3" />
                              <span>Track</span>
                            </button>

                            <button
                              onClick={() => confirmDelete(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Complaint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/complaints/${c.id || c._id || c.complaintId}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <span>View</span>
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
          onConfirm={handleExecuteDelete}
          title="Delete Complaint"
          message={`Are you sure you want to delete complaint "${deleteModal.complaintTitle}" (${deleteModal.complaintId})? This will soft-delete the ticket.`}
          confirmText="Delete Complaint"
          cancelText="Cancel"
          type="danger"
          loading={deleteModal.loading}
        />
      </div>
    </div>
  );
}
