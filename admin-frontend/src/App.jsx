import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import AdminDashboard from './pages/AdminDashboard';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import AdminComplaintDetailsPage from './pages/AdminComplaintDetailsPage';
import AdminDepartmentsStaffPage from './pages/AdminDepartmentsStaffPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            {/* Direct Admin Routes (Host: 5174) - Zero Login Gate */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/complaints"
              element={
                <ProtectedRoute>
                  <AdminComplaintsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/complaints/:id"
              element={
                <ProtectedRoute>
                  <AdminComplaintDetailsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/departments"
              element={
                <ProtectedRoute>
                  <AdminDepartmentsStaffPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff"
              element={
                <ProtectedRoute>
                  <AdminDepartmentsStaffPage />
                </ProtectedRoute>
              }
            />

            {/* Backwards compatibility & redirect /login directly to /dashboard */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/complaints" element={<Navigate to="/complaints" replace />} />
            <Route path="/admin/complaints/:id" element={<Navigate to="/complaints/:id" replace />} />
            <Route path="/admin/analytics" element={<Navigate to="/analytics" replace />} />
            <Route path="/admin/departments" element={<Navigate to="/departments" replace />} />
            <Route path="/admin/staff" element={<Navigate to="/staff" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
