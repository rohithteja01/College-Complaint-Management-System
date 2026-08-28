import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import AdminComplaintDetailsPage from './pages/AdminComplaintDetailsPage';
import AdminDepartmentsStaffPage from './pages/AdminDepartmentsStaffPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Smart entry redirector: redirects unauthenticated users to /login and authenticated users to their dashboard
function AppRootRedirect() {
  const { currentUser, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="mt-2.5 text-xs text-slate-500 font-medium">Verifying security authorization...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/student/dashboard" replace />;
}

// Smart dashboard redirector based on user role
function DashboardRedirect() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            {/* Entry Gate - Unauthenticated -> /login, Authenticated -> Role Dashboard */}
            <Route path="/" element={<AppRootRedirect />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Generic Dashboard Redirect */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />

            {/* ========================================================= */}
            {/* STUDENT PROTECTED ROUTES (STRICT ROLE: student)           */}
            {/* ========================================================= */}

            {/* Student Dashboard */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student Complaints List */}
            <Route
              path="/student/complaints"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student Lodge Grievance */}
            <Route
              path="/submit-complaint"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <SubmitComplaintPage />
                </ProtectedRoute>
              }
            />

            {/* Student Profile */}
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Student Complaint Details */}
            <Route
              path="/student/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ComplaintDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Complaint Details Universal Alias */}
            <Route
              path="/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <ComplaintDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* ========================================================= */}
            {/* ADMIN PROTECTED ROUTES (STRICT ROLE: admin)               */}
            {/* ========================================================= */}

            {/* Admin Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Complaints Registry */}
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminComplaintsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Specific Complaint Management */}
            <Route
              path="/admin/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminComplaintDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Institutional Analytics Dashboard */}
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Departments Management */}
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDepartmentsStaffPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Staff Management */}
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDepartmentsStaffPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
