import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  User, 
  LayoutDashboard, 
  Shield, 
  LogIn, 
  UserPlus, 
  FileText, 
  Layers, 
  Building2, 
  Users,
  BarChart3,
  Menu,
  X,
  PlusCircle,
  ChevronRight,
  UserCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentViewsOpen, setStudentViewsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';
  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link 
          to="/" 
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
              {isAdmin ? 'Administrative Control Center' : 'Student Redressal System'}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
          <Link
            to="/"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isActive('/') 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Home
          </Link>

          {isAuthenticated && (
            <>
              {/* ADMIN NAVIGATION: Full access to Admin + Student Views */}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/admin/dashboard')
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/admin/complaints"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/admin/complaints')
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Complaints</span>
                  </Link>

                  <Link
                    to="/admin/analytics"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/admin/analytics')
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </Link>

                  <Link
                    to="/admin/departments"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/admin/departments')
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Departments</span>
                  </Link>

                  <Link
                    to="/admin/staff"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/admin/staff')
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff</span>
                  </Link>

                  {/* Student View Portal Dropdown for Admin */}
                  <div className="relative">
                    <button
                      onClick={() => setStudentViewsOpen(!studentViewsOpen)}
                      onBlur={() => setTimeout(() => setStudentViewsOpen(false), 200)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        isActive('/student/dashboard') || isActive('/submit-complaint') || isActive('/student/complaints') || isActive('/student/profile')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span>Student Views</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {studentViewsOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                        <Link
                          to="/student/dashboard"
                          className="flex items-center px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          <span>Student Dashboard</span>
                        </Link>
                        <Link
                          to="/submit-complaint"
                          className="flex items-center px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          <span>Submit Complaint</span>
                        </Link>
                        <Link
                          to="/student/complaints"
                          className="flex items-center px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          <span>My Complaints</span>
                        </Link>
                        <Link
                          to="/student/profile"
                          className="flex items-center px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        >
                          <UserCircle className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          <span>Profile</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STUDENT NAVIGATION: Strictly Student Only */}
              {isStudent && (
                <>
                  <Link
                    to="/student/dashboard"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/student/dashboard')
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
                    to="/student/complaints"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/student/complaints')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>My Complaints</span>
                  </Link>

                  <Link
                    to="/student/profile"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive('/student/profile')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* User Profile & Auth Actions */}
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* User Avatar Badge */}
              <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border flex-shrink-0 ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight max-w-[100px] truncate">
                    {currentUser?.fullName}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {currentUser?.role}
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
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 text-xs font-semibold rounded-lg ${
              isActive('/') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              {/* ADMIN MOBILE LINKS (Admin + Student Views) */}
              {isAdmin && (
                <>
                  <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    Admin Operations
                  </div>

                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/admin/dashboard')
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
                    to="/admin/complaints"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/admin/complaints')
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
                    to="/admin/analytics"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/admin/analytics')
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
                    to="/admin/departments"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/admin/departments')
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
                    to="/admin/staff"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/admin/staff')
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

                  <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Student Views & Portals
                  </div>

                  <Link
                    to="/student/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/dashboard')
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>Student Dashboard</span>
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
                    to="/student/complaints"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/complaints')
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
                    to="/student/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/profile')
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
                </>
              )}

              {/* STUDENT MOBILE LINKS (Strictly Student Only) */}
              {isStudent && (
                <>
                  <Link
                    to="/student/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/dashboard')
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
                    to="/student/complaints"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/complaints')
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
                    to="/student/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg ${
                      isActive('/student/profile')
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
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-3">
                <span className="truncate max-w-[180px]">
                  <strong>{currentUser?.fullName}</strong> ({currentUser?.role})
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
