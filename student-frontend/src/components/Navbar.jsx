import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  LayoutDashboard, 
  LogIn, 
  UserPlus, 
  FileText, 
  Menu, 
  X, 
  PlusCircle, 
  ChevronRight, 
  UserCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
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
          <div className="bg-slate-900 text-white p-1.5 sm:p-2 rounded-xl border border-slate-800 shadow-2xs flex-shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              College Grievance Portal
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block font-medium truncate">
              Student Redressal System (Host: 5173)
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isActive('/dashboard') || isActive('/')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/submit-complaint"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isActive('/submit-complaint')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Complaint</span>
              </Link>

              <Link
                to="/complaints"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isActive('/complaints')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Complaints</span>
              </Link>

              <Link
                to="/profile"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isActive('/profile')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UserCircle className="w-3.5 h-3.5" />
                <span>Profile</span>
              </Link>
            </>
          )}
        </div>

        {/* User Profile & Auth Actions */}
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* User Avatar Badge */}
              <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border flex-shrink-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                  {currentUser?.fullName?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                    {currentUser?.fullName}
                  </p>
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Student
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}

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
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                  isActive('/dashboard')
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                  <span>Dashboard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/submit-complaint"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                  isActive('/submit-complaint')
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Submit Complaint</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/complaints"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                  isActive('/complaints')
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>My Complaints</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                  isActive('/profile')
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCircle className="w-4 h-4 text-emerald-600" />
                  <span>Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-3">
                <span className="truncate max-w-[180px]">
                  <strong>{currentUser?.fullName}</strong> (Student)
                </span>
                <button
                  onClick={handleLogout}
                  className="text-rose-600 font-bold hover:underline p-1"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

