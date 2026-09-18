import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ChartCard from '../../components/ChartCard';
import {
  FileText,
  CalendarCheck,
  Percent,
  CheckCircle2,
  XCircle,
  Clock
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

const AdminReports = () => {
  const [days, setDays] = useState(30);
  const [permReport, setPermReport] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [permRes, leaveRes] = await Promise.all([
        api.get(`/reports/permissions?days=${days}`),
        api.get(`/reports/faculty-leaves?days=${days}`),
      ]);
      if (permRes.data.success) setPermReport(permRes.data.data);
      if (leaveRes.data.success) setLeaveReport(leaveRes.data.data);
    } catch (e) {
      console.error('Failed to load reports:', e);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

  const permSummary = [
    { label: 'Total Requests', value: permReport?.summary?.total || 0, color: 'indigo', icon: FileText },
    { label: 'Approved', value: permReport?.summary?.approved || 0, color: 'emerald', icon: CheckCircle2 },
    { label: 'Rejected', value: permReport?.summary?.rejected || 0, color: 'rose', icon: XCircle },
    { label: 'Pending', value: permReport?.summary?.pending || 0, color: 'amber', icon: Clock },
    { label: 'Approval Rate', value: `${permReport?.summary?.approval_rate || 0}%`, color: 'purple', icon: Percent },
  ];

  const leaveSummary = [
    { label: 'Total Leaves', value: leaveReport?.summary?.total_leaves || 0, color: 'indigo', icon: CalendarCheck },
    { label: 'Approved', value: leaveReport?.summary?.approved || 0, color: 'emerald', icon: CheckCircle2 },
    { label: 'Rejected', value: leaveReport?.summary?.rejected || 0, color: 'rose', icon: XCircle },
    { label: 'Substitutions', value: leaveReport?.summary?.total_substitutions || 0, color: 'amber', icon: FileText },
    {
      label: 'Sub. Acceptance',
      value: `${leaveReport?.summary?.substitution_acceptance_rate || 0}%`,
      color: 'purple',
      icon: Percent,
    },
  ];

  const typeChartData = permReport?.by_type?.map((item) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
  })) || [];

  const leaveTypeData = leaveReport?.by_type?.map((item) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
  })) || [];

  const statusChartData = permReport?.by_status?.map((item) => ({
    name: item.status.replace('_', ' '),
    value: item.count,
  })) || [];

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Analytics Center
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2">
              Institutional Reports
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Permission and faculty leave analytics with approval rates
            </p>
          </div>

          {/* Date Range Selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900/80 border border-indigo-400/30 text-indigo-200 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      </div>

      {/* Permissions Summary */}
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-600" />
          Student Permission Analytics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {permSummary.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`glass-card rounded-2xl p-5 border border-${card.color}-500/20 bg-gradient-to-br from-${card.color}-500/10 to-${card.color}-600/5`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{card.label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{card.value}</h3>
                  </div>
                  <div className={`p-3.5 rounded-2xl bg-${card.color}-500/15 text-${card.color}-600 shadow-inner`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Requests by Category" subtitle="Breakdown of permission types">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeChartData}
                cx="50%"
                cy="50%"
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
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests by Status" subtitle="Current distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusChartData}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Faculty Leave Summary */}
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <CalendarCheck className="w-5 h-5 text-amber-500" />
          Faculty Leave & Substitute Analytics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {leaveSummary.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`glass-card rounded-2xl p-5 border border-${card.color}-500/20 bg-gradient-to-br from-${card.color}-500/10 to-${card.color}-600/5`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{card.label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{card.value}</h3>
                  </div>
                  <div className={`p-3.5 rounded-2xl bg-${card.color}-500/15 text-${card.color}-600 shadow-inner`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Faculty Leave Chart */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard title="Leaves by Category" subtitle="Breakdown by leave type">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={leaveTypeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                label={({ name }) => name}
              >
                {leaveTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
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

export default AdminReports;