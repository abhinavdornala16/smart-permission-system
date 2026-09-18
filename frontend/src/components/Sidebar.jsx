import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Award,
  QrCode,
  UserCheck,
  Bell,
  Settings,
  X,
  LogOut,
  Building2,
  Users,
  Clock,
  BarChart3,
  Calendar,
  CheckSquare,
  History
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Generate dynamic navigation items based on strict user role
  const getNavItems = () => {
    if (!user) return [];

    const role = user.role ? String(user.role).toLowerCase() : '';

    switch (role) {
      case 'student':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Attendance', path: '/placeholder/attendance', icon: CalendarCheck, functional: false, tag: 'Dhondi Core' },
          { name: 'Assignments', path: '/placeholder/assignments', icon: FileText, functional: false, tag: 'Dhondi Core' },
          { name: 'Results', path: '/placeholder/results', icon: Award, functional: false, tag: 'Dhondi Core' },
          { name: 'Permissions', path: '/student/my-requests', icon: QrCode, functional: true, badge: 'Passes' },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'faculty':
        return [
          { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'My Timetable', path: '/faculty/dashboard', icon: Calendar, functional: true },
          { name: 'Faculty Leave', path: '/faculty/my-leaves', icon: UserCheck, functional: true, badge: 'Smart Sub' },
          { name: 'Substitute Requests', path: '/faculty/substitute-requests', icon: Clock, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'mentor':
        return [
          { name: 'Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Student Permissions', path: '/mentor/pending', icon: QrCode, functional: true },
          { name: 'Pending Approvals', path: '/mentor/pending', icon: CheckSquare, functional: true, badge: 'Review' },
          { name: 'Approval History', path: '/mentor/pending', icon: History, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'class_teacher':
        return [
          { name: 'Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Student Permissions', path: '/mentor/pending', icon: QrCode, functional: true },
          { name: 'Pending Approvals', path: '/mentor/pending', icon: CheckSquare, functional: true, badge: 'Review' },
          { name: 'Approval History', path: '/mentor/pending', icon: History, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'coordinator':
        return [
          { name: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Faculty Leave', path: '/coordinator/leaves', icon: UserCheck, functional: true, badge: 'Verify' },
          { name: 'Substitute Management', path: '/coordinator/leaves', icon: Clock, functional: true },
          { name: 'Faculty Availability', path: '/coordinator/dashboard', icon: Users, functional: true },
          { name: 'Timetable', path: '/coordinator/dashboard', icon: Calendar, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Reports', path: '/admin/reports', icon: BarChart3, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'hod':
        return [
          { name: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Student Permissions', path: '/hod/permissions', icon: QrCode, functional: true },
          { name: 'Faculty Leave', path: '/hod/faculty-leaves', icon: UserCheck, functional: true, badge: 'Final Appr' },
          { name: 'Substitute Management', path: '/coordinator/leaves', icon: Clock, functional: true },
          { name: 'Timetable', path: '/hod/dashboard', icon: Calendar, functional: true },
          { name: 'Reports', path: '/admin/reports', icon: BarChart3, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      case 'admin':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'User Management', path: '/admin/users', icon: Users, functional: true },
          { name: 'Student Management', path: '/admin/users?role=student', icon: Users, functional: true },
          { name: 'Faculty Management', path: '/admin/users?role=faculty', icon: UserCheck, functional: true },
          { name: 'Timetable Management', path: '/admin/dashboard', icon: Calendar, functional: true },
          { name: 'Permissions', path: '/hod/permissions', icon: QrCode, functional: true },
          { name: 'Faculty Leave', path: '/coordinator/leaves', icon: UserCheck, functional: true },
          { name: 'Substitute Management', path: '/coordinator/leaves', icon: Clock, functional: true },
          { name: 'Workflow Configuration', path: '/admin/workflows', icon: Clock, functional: true },
          { name: 'Reports', path: '/admin/reports', icon: BarChart3, functional: true },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];

      default:
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, functional: true },
          { name: 'Notifications', path: '/notifications', icon: Bell, functional: true },
          { name: 'Settings', path: '/settings', icon: Settings, functional: true },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-slate-900 text-slate-100 z-50 transition-transform duration-300 ease-in-out border-r border-slate-800 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                  Dhondi <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">EXT</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">Smart Permission ERP</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Badge */}
          {user && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
              {user?.role === 'admin' ? 'Administration Modules' : 'Application Modules'}
            </p>
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={`${item.name}-${idx}`}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive: linkActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive || (linkActive && item.path !== '#')
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : item.functional
                        ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 opacity-90'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.tag && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded shrink-0">
                      {item.tag}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
