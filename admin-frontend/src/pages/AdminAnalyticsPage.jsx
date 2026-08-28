import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Building2, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Zap, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  Loader2, 
  AlertCircle,
  FolderOpen,
  Tag,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Star,
  Flame,
  Coffee
} from 'lucide-react';
import api from '../services/api';
import { StatsSkeleton } from '../components/Skeleton';

const RANGE_OPTIONS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '3M' },
  { key: '180d', label: '6M' },
  { key: 'all', label: 'All' },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalytics = async (selectedRange = range, start = customStart, end = customEnd) => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = {};
      if (isCustom && (start || end)) {
        if (start) queryParams.startDate = start;
        if (end) queryParams.endDate = end;
      } else {
        queryParams.range = selectedRange;
      }

      const response = await api.get('/admin/analytics', { params: queryParams });
      setData(response.data);
    } catch (err) {
      console.error('Fetch analytics error:', err);
      setError(err.response?.data?.message || 'Failed to load institutional analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, isCustom]);

  const handleRangeClick = (r) => {
    setIsCustom(false);
    setRange(r);
  };

  const kpi = data?.kpi || {
    totalComplaints: 0,
    resolvedComplaints: 0,
    unresolvedComplaints: 0,
    criticalComplaints: 0,
    resolutionRate: 0,
    averageResolutionTimeFormatted: 'N/A',
    averageTimeToAssignmentFormatted: 'N/A',
    averageRating: 0,
    totalRatings: 0,
  };

  const sla = data?.sla || { overdue: 0, dueToday: 0, dueSoon: 0, onTrack: 0 };
  const feedback = data?.feedback || { averageRating: 0, totalRatings: 0, distribution: {} };
  const departmentPerformance = data?.departmentPerformance || [];
  const categoryPerformance = data?.categoryPerformance || [];
  const charts = data?.charts || {};
  const overTime = charts.overTime || [];

  const maxOverTime = Math.max(...overTime.map((d) => d.count), 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Header & Date Range Control */}
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
              <span className="text-xs font-bold text-purple-700">Analytics Intelligence</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5">
              Campus Grievance Analytics & SLA Performance
            </h1>
          </div>

          {/* Range Pills & Custom Date Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleRangeClick(opt.key)}
                  className={`px-2.5 sm:px-3 py-1 font-semibold rounded-md transition-colors ${
                    !isCustom && range === opt.key
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs disabled:opacity-50 min-h-[34px] min-w-[34px] flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6 Executive KPI Metric Cards */}
        {loading ? (
          <StatsSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Grievances</span>
              <span className="text-lg sm:text-2xl font-extrabold text-slate-900">{kpi.totalComplaints}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Resolved</span>
              <span className="text-lg sm:text-2xl font-extrabold text-emerald-900">{kpi.resolvedComplaints}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1">Resolution Rate</span>
              <span className="text-lg sm:text-2xl font-extrabold text-purple-900">{kpi.resolutionRate}%</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Active Backlog</span>
              <span className="text-lg sm:text-2xl font-extrabold text-amber-900">{kpi.unresolvedComplaints}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Avg Resolution</span>
              <span className="text-xs sm:text-base font-extrabold text-blue-900 truncate block">{kpi.averageResolutionTimeFormatted}</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Student Rating</span>
              <span className="text-xs sm:text-base font-extrabold text-amber-900 truncate block">
                {feedback.averageRating ? `${feedback.averageRating}★ (${feedback.totalRatings})` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* SLA Resolution Pipeline Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">SLA Overdue</span>
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-extrabold text-rose-950">{sla.overdue}</span>
            <p className="text-[11px] text-rose-700 mt-0.5">Exceeded SLA resolution deadline</p>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Due Today</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-extrabold text-amber-950">{sla.dueToday}</span>
            <p className="text-[11px] text-amber-700 mt-0.5">Expiring within 24 hours</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Due Soon</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-extrabold text-blue-950">{sla.dueSoon}</span>
            <p className="text-[11px] text-blue-700 mt-0.5">Expiring in 24 - 48 hours</p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">On Track</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-extrabold text-emerald-950">{sla.onTrack}</span>
            <p className="text-[11px] text-emerald-700 mt-0.5">Within comfortable SLA timeline</p>
          </div>
        </div>

        {/* Volume Over Time Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Grievance Volume Over Time
              </h2>
              <p className="text-[11px] text-slate-500">
                Daily submission trends
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>

          {overTime.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No submissions recorded within this time window.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="h-40 sm:h-44 flex items-end space-x-2 pt-6 min-w-[380px] sm:min-w-full">
                {overTime.map((pt) => {
                  const heightPct = Math.round((pt.count / maxOverTime) * 100);
                  return (
                    <div key={pt.date} className="flex-1 min-w-[28px] sm:min-w-[32px] flex flex-col items-center group">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {pt.count}
                      </span>
                      <div
                        className="w-full bg-slate-900 hover:bg-purple-700 rounded-t transition-all"
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-400 mt-1 truncate w-full text-center">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FEATURE 10: DEPARTMENT PERFORMANCE DASHBOARD TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Department Performance & Workload Matrix</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Departmental resolution efficiency, backlog, overdue tickets, and satisfaction ratings
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Resolved</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4">Avg Resolution Time</th>
                  <th className="py-3 px-4 text-right">Student Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {departmentPerformance.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">
                      No departmental metrics recorded yet.
                    </td>
                  </tr>
                ) : (
                  departmentPerformance.map((dept) => (
                    <tr key={dept.department} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {dept.department}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{dept.total}</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{dept.resolved}</td>
                      <td className="py-3 px-4 text-center text-amber-700 font-semibold">{dept.pending}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dept.overdue > 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}`}>
                          {dept.overdue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {dept.avgResolutionTimeFormatted || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {dept.avgRating ? (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⭐ {dept.avgRating} ({dept.ratingCount})
                          </span>
                        ) : (
                          <span className="text-slate-400">No reviews</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FEATURE 11: CATEGORY ANALYTICS DASHBOARD TABLE & STUDENT FEEDBACK BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Category Performance (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <span>Category Performance & Quality Breakdown</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Includes all campus grievance categories, including Canteen
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Total</th>
                    <th className="py-3 px-4 text-center">Resolved</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4">Avg Resolution</th>
                    <th className="py-3 px-4 text-right">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categoryPerformance.map((cat) => (
                    <tr key={cat.category} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {cat.category === 'Canteen' ? '🍔 Canteen' : cat.category}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{cat.total}</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{cat.resolved}</td>
                      <td className="py-3 px-4 text-center text-amber-700 font-semibold">{cat.pending}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {cat.avgResolutionTimeFormatted || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {cat.avgRating ? (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⭐ {cat.avgRating}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Feedback Analytics Card (1 col) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Student Resolution Feedback
                </h3>
                <p className="text-[11px] text-slate-500">
                  Overall institutional satisfaction rating
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center space-y-1">
              <span className="text-3xl font-extrabold text-amber-950">
                {feedback.averageRating ? `${feedback.averageRating} / 5` : 'N/A'}
              </span>
              <div className="flex items-center justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      feedback.averageRating && star <= Math.round(feedback.averageRating)
                        ? 'text-amber-500 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                Based on {feedback.totalRatings || 0} student ratings
              </p>
            </div>

            {/* 1-5 Star Breakdown Bar Chart */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Rating Distribution
              </span>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = feedback.distribution?.[star] || 0;
                const totalR = feedback.totalRatings || 1;
                const pct = feedback.totalRatings > 0 ? Math.round((count / totalR) * 100) : 0;
                return (
                  <div key={star} className="flex items-center space-x-2 text-xs">
                    <span className="w-8 font-mono text-slate-600 font-bold">{star}★</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right font-mono text-slate-400 text-[11px]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
