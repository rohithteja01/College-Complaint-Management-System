import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Smart entry redirector: redirects unauthenticated users to /login and authenticated students to /dashboard
function AppRootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="mt-2.5 text-xs text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            {/* Public Authentication Gate */}
            <Route path="/" element={<AppRootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ========================================================= */}
            {/* STUDENT PROTECTED ROUTES (PORT 5173)                      */}
            {/* ========================================================= */}

            {/* Student Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Submit / Lodge Complaint */}
            <Route
              path="/submit-complaint"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <SubmitComplaintPage />
                </ProtectedRoute>
              }
            />

            {/* My Complaints */}
            <Route
              path="/complaints"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Complaint Details */}
            <Route
              path="/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ComplaintDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Student Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Aliases for backwards compatibility */}
            <Route path="/student/dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/student/complaints" element={<Navigate to="/complaints" replace />} />
            <Route path="/student/complaints/:id" element={<Navigate to="/complaints/:id" replace />} />
            <Route path="/student/profile" element={<Navigate to="/profile" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
