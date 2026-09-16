import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import DashboardCard from '../../components/DashboardCard';
import ChartCard from '../../components/ChartCard';
import {
  Users,
  UserCheck,
  QrCode,
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  XCircle,
  Activity
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
  Legend,
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [reportData, setReportData] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [adminRes, permReportRes, leaveReportRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/reports/permissions?days=30'),
        api.get('/reports/faculty-leaves?days=30'),
      ]);

      if (adminRes.data.success) setStats(adminRes.data.data);
      if (permReportRes.data.success) setReportData(permReportRes.data.data);
      if (leaveReportRes.data.success) setLeaveReport(leaveReportRes.data.data);
    } catch (e) {
      console.error('Failed to load Admin dashboard:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

  const typeChartData = reportData?.by_type?.map((item) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
  })) || [];

  const trendChartData = reportData?.daily_trend || [];
  const leaveTypeData = leaveReport?.by_type?.map((item) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
  })) || [];

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              System Administrator Portal
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2">
              Platform Overview
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Institution-wide users, permissions, faculty leave, substitution, and QR pass analytics
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Users"
          value={stats.total_users || 0}
          icon={Users}
          color="indigo"
          subtitle={`${stats.active_users || 0} active · ${stats.total_departments || 0} departments`}
        />
        <DashboardCard
          title="Students"
          value={stats.total_students || 0}
          icon={UserCheck}
          color="purple"
          subtitle="Registered student accounts"
        />
        <DashboardCard
          title="Staff"
          value={stats.total_faculty || 0}
          icon={Building2}
          color="sky"
          subtitle="Faculty, mentors & coordinators"
        />
        <DashboardCard
          title="Active QR Passes"
          value={stats.active_qr_passes || 0}
          icon={QrCode}
          color="emerald"
          subtitle="Live verifiable passes"
        />
      </div>

      {/* Workflow Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Pending Permissions"
          value={stats.pending_permissions || 0}
          icon={Clock}
          color="amber"
          subtitle="In approval pipeline"
        />
        <DashboardCard
          title="Approved Permissions"
          value={stats.approved_permissions || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Fully approved requests"
        />
        <DashboardCard
          title="Pending Faculty Leaves"
          value={stats.pending_leaves || 0}
          icon={Activity}
          color="rose"
          subtitle="Awaiting coordinator/HOD"
        />
        <DashboardCard
          title="Rejected Requests"
          value={stats.rejected_permissions || 0}
          icon={XCircle}
          color="amber"
          subtitle="Rejected applications"
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

      {/* Faculty Leave Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Faculty Leave Trend" subtitle="By leave category (30 days)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leaveTypeData}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Permission Status Mix" subtitle="Approved / Rejected / Pending (30 days)">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Approved', value: reportData?.summary?.approved || 0 },
                  { name: 'Rejected', value: reportData?.summary?.rejected || 0 },
                  { name: 'Pending', value: reportData?.summary?.pending || 0 },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name }) => name}
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default AdminDashboard;