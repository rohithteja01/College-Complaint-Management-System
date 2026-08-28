import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Users, 
  Inbox, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Wrench, 
  CheckCircle2, 
  Archive, 
  Flame, 
  BarChart3, 
  PieChart, 
  ArrowRight, 
  RefreshCw, 
  Loader2, 
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  Tag,
  Building2,
  ChevronRight,
  X,
  Star,
  Coffee,
  AlertOctagon,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import { StatsSkeleton, TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';

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

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Deletion Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    complaintId: null,
    complaintTitle: '',
    loading: false,
  });

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/admin/stats');
      setStatsData(response.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const confirmDelete = (c) => {
    setDeleteModal({
      isOpen: true,
      complaintId: c.complaintId || c._id || c.id,
      complaintTitle: c.title,
      loading: false,
    });
  };

  const executeDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/admin/complaints/${deleteModal.complaintId}`);
      setActionNotice(`Complaint ${deleteModal.complaintId} was successfully deleted.`);
      setDeleteModal({ isOpen: false, complaintId: null, complaintTitle: '', loading: false });
      fetchStats(true);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete complaint.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const { stats = {}, distributions = {}, recentComplaints = [], sla = {}, feedback = {} } = statsData || {};
  const total = stats.total || 0;

  const location = useLocation();
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(
    location.state?.accessDenied
      ? `Redirected to Admin Dashboard: "${location.state.blockedPath}" is restricted to students.`
      : null
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Access Denied Redirection Alert */}
        {accessDeniedMessage && (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 flex items-start justify-between gap-3 animate-in fade-in shadow-2xs">
            <div className="flex items-start space-x-2.5">
              <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <strong className="font-bold block">Student Route Protected</strong>
                <p className="text-xs mt-0.5 text-purple-800">{accessDeniedMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setAccessDeniedMessage(null)}
              className="text-purple-600 hover:text-purple-900 p-1 rounded-lg hover:bg-purple-100"
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

        {/* Welcome Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wider">
                Admin Console
              </span>
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                {currentUser?.email}
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">
              Campus Grievance Operations
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Live status overview, SLA resolution monitoring, and facility performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-50 min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/analytics"
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 shadow-2xs min-h-[36px]"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>

            <Link
              to="/complaints"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs min-h-[36px]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Complaints</span>
            </Link>
          </div>
        </div>

        {/* SLA Resolution Pipeline Alerts Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          <div className="bg-rose-50/70 p-3 sm:p-4 rounded-xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">Overdue SLA</span>
              <Flame className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-rose-900">{sla.overdue || 0}</span>
          </div>

          <div className="bg-amber-50/70 p-3 sm:p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Due Today</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-amber-900">{sla.dueToday || 0}</span>
          </div>

          <div className="bg-blue-50/70 p-3 sm:p-4 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Due Soon</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-blue-900">{sla.dueSoon || 0}</span>
          </div>

          <div className="bg-emerald-50/70 p-3 sm:p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">On Track</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-emerald-900">{sla.onTrack || 0}</span>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Avg Rating</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-amber-900">
              {feedback.averageRating ? `${feedback.averageRating}★` : 'N/A'}
            </span>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Canteen</span>
              <Coffee className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold text-slate-900">{stats.canteen || 0}</span>
          </div>
        </div>

        {/* 8 Responsive Metric KPI Cards */}
        {loading ? (
          <StatsSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total</span>
              <span className="text-lg sm:text-2xl font-extrabold text-slate-900">{stats.total || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Submitted</span>
              <span className="text-lg sm:text-2xl font-extrabold text-blue-900">{stats.submitted || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Reviewing</span>
              <span className="text-lg sm:text-2xl font-extrabold text-amber-900">{stats.underReview || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Assigned</span>
              <span className="text-lg sm:text-2xl font-extrabold text-indigo-900">{stats.assigned || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1">In Progress</span>
              <span className="text-lg sm:text-2xl font-extrabold text-purple-900">{stats.inProgress || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Resolved</span>
              <span className="text-lg sm:text-2xl font-extrabold text-emerald-900">{stats.resolved || 0}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Closed</span>
              <span className="text-lg sm:text-2xl font-extrabold text-slate-700">{stats.closed || 0}</span>
            </div>

            <div className="bg-rose-50/60 p-3 sm:p-4 rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">Critical</span>
              <span className="text-lg sm:text-2xl font-extrabold text-rose-900">{stats.critical || 0}</span>
            </div>
          </div>
        )}

        {/* Distributions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">By Category</h3>
              <Tag className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {distributions.byCategory && Object.keys(distributions.byCategory).length > 0 ? (
                Object.entries(distributions.byCategory).map(([cat, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-700 font-semibold text-[11px]">
                        <span>{cat}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">No records yet.</div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">By Priority</h3>
              <Flame className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {distributions.byPriority && Object.keys(distributions.byPriority).length > 0 ? (
                Object.entries(distributions.byPriority).map(([pri, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colorMap = { Critical: 'bg-rose-600', High: 'bg-amber-500', Medium: 'bg-blue-600', Low: 'bg-slate-400' };
                  return (
                    <div key={pri} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-700 font-semibold text-[11px]">
                        <span>{pri}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`${colorMap[pri] || 'bg-slate-500'} h-1.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">No records yet.</div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Status Pipeline</h3>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {distributions.byStatus && Object.keys(distributions.byStatus).length > 0 ? (
                Object.entries(distributions.byStatus).map(([st, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={st} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-700 font-semibold text-[11px]">
                        <span>{st}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">No records yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Grievances: Responsive Dual Layout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Recent Grievances
              </h2>
              <p className="text-[11px] text-slate-500">
                Latest submissions requiring administrative triage
              </p>
            </div>

            <Link
              to="/complaints"
              className="inline-flex items-center space-x-1 text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No grievances lodged yet"
              description="New student submissions will populate this administrative dashboard in real time."
            />
          ) : (
            <>
              {/* 1. Mobile Cards View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {recentComplaints.map((c) => (
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
                    <p className="text-[11px] text-slate-500">
                      Student: <strong>{c.student?.fullName || 'Student'}</strong> ({c.student?.email})
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{c.category} • {c.location}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => confirmDelete(c)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-800 p-1"
                          title="Delete Complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                        <Link
                          to={`/complaints/${c.id || c._id || c.complaintId}`}
                          className="inline-flex items-center space-x-1 font-bold text-purple-700 hover:text-purple-800"
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
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentComplaints.map((c) => (
                      <tr
                        key={c._id || c.id || c.complaintId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link
                            to={`/complaints/${c.id || c._id || c.complaintId}`}
                            className="hover:underline hover:text-purple-700"
                          >
                            {c.complaintId}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{c.student?.fullName || 'Student'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{c.student?.email || '-'}</p>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          <p className="font-medium text-slate-900 truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{c.location}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                          {c.category}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              PRIORITY_COLORS[c.priority] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
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
                              to={`/complaints/${c.id || c._id || c.complaintId}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold hover:bg-purple-50 hover:text-purple-700 border border-slate-200 transition-colors"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3 h-3" />
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
          message={`Are you sure you want to delete complaint "${deleteModal.complaintTitle}" (${deleteModal.complaintId})? This will remove it from active complaint registries.`}
          confirmText="Delete Complaint"
          cancelText="Cancel"
          type="danger"
          loading={deleteModal.loading}
        />
      </div>
    </div>
  );
}
