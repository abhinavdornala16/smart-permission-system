import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import ChartCard from '../../components/ChartCard';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import {
  Users,
  QrCode,
  UserCheck,
  CheckCircle2,
  Clock,
  BarChart3,
  Building2,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const HODDashboard = () => {
  const [stats, setStats] = useState({});
  const [pendingPermissions, setPendingPermissions] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { entity: 'permission'|'leave', action: 'approve'|'reject', id }

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [reportsRes, permRes, leaveRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/permissions/pending?per_page=10'),
        api.get('/substitutes/hod/pending'),
      ]);

      if (reportsRes.data.success) {
        setStats(reportsRes.data.data);
      }
      if (permRes.data.success) {
        setPendingPermissions(permRes.data.data.requests);
      }
      if (leaveRes.data.success) {
        setPendingLeaves(leaveRes.data.data);
      }

      // Fetch analytics for charts
      const permReportRes = await api.get('/reports/permissions?days=30');
      if (permReportRes.data.success) {
        setReportData(permReportRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load HOD dashboard:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async (remarks) => {
    if (!confirmAction) return;

    try {
      const { entity, action, id } = confirmAction;
      let url = '';
      if (entity === 'permission') {
        url = `/permissions/${id}/${action}`;
      } else {
        url = `/substitutes/hod/${id}/${action}`;
      }

      const res = await api.post(url, { remarks });
      if (res.data.success) {
        setConfirmAction(null);
        fetchData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed.');
    }
  };

  // Chart COLORS
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

  const typeChartData = reportData?.by_type?.map((item) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
  })) || [];

  const trendChartData = reportData?.daily_trend || [];

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Department HOD Portal
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2">
              Head of Department Overview
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Monitor student permissions, faculty leaves, substitution fulfillment, and institutional analytics
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Pending Student Permissions"
          value={pendingPermissions.length}
          icon={QrCode}
          color="indigo"
          subtitle="Awaiting HOD approval"
        />
        <DashboardCard
          title="Pending Faculty Leaves"
          value={pendingLeaves.length}
          icon={UserCheck}
          color="amber"
          subtitle="Forwarded by coordinator"
        />
        <DashboardCard
          title="Today's Substitutions"
          value={stats.substitutions?.today || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Classes covered today"
        />
        <DashboardCard
          title="Department Students"
          value={stats.users?.students || 0}
          icon={Users}
          color="purple"
          subtitle="Active CSE students"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Permission Request Trend (30 Days)" subtitle="Daily permission submissions">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendChartData}>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Permissions by Category" subtitle="Breakdown of permission types">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                label={({ name }) => name}
              >
                {typeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Pending Faculty Leaves Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            Pending Faculty Leave Approvals ({pendingLeaves.length})
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Forwarded by Department Coordinator
          </span>
        </div>

        <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {pendingLeaves.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No faculty leave requests pending HOD approval.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {leave.request_number}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{leave.faculty_name}</span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-500 font-medium">
                        Dept: <strong className="text-slate-700">{leave.department_name || 'CSE'}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      Dates: <strong className="text-slate-900">{leave.start_date && leave.end_date ? `${leave.start_date} to ${leave.end_date}` : leave.date}</strong> &bull; Type: <span className="capitalize font-semibold">{leave.leave_type?.replace('_', ' ')}</span> &bull; Reason: {leave.reason}
                    </p>

                    {/* Coordinator recommendation badge */}
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Verified by Coordinator: <strong className="font-semibold">{leave.coordinator_name || 'Divya Sharma'}</strong>
                        {leave.coordinator_remarks ? ` — "${leave.coordinator_remarks}"` : ' (Recommended)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmAction({ entity: 'leave', action: 'approve', id: leave.id })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Leave
                    </button>
                    <button
                      onClick={() => setConfirmAction({ entity: 'leave', action: 'reject', id: leave.id })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Student Permissions Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-600" />
          Pending Student Permissions ({pendingPermissions.length})
        </h3>

        <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {pendingPermissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No student permission requests pending HOD approval.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Student</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pendingPermissions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{r.student?.full_name}</td>
                      <td className="p-4 font-bold text-indigo-600 capitalize">
                        {r.permission_type?.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-slate-600">
                        {r.date} ({r.from_time}–{r.to_time})
                      </td>
                      <td className="p-4 text-slate-600 max-w-[180px] truncate">{r.reason}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmAction({ entity: 'permission', action: 'approve', id: r.id })}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ entity: 'permission', action: 'reject', id: r.id })}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecute}
        title={confirmAction?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        message={
          confirmAction?.action === 'approve'
            ? 'Are you sure you want to approve this request?'
            : 'Enter reason for rejection.'
        }
        confirmText={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        type={confirmAction?.action === 'approve' ? 'success' : 'danger'}
        requireReason={confirmAction?.action === 'reject'}
        reasonPlaceholder="Enter rejection reason..."
      />
    </div>
  );
};

export default HODDashboard;
