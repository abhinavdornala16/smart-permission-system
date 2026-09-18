import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { UserPlus, Search, Trash2, Filter } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState(null);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'student',
    phone: '',
    student_id: '',
    department_name: 'Computer Science and Engineering',
    section: 'A',
    year: 3,
  });

  const roles = [
    'student',
    'mentor',
    'class_teacher',
    'faculty',
    'coordinator',
    'hod',
    'admin',
  ];

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/admin/users?per_page=50&search=${search}`;
      if (roleFilter) url += `&role=${roleFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setUsers(res.data.data.users);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', newUser);
      if (res.data.success) {
        setAddModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivateId) return;
    try {
      const res = await api.delete(`/admin/users/${deactivateId}`);
      if (res.data.success) {
        setDeactivateId(null);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System User Administration</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage students, faculty, mentors, class teachers, HODs, and system administrators
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">User</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="p-4 font-mono text-indigo-600">{u.username}</td>
                    <td className="p-4 text-slate-600">{u.email}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.is_active && u.username !== 'admin' && (
                        <button
                          onClick={() => setDeactivateId(u.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Deactivate User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New System User"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-left text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Username *</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Role *</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
            >
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={handleDeactivateUser}
        title="Deactivate User Account"
        message="Are you sure you want to deactivate this user account?"
        confirmText="Deactivate"
        type="danger"
      />
    </div>
  );
};

export default UserManagement;
