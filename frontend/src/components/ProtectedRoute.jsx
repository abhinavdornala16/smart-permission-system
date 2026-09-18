import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role ? String(user.role).toLowerCase() : '';
    const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());
    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
