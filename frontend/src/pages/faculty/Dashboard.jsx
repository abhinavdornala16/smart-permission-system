import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ApplyLeave from './ApplyLeave';
import {
  Calendar,
  Clock,
  UserCheck,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  UserX,
  FileText,
  History,
  XCircle
} from 'lucide-react';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [subRequests, setSubRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [profRes, leavesRes, subRes] = await Promise.all([
        api.get('/faculty/profile'),
        api.get('/faculty/leaves?per_page=50'),
        api.get('/substitutes/pending'),
      ]);

      if (profRes.data.success) {
        setProfile(profRes.data.data);
      }
      if (leavesRes.data.success) {
        setMyLeaves(leavesRes.data.data.leaves || []);
      }
      if (subRes.data.success) {
        setSubRequests(subRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load faculty dashboard:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const stats = profile?.stats || {};
  const todayClasses = profile?.today_classes || [];

  const pendingLeavesCount = myLeaves.filter(
    (l) => l.status === 'pending_coordinator' || l.status === 'pending_hod' || l.status === 'coordinator_review' || l.status === 'hod_review'
  ).length;

  const approvedLeavesCount = myLeaves.filter((l) => l.status === 'approved').length;
  const rejectedLeavesCount = myLeaves.filter((l) => l.status === 'rejected').length;

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Faculty Portal
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2 text-white">
              Welcome, {user?.full_name}!
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Emp ID: <span className="font-mono">{user?.faculty?.employee_id || 'FAC-001'}</span> &bull; Dept: {user?.faculty?.department || 'Computer Science and Engineering'} &bull; Designation: {user?.faculty?.designation || 'Faculty'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setApplyModalOpen(true)}
              className="flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 hover:from-indigo-400 hover:to-sky-300 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Today's Classes"
          value={stats.today_classes || todayClasses.length}
          icon={BookOpen}
          color="indigo"
          subtitle="Scheduled lectures"
        />
        <DashboardCard
          title="Pending Leaves"
          value={pendingLeavesCount}
          icon={Clock}
          color="amber"
          subtitle="Awaiting Coordinator / HOD"
        />
        <DashboardCard
          title="Approved Leaves"
          value={approvedLeavesCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Approved leave requests"
        />
        <DashboardCard
          title="Rejected Leaves"
          value={rejectedLeavesCount}
          icon={XCircle}
          color="rose"
          subtitle="Declined requests"
        />
      </div>

      {/* Pending Substitution Alerts */}
      {subRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserX className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">You have {subRequests.length} pending substitution request(s)!</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                A colleague has requested you to substitute their class.
              </p>
            </div>
          </div>

          <Link
            to="/faculty/substitute-requests"
            className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm shrink-0"
          >
            Review Requests
          </Link>
        </div>
      )}

      {/* Section: My Leave Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              My Leave Requests ({myLeaves.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track multi-tier approval progress: Faculty &rarr; Coordinator &rarr; HOD &rarr; Final Decision
            </p>
          </div>

          <button
            onClick={() => setApplyModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Apply for Leave
          </button>
        </div>

        <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading leave requests...
            </div>
          ) : myLeaves.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              No leave requests found. Click "Apply for Leave" above to submit one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Req #</th>
                    <th className="p-4">Leave Type</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">{l.request_number}</td>
                      <td className="p-4 font-bold text-slate-800 capitalize">
                        {l.leave_type?.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div>
                          {l.start_date && l.end_date && l.start_date !== l.end_date
                            ? `${l.start_date} to ${l.end_date}`
                            : l.date}
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">{l.session?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4 text-slate-600 max-w-[200px] truncate">{l.reason}</td>
                      <td className="p-4">
                        <StatusBadge status={l.status} size="small" />
                      </td>
                      <td className="p-4 text-slate-600">
                        {l.current_approver ? (
                          <span className="font-semibold capitalize text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {l.current_approver === 'coordinator' ? 'Dept Coordinator' : l.current_approver === 'hod' ? 'HOD' : l.current_approver}
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLeave(l)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold transition-colors flex items-center gap-1 ml-auto"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Timeline</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Today's Classes & Pending Substitution Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Timetable */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Today's Schedule ({new Date().toLocaleDateString('en-US', { weekday: 'long' })})
            </h3>
            <Link to="/faculty/timetable" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              Full Timetable
            </Link>
          </div>

          <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {todayClasses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No classes scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayClasses.map((cls) => (
                  <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Period {cls.period} &bull; {cls.start_time} - {cls.end_time}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{cls.subject}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Section: <span className="font-semibold text-slate-700">{cls.section}</span> {cls.room && `• Room: ${cls.room}`}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Substitution Requests as Substitute */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Incoming Substitute Requests
            </h3>
            <Link to="/faculty/substitute-requests" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>

          <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {subRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No incoming substitution requests.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subRequests.map((sub) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{sub.original_faculty_name}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Subject: <strong className="text-slate-800">{sub.subject}</strong> ({sub.section})
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">
                        Date: {sub.date} ({sub.start_time} - {sub.end_time})
                      </span>
                    </div>

                    <Link
                      to="/faculty/substitute-requests"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
                    >
                      Respond
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Approval Timeline Modal */}
      <Modal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title={`Leave Details & Approval Timeline — ${selectedLeave?.request_number}`}
        maxWidth="max-w-xl"
      >
        {selectedLeave && (
          <div className="space-y-6 text-left text-xs">
            {/* Overview Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedLeave.leave_type?.toUpperCase().replace(/_/g, ' ')} LEAVE
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Dates: <strong>{selectedLeave.start_date && selectedLeave.end_date ? `${selectedLeave.start_date} to ${selectedLeave.end_date}` : selectedLeave.date}</strong>
                  </p>
                </div>
                <StatusBadge status={selectedLeave.status} />
              </div>

              <div className="border-t border-indigo-200/60 pt-2 text-slate-700 space-y-1">
                <p><strong className="text-slate-900">Reason:</strong> {selectedLeave.reason}</p>
                {selectedLeave.remarks && (
                  <p><strong className="text-slate-900">Faculty Remarks:</strong> {selectedLeave.remarks}</p>
                )}
                {selectedLeave.coordinator_remarks && (
                  <p><strong className="text-slate-900">Coordinator Remarks:</strong> {selectedLeave.coordinator_remarks}</p>
                )}
                {selectedLeave.hod_remarks && (
                  <p><strong className="text-slate-900">HOD Remarks:</strong> {selectedLeave.hod_remarks}</p>
                )}
              </div>
            </div>

            {/* Approval Workflow Timeline */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
                Leave Approval Timeline
              </h4>

              <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* 1. Submitted Step */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Leave Submitted</p>
                    <p className="text-[11px] text-slate-500">{selectedLeave.faculty_name} &bull; {selectedLeave.created_at?.split('T')[0]}</p>
                  </div>
                </div>

                {/* 2. Coordinator Step */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedLeave.coordinator_approved_at
                      ? 'bg-emerald-500 text-white'
                      : selectedLeave.status === 'rejected' && !selectedLeave.hod_remarks
                      ? 'bg-rose-500 text-white'
                      : selectedLeave.status === 'pending_coordinator' || selectedLeave.status === 'coordinator_review'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedLeave.coordinator_approved_at ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : selectedLeave.status === 'rejected' && !selectedLeave.hod_remarks ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Department Coordinator Review</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedLeave.coordinator_approved_at
                        ? `Approved by Divya Sharma (${selectedLeave.coordinator_approved_at.split('T')[0]})`
                        : selectedLeave.status === 'rejected' && !selectedLeave.hod_remarks
                        ? 'Rejected by Department Coordinator'
                        : selectedLeave.status === 'pending_coordinator' || selectedLeave.status === 'coordinator_review'
                        ? 'Pending Coordinator Approval (Divya Sharma)'
                        : 'Awaiting Coordinator Review'}
                    </p>
                    {selectedLeave.coordinator_remarks && (
                      <p className="text-[11px] text-slate-600 italic mt-0.5">"{selectedLeave.coordinator_remarks}"</p>
                    )}
                  </div>
                </div>

                {/* 3. HOD Step */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedLeave.hod_approved_at
                      ? 'bg-emerald-500 text-white'
                      : selectedLeave.status === 'rejected' && selectedLeave.hod_remarks
                      ? 'bg-rose-500 text-white'
                      : selectedLeave.status === 'pending_hod' || selectedLeave.status === 'hod_review'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedLeave.hod_approved_at ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : selectedLeave.status === 'rejected' && selectedLeave.hod_remarks ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Head of Department Final Decision</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedLeave.hod_approved_at
                        ? `Approved by Dr. Ravi Kumar (${selectedLeave.hod_approved_at.split('T')[0]})`
                        : selectedLeave.status === 'rejected' && selectedLeave.hod_remarks
                        ? 'Rejected by HOD'
                        : selectedLeave.status === 'pending_hod' || selectedLeave.status === 'hod_review'
                        ? 'Pending HOD Approval (Dr. Ravi Kumar)'
                        : 'Pending Previous Stage'}
                    </p>
                    {selectedLeave.hod_remarks && (
                      <p className="text-[11px] text-slate-600 italic mt-0.5">"{selectedLeave.hod_remarks}"</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply for Faculty Leave"
        maxWidth="max-w-2xl"
      >
        <ApplyLeave
          onSuccess={() => {
            setApplyModalOpen(false);
            fetchData();
          }}
        />
      </Modal>
    </div>
  );
};

export default FacultyDashboard;
