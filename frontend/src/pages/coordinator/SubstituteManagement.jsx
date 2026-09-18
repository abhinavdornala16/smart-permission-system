import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import ConfirmationModal from '../../components/ConfirmationModal';
import Modal from '../../components/Modal';
import DashboardCard from '../../components/DashboardCard';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Eye,
  Check,
  X
} from 'lucide-react';

const CoordinatorSubstituteManagement = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject', leaveId }
  const [selectedLeave, setSelectedLeave] = useState(null);

  const fetchCoordinatorLeaves = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        api.get('/substitutes/coordinator/pending'),
        api.get('/faculty/leaves?per_page=50'),
      ]);

      if (pendingRes.data.success) {
        setPendingLeaves(pendingRes.data.data || []);
      }
      if (allRes.data.success) {
        setAllLeaves(allRes.data.data.leaves || []);
      }
    } catch (e) {
      console.error('Failed to load coordinator leaves:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchCoordinatorLeaves();
    })();
    const interval = setInterval(() => fetchCoordinatorLeaves(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async (remarks) => {
    if (!confirmAction) return;

    try {
      const { type, leaveId } = confirmAction;
      const endpoint = `/substitutes/coordinator/${leaveId}/${type}`;
      const res = await api.post(endpoint, { remarks });

      if (res.data.success) {
        setConfirmAction(null);
        fetchCoordinatorLeaves();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to process leave request.');
    }
  };

  // Metrics
  const pendingCount = pendingLeaves.length;
  const approvedTodayCount = allLeaves.filter(
    (l) => l.coordinator_approved_at && l.coordinator_approved_at.split('T')[0] === new Date().toISOString().split('T')[0]
  ).length;
  const rejectedTodayCount = allLeaves.filter(
    (l) => l.status === 'rejected' && l.updated_at && l.updated_at.split('T')[0] === new Date().toISOString().split('T')[0]
  ).length;
  const totalFacultyLeaves = allLeaves.length;

  return (
    <div className="space-y-8 text-left">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-sky-400 uppercase bg-sky-500/20 px-3 py-1 rounded-full border border-sky-400/30">
              Department Coordinator Portal
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2 text-white">
              Faculty Leave Approvals
            </h1>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Verify faculty leave requests, reasons, and substitute arrangements before forwarding to HOD for final approval
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Pending Faculty Leave"
          value={pendingCount}
          icon={Clock}
          color="amber"
          subtitle="Awaiting coordinator review"
        />
        <DashboardCard
          title="Approved Today"
          value={approvedTodayCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Forwarded to HOD"
        />
        <DashboardCard
          title="Rejected Today"
          value={rejectedTodayCount}
          icon={XCircle}
          color="rose"
          subtitle="Declined by coordinator"
        />
        <DashboardCard
          title="Total Faculty Leave"
          value={totalFacultyLeaves}
          icon={FileText}
          color="indigo"
          subtitle="All recorded requests"
        />
      </div>

      {/* Pending Faculty Leave Approvals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Pending Faculty Leave Requests ({pendingLeaves.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs glass-card rounded-3xl">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading coordinator review queue...
          </div>
        ) : pendingLeaves.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200 bg-white">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-70" />
            <p className="text-sm font-bold text-slate-700">No pending faculty leave requests.</p>
            <p className="text-xs text-slate-400 mt-1">All faculty leave submissions have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-indigo-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {leave.request_number}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Dept: <strong className="text-slate-800">{leave.department_name || 'Computer Science and Engineering'}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{leave.faculty_name}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Dates:{' '}
                      <strong className="text-slate-900">
                        {leave.start_date && leave.end_date && leave.start_date !== leave.end_date
                          ? `${leave.start_date} to ${leave.end_date}`
                          : leave.date}
                      </strong>{' '}
                      &bull; Type: <span className="capitalize font-semibold">{leave.leave_type?.replace('_', ' ')}</span> &bull; Session:{' '}
                      <span className="capitalize">{leave.session?.replace('_', ' ')}</span>
                    </p>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>

                {/* Reason */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">Reason for Leave:</p>
                  <p className="text-slate-800">{leave.reason}</p>
                  {leave.remarks && (
                    <p className="text-slate-500 text-[11px] mt-1 italic">Remarks: {leave.remarks}</p>
                  )}
                </div>

                {/* Substitute details */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Substitute Arrangements:
                  </p>
                  {leave.substitutes?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No scheduled lectures affected by this leave.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {leave.substitutes?.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{sub.subject} ({sub.section})</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Substitute: <strong className="text-indigo-600">{sub.substitute_faculty_name}</strong>
                            </p>
                          </div>
                          <StatusBadge status={sub.status} size="small" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedLeave(leave)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmAction({ type: 'reject', leaveId: leave.id })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Leave
                    </button>

                    <button
                      onClick={() => setConfirmAction({ type: 'approve', leaveId: leave.id })}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Verify & Forward to HOD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title={`Faculty Leave Details — ${selectedLeave?.request_number}`}
        maxWidth="max-w-xl"
      >
        {selectedLeave && (
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{selectedLeave.faculty_name}</span>
                <StatusBadge status={selectedLeave.status} />
              </div>
              <p className="text-slate-600">
                Department: <strong>{selectedLeave.department_name || 'CSE'}</strong>
              </p>
              <p className="text-slate-600">
                Leave Dates: <strong>{selectedLeave.start_date && selectedLeave.end_date ? `${selectedLeave.start_date} to ${selectedLeave.end_date}` : selectedLeave.date}</strong>
              </p>
              <p className="text-slate-600">
                Type: <strong className="capitalize">{selectedLeave.leave_type?.replace('_', ' ')}</strong>
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Reason:</strong> {selectedLeave.reason}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const id = selectedLeave.id;
                  setSelectedLeave(null);
                  setConfirmAction({ type: 'reject', leaveId: id });
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  const id = selectedLeave.id;
                  setSelectedLeave(null);
                  setConfirmAction({ type: 'approve', leaveId: id });
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Verify & Forward to HOD
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecute}
        title={confirmAction?.type === 'approve' ? 'Verify & Forward Leave to HOD' : 'Reject Faculty Leave'}
        message={
          confirmAction?.type === 'approve'
            ? 'Have you verified all reasons and substitute arrangements for this faculty leave request?'
            : 'Enter remarks explaining why this faculty leave request is being rejected.'
        }
        confirmText={confirmAction?.type === 'approve' ? 'Verify & Forward' : 'Reject Leave'}
        type={confirmAction?.type === 'approve' ? 'success' : 'danger'}
        requireReason={confirmAction?.type === 'reject'}
        reasonPlaceholder="Enter coordinator remarks..."
      />
    </div>
  );
};

export default CoordinatorSubstituteManagement;
