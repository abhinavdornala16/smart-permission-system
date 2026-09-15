import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ApplyPermission from './ApplyPermission';
import QRPassCard from '../../components/QRPassCard';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [reqRes, passRes] = await Promise.all([
        api.get('/permissions/my-requests?per_page=5'),
        api.get('/permissions/my-passes'),
      ]);

      if (reqRes.data.success) {
        setRequests(reqRes.data.data.requests);
      }
      if (passRes.data.success) {
        setPasses(passRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  // Stats calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => ['pending', 'under_review'].includes(r.status)).length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const activePasses = passes.filter((p) => p.is_valid);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Student Dashboard
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2 text-white">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              ID: <span className="font-mono">{user?.student?.student_id || '21CSE001'}</span> &bull; Dept: {user?.student?.department || 'CSE'} &bull; Sec: {user?.student?.section || 'A'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setApplyModalOpen(true)}
              className="flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 hover:from-indigo-400 hover:to-sky-300 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply Permission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Requests"
          value={totalCount}
          icon={FileText}
          color="indigo"
          subtitle="All submitted applications"
        />
        <DashboardCard
          title="Pending Approval"
          value={pendingCount}
          icon={Clock}
          color="amber"
          subtitle="Under review by faculty"
        />
        <DashboardCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Passes generated"
        />
        <DashboardCard
          title="Active Passes"
          value={activePasses.length}
          icon={QrCode}
          color="sky"
          subtitle="Ready to scan/verify"
        />
      </div>

      {/* Main Grid: Active QR Passes & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active QR Passes Widget */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              Active QR Passes
            </h3>
            <span className="text-xs text-slate-500 font-mono font-semibold">
              {activePasses.length} active
            </span>
          </div>

          {activePasses.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center border border-slate-200 bg-white">
              <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No active QR passes</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Approved permissions automatically generate digital QR passes.
              </p>
            </div>
          ) : (
            activePasses.map((pass) => (
              <div
                key={pass.id}
                onClick={() => setSelectedPass(pass)}
                className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-50/50 to-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {pass.pass_number}
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {pass.request?.permission_type?.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Valid till: {new Date(pass.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white rounded-xl border p-1 shadow-inner shrink-0">
                  {pass.qr_image && (
                    <img
                      src={`data:image/png;base64,${pass.qr_image}`}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Requests Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Recent Permission Requests
            </h3>
            <Link
              to="/student/my-requests"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No permission requests submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Req #</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Approver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{r.request_number}</td>
                        <td className="p-3.5 font-bold text-slate-800 capitalize">
                          {r.permission_type?.replace('_', ' ')}
                        </td>
                        <td className="p-3.5 text-slate-600">{r.date} ({r.from_time}–{r.to_time})</td>
                        <td className="p-3.5">
                          <StatusBadge status={r.status} size="small" />
                        </td>
                        <td className="p-3.5 text-slate-600 capitalize">
                          {r.current_approver_role?.replace('_', ' ') || 'Completed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Permission Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply For Permission"
        maxWidth="max-w-xl"
      >
        <ApplyPermission
          onSuccess={() => {
            setApplyModalOpen(false);
            fetchData();
          }}
        />
      </Modal>

      {/* QR Pass View Modal */}
      <Modal
        isOpen={!!selectedPass}
        onClose={() => setSelectedPass(null)}
        title="Digital Permission Pass"
        maxWidth="max-w-md"
      >
        {selectedPass && <QRPassCard pass={selectedPass} permission={selectedPass.request} />}
      </Modal>
    </div>
  );
};

export default StudentDashboard;
