import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Hash, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  PlusCircle, 
  Layers,
  Calendar,
  Lock,
  GraduationCap
} from 'lucide-react';
import api from '../services/api';
import { StatsSkeleton } from '../components/Skeleton';

export default function StudentProfilePage() {
  const { currentUser } = useAuth();
  const [complaintsCount, setComplaintsCount] = useState({ total: 0, resolved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/complaints/my');
        const list = response.data.complaints || [];
        const resolved = list.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;
        setComplaintsCount({
          total: list.length,
          resolved,
          pending: list.length - resolved,
        });
      } catch (err) {
        console.error('Failed to load profile summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">Student Account</span>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-xs flex-shrink-0">
                {currentUser?.fullName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                    {currentUser?.fullName || 'Student Name'}
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                    Student
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Institutional Grievance Portal Profile
                </p>
              </div>
            </div>

            <Link
              to="/submit-complaint"
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs min-h-[36px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lodge Grievance</span>
            </Link>
          </div>

          {/* Student Info Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </span>
              <p className="font-semibold text-slate-900 text-sm">{currentUser?.email}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5" />
                <span>Student Roll / ID</span>
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {currentUser?.studentId || 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Academic Department</span>
              </span>
              <p className="font-semibold text-slate-900 text-sm">
                {currentUser?.department || 'General Studies'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Role & Permissions</span>
              </span>
              <p className="font-semibold text-emerald-800 text-sm">
                Standard Student Redressal Privileges
              </p>
            </div>
          </div>

          {/* Grievance Activity Overview */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Grievance Redressal Activity</span>
            </h3>

            {loading ? (
              <StatsSkeleton count={3} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Filed</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{complaintsCount.total}</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Resolved</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-900">{complaintsCount.resolved}</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-center">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Active / Pending</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-900">{complaintsCount.pending}</span>
                </div>
              </div>
            )}
          </div>

          {/* Privacy & Security Note */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start space-x-3">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800">Strict Student Privacy & Isolation</p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Your submitted grievances and personal communication timeline are strictly protected under role-based authorization. Other students cannot access your complaint records or administrative discussions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
