import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Role-Based Protected Route Guard
 * Enforces:
 * 1. Authentication check (redirects to /login if unauthenticated)
 * 2. Role authorization:
 *    - Admin: FULL UNIVERSAL ACCESS across all application routes.
 *    - Student: Restricted strictly to student routes. Any attempt to access
 *      admin routes triggers a block & redirection to /student/dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 text-slate-700 animate-spin" />
        <p className="mt-2.5 text-xs text-slate-500 font-medium">
          Verifying security authorization...
        </p>
      </div>
    );
  }

  // 1. Authentication Check
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin users have full universal access to all routes
  if (currentUser?.role === 'admin') {
    return children;
  }

  // 2. Role Authorization Check for Students
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    // If a student attempts to access admin-only routes -> redirect to student dashboard
    if (currentUser?.role === 'student') {
      return (
        <Navigate
          to="/student/dashboard"
          state={{ accessDenied: true, blockedPath: location.pathname }}
          replace
        />
      );
    }

    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
