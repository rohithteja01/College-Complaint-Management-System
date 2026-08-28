import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Zap, 
  User, 
  Shield, 
  ChevronDown, 
  ChevronUp, 
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DevAuthBanner() {
  const { currentUser, devLogin } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // In production, render nothing
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleDevSwitch = async (targetRole) => {
    setSwitching(true);
    try {
      await devLogin(targetRole);
      if (targetRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('Failed to switch dev role:', err);
    } finally {
      setSwitching(false);
    }
  };

  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-[11px] relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2">
        
        {/* Left Indicator */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Dev Auth Mode (Hold Active)</span>
          </span>

          <span className="text-slate-400 hidden sm:inline text-[11px]">
            Session: <strong className="text-slate-200">{currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Unauthenticated'}</strong>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDevSwitch('student')}
            disabled={switching}
            className={`px-2.5 py-0.5 rounded-md font-semibold flex items-center space-x-1 transition-colors ${
              isStudent
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Dev Student</span>
          </button>

          <button
            onClick={() => handleDevSwitch('admin')}
            disabled={switching}
            className={`px-2.5 py-0.5 rounded-md font-semibold flex items-center space-x-1 transition-colors ${
              isAdmin
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Dev Admin</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 ml-1"
            title="Toggle quick jump links"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Quick Links */}
      {isOpen && (
        <div className="bg-slate-950 px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-300">Quick Jump:</span>
            <Link to="/student/dashboard" className="hover:text-emerald-400 hover:underline">Student Dashboard</Link>
            <span>•</span>
            <Link to="/submit-complaint" className="hover:text-emerald-400 hover:underline">Submit Grievance</Link>
            <span>•</span>
            <Link to="/admin/dashboard" className="hover:text-purple-400 hover:underline">Admin Dashboard</Link>
            <span>•</span>
            <Link to="/admin/analytics" className="hover:text-purple-400 hover:underline">Analytics</Link>
            <span>•</span>
            <Link to="/admin/complaints" className="hover:text-purple-400 hover:underline">Complaints Table</Link>
            <span>•</span>
            <Link to="/admin/departments" className="hover:text-purple-400 hover:underline">Dept & Staff</Link>
          </div>
          <span className="text-slate-500 text-[10px]">Real JWT running in background</span>
        </div>
      )}
    </div>
  );
}
