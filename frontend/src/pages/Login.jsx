import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, User, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const user = await login(username, password);

      // Canonical role-based dashboard redirection
      const getRoleDashboard = (role) => {
        const normalizedRole = role ? String(role).toLowerCase() : '';
        switch (normalizedRole) {
          case 'student':
            return '/student/dashboard';
          case 'mentor':
            return '/mentor/dashboard';
          case 'class_teacher':
            return '/mentor/dashboard';
          case 'faculty':
            return '/faculty/dashboard';
          case 'coordinator':
          case 'department_coordinator':
            return '/coordinator/dashboard';
          case 'hod':
          case 'second_hod':
            return '/hod/dashboard';
          case 'admin':
            return '/admin/dashboard';
          default:
            return '/student/dashboard';
        }
      };

      const targetPath = getRoleDashboard(user?.role);
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Student (Rahul)', user: 'rahul.sharma', pass: 'student123', role: 'Student' },
    { label: 'Faculty (Arjun)', user: 'arjun.mehta', pass: 'faculty123', role: 'Faculty' },
    { label: 'Mentor (Lakshmi)', user: 'lakshmi.devi', pass: 'mentor123', role: 'Mentor' },
    { label: 'Class Teacher (Mahesh)', user: 'mahesh.rao', pass: 'teacher123', role: 'Class Teacher' },
    { label: 'Coordinator (Divya)', user: 'divya.sharma', pass: 'coordinator123', role: 'Coordinator' },
    { label: 'HOD (Dr. Ravi)', user: 'ravi.kumar', pass: 'hod123', role: 'HOD CSE' },
    { label: 'Admin (System)', user: 'admin', pass: 'admin123', role: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/30 to-sky-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4 border border-indigo-400/30">
          <Building2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Dhondi Extension App
        </h2>
        <p className="text-xs font-semibold text-indigo-400 mt-1 uppercase tracking-widest font-mono">
          Smart Permission & Faculty Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-card rounded-3xl p-8 border border-slate-800/80 shadow-2xl bg-slate-900/90 text-white">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your student ID or email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Accounts</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.user}
                  type="button"
                  onClick={() => {
                    setUsername(acc.user);
                    setPassword(acc.pass);
                  }}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-left group"
                >
                  <p className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-300 truncate">
                    {acc.label}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    {acc.user}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
