import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  RotateCcw, 
  LayoutDashboard, 
  Layers, 
  Building2, 
  Users, 
  BarChart3, 
  Menu, 
  X, 
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleResetSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link 
          to="/dashboard" 
          className="flex items-center space-x-2 sm:space-x-3 group transition-opacity hover:opacity-90 min-w-0"
        >
          <div className="bg-purple-900 text-white p-1.5 sm:p-2 rounded-xl border border-purple-800 shadow-2xs flex-shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              College Grievance Portal
            </h1>
            <p className="text-[10px] sm:text-[11px] text-purple-700 hidden sm:block font-semibold truncate">
              Administrative Control Center (Host: 5174)
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
          <Link
            to="/dashboard"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/dashboard') || isActive('/')
                ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/complaints"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/complaints')
                ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Complaints</span>
          </Link>

          <Link
            to="/analytics"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/analytics')
                ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </Link>

          <Link
            to="/departments"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/departments')
                ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments</span>
          </Link>

          <Link
            to="/staff"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/staff')
                ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff</span>
          </Link>
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border flex-shrink-0 bg-purple-50 text-purple-800 border-purple-200">
                {currentUser?.fullName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                  {currentUser?.fullName || 'Administrator'}
                </p>
                <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                  Administrator
                </span>
              </div>
            </div>

            <button
              onClick={handleResetSession}
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Refresh administrator session"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none border border-slate-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-3 sm:px-4 py-3 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/dashboard') || isActive('/')
                ? 'bg-purple-50 text-purple-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LayoutDashboard className="w-4 h-4 text-purple-600" />
              <span>Dashboard</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <Link
            to="/complaints"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/complaints')
                ? 'bg-purple-50 text-purple-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Complaints</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <Link
            to="/analytics"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/analytics')
                ? 'bg-purple-50 text-purple-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Analytics</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <Link
            to="/departments"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/departments')
                ? 'bg-purple-50 text-purple-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>Departments</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <Link
            to="/staff"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/staff')
                ? 'bg-purple-50 text-purple-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Staff</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-3">
            <span className="truncate max-w-[180px]">
              <strong>{currentUser?.fullName || 'Administrator'}</strong>
            </span>
            <button
              onClick={handleResetSession}
              className="text-purple-700 font-bold hover:underline p-1"
            >
              Reset Session
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

