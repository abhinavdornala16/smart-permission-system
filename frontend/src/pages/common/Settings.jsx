import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Shield, KeyRound, CheckCircle2, User } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Both passwords are required.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const res = await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully.' });
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Security Settings</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Manage your security preferences and update password
        </p>
      </div>

      {/* User Info Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" /> Account Profile
        </h3>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block">Full Name</span>
            <span className="font-bold text-slate-900">{user?.full_name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Username</span>
            <span className="font-bold text-indigo-600 font-mono">{user?.username}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Email</span>
            <span className="font-medium text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Role</span>
            <span className="font-bold font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600" /> Change Password
        </h3>

        {message.text && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Current Password *</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">New Password *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
