import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import PlaceholderModule from './pages/PlaceholderModule';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import VerifyPass from './pages/common/VerifyPass';
import NotificationsPage from './pages/common/Notifications';
import SettingsPage from './pages/common/Settings';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import MyRequests from './pages/student/MyRequests';

// Mentor / Class Teacher Pages
import PendingPermissions from './pages/mentor/PendingPermissions';

// Faculty Pages
import FacultyDashboard from './pages/faculty/Dashboard';
import SubstituteRequests from './pages/faculty/SubstituteRequests';

// Coordinator Pages
import CoordinatorSubstituteManagement from './pages/coordinator/SubstituteManagement';

// HOD Pages
import HODDashboard from './pages/hod/Dashboard';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminReports from './pages/admin/Reports';
import AdminAuditLogs from './pages/admin/AuditLogs';
import UserManagement from './pages/admin/UserManagement';
import WorkflowConfigPage from './pages/admin/WorkflowConfig';

// Default Role Redirection Component
const RoleRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role ? String(user.role).toLowerCase() : '';

  switch (role) {
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    case 'mentor':
      return <Navigate to="/mentor/dashboard" replace />;
    case 'class_teacher':
      return <Navigate to="/mentor/dashboard" replace />;
    case 'faculty':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'coordinator':
    case 'department_coordinator':
      return <Navigate to="/coordinator/dashboard" replace />;
    case 'hod':
    case 'second_hod':
      return <Navigate to="/hod/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/student/dashboard" replace />;
  }
};

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-pass/:passId" element={<VerifyPass />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Authenticated Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRedirect />} />
          <Route path="dashboard" element={<RoleRedirect />} />

          {/* Student Routes */}
          <Route
            path="student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/my-requests"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyRequests />
              </ProtectedRoute>
            }
          />

          {/* Mentor / Class Teacher Routes */}
          <Route
            path="mentor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'class_teacher', 'hod', 'admin']}>
                <PendingPermissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="mentor/pending"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'class_teacher', 'hod', 'admin']}>
                <PendingPermissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="classteacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['class_teacher', 'mentor', 'hod', 'admin']}>
                <PendingPermissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="class-teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['class_teacher', 'mentor', 'hod', 'admin']}>
                <PendingPermissions />
              </ProtectedRoute>
            }
          />

          {/* Faculty Routes */}
          <Route
            path="faculty/dashboard"
            element={
              <ProtectedRoute allowedRoles={['faculty', 'coordinator', 'hod', 'admin']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/timetable"
            element={
              <ProtectedRoute allowedRoles={['faculty', 'coordinator', 'hod', 'admin']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/my-leaves"
            element={
              <ProtectedRoute allowedRoles={['faculty', 'coordinator', 'hod', 'admin']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty/substitute-requests"
            element={
              <ProtectedRoute allowedRoles={['faculty', 'coordinator', 'hod', 'admin']}>
                <SubstituteRequests />
              </ProtectedRoute>
            }
          />

          {/* Coordinator Routes */}
          <Route
            path="coordinator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['coordinator', 'hod', 'admin']}>
                <CoordinatorSubstituteManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="coordinator/leaves"
            element={
              <ProtectedRoute allowedRoles={['coordinator', 'hod', 'admin']}>
                <CoordinatorSubstituteManagement />
              </ProtectedRoute>
            }
          />

          {/* HOD Routes */}
          <Route
            path="hod/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hod', 'admin']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="hod/permissions"
            element={
              <ProtectedRoute allowedRoles={['hod', 'admin']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="hod/faculty-leaves"
            element={
              <ProtectedRoute allowedRoles={['hod', 'admin']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/workflows"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <WorkflowConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'coordinator']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <AdminAuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Placeholder Dhondi Core Modules */}
          <Route path="placeholder/:module" element={<PlaceholderModule />} />

          {/* Common Authenticated Routes */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<SettingsPage />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
