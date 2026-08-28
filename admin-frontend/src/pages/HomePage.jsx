import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  LayoutDashboard,
  Search,
  Building2,
  Clock,
  Sparkles,
  Bot,
  Layers,
  Wrench,
  CheckCircle,
  FilePlus,
  Shield
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [trackingId, setTrackingId] = useState('');
  const [healthStatus, setHealthStatus] = useState({
    loading: false,
    data: null,
    error: null,
  });

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    navigate(`/complaints/${trackingId.trim().toUpperCase()}`);
  };

  const checkHealth = async () => {
    setHealthStatus({ loading: true, data: null, error: null });
    try {
      const response = await api.get('/health');
      setHealthStatus({
        loading: false,
        data: response.data,
        error: null,
      });
    } catch (err) {
      setHealthStatus({
        loading: false,
        data: null,
        error: err.response?.data?.message || err.message || 'Failed to connect to backend server',
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-between">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow w-full space-y-8">
        
        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-2xs">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-4 border border-slate-200">
              <Shield className="w-3.5 h-3.5 text-slate-700" />
              <span>Campus Grievance & Maintenance Management</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Institutional Redressal & Facility Resolution Portal
            </h1>
            
            <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              An enterprise-grade grievance management system for students, faculty, and administrative departments. Log infrastructure faults, track technician routing, and receive real-time updates.
            </p>

            {/* Quick Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Open {isAdmin ? 'Admin Console' : 'Student Dashboard'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/submit-complaint"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>Lodge a Grievance</span>
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Portal Sign In</span>
                  </Link>

                  <Link
                    to="/register"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Student Account</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Grievance Fast-Track Lookup Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Track Grievance By Complaint ID
          </h2>
          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="e.g., CMP-2026-00001"
                className="block w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!trackingId.trim()}
              className="inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <span>Track Ticket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Student Self-Service</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Lodge complaints across 11 campus categories with image/PDF evidence, duplicate alerts, and live tracking.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/60">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Department Routing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Route grievances to specific facility departments (IT, Maintenance, Hostel, Cleanliness) and technicians.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200/60">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">AI Grievance Copilot</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Powered by Google Gemini for categorization suggestions, priority triage, executive summaries, and action items.
            </p>
          </div>
        </div>

        {/* System Health Check Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  System & Database Operational Status
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  GET /api/health • Node.js / Express / MongoDB
                </p>
              </div>
            </div>

            <button
              onClick={checkHealth}
              disabled={healthStatus.loading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthStatus.loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            {healthStatus.loading && (
              <p className="text-xs text-slate-500 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                <span>Checking server status...</span>
              </p>
            )}

            {!healthStatus.loading && healthStatus.data && (
              <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">{healthStatus.data.message}</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700">
                  {healthStatus.data.environment} • MongoDB Connected
                </span>
              </div>
            )}

            {!healthStatus.loading && healthStatus.error && (
              <div className="flex items-center space-x-2 text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{healthStatus.error}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/90 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-slate-700" />
            <span className="font-semibold text-slate-700">College Grievance Management System</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Campus Administration • Confidential & Secure
          </div>
        </div>
      </footer>
    </div>
  );
}
