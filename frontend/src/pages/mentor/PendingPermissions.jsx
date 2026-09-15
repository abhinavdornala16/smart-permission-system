import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import { FileText, CheckCircle2, XCircle, Clock, Search, Filter, User, Building } from 'lucide-react';

const PendingPermissions = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject', reqId }

  const fetchPending = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/permissions/pending?per_page=50');
      if (res.data.success) {
        setPendingRequests(res.data.data.requests);
      }
    } catch (e) {
      console.error('Failed to load pending requests:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(() => fetchPending(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDetails = async (req) => {
    setSelectedReq(req);
    try {
      const res = await api.get(`/permissions/${req.id}/timeline`);
      if (res.data.success) {
        setTimeline(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  };

  const handleExecuteAction = async (remarks) => {
    if (!confirmAction) return;

    try {
      const { type, reqId } = confirmAction;
      const endpoint = `/permissions/${reqId}/${type}`;
      const res = await api.post(endpoint, { remarks });

      if (res.data.success) {
        setConfirmAction(null);
        setSelectedReq(null);
        fetchPending();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pending Permission Approvals</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review and take action on student permission applications
          </p>
        </div>
      </div>

      {/* Requests List */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading pending requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            No pending requests awaiting your approval!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Student</th>
                  <th className="p-4">Req #</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pendingRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{r.student?.full_name || 'Student'}</div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {r.student?.student?.student_id || r.student_id} &bull; {r.student?.student?.department || ''}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-600">{r.request_number}</td>
                    <td className="p-4 font-bold text-slate-800 capitalize">
                      {r.permission_type?.replace('_', ' ')}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{r.date}</div>
                      <span className="font-mono text-[11px] text-slate-500">{r.from_time} – {r.to_time}</span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(r)}
                          className="px-3 py-1.5 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold transition-colors"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'approve', reqId: r.id })}
                          className="p-1.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold transition-colors shadow-sm"
                          title="Approve Request"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'reject', reqId: r.id })}
                          className="p-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold transition-colors shadow-sm"
                          title="Reject Request"
                        >
                          <XCircle className="w-4 h-4" />
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

      {/* Review Details Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Review Request: ${selectedReq?.request_number}`}
        maxWidth="max-w-xl"
      >
        {selectedReq && (
          <div className="space-y-6 text-left text-xs">
            {/* Student & Request Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedReq.student?.full_name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedReq.student?.student?.student_id || ''} &bull; Dept: {selectedReq.student?.student?.department}
                  </p>
                </div>
                <StatusBadge status={selectedReq.status} />
              </div>

              <div className="border-t border-indigo-200/60 pt-2 space-y-1 text-slate-700">
                <p>
                  <strong className="text-slate-900">Permission Type:</strong>{' '}
                  <span className="capitalize">{selectedReq.permission_type?.replace('_', ' ')}</span>
                </p>
                <p>
                  <strong className="text-slate-900">Date & Window:</strong> {selectedReq.date} ({selectedReq.from_time} – {selectedReq.to_time})
                </p>
                <p>
                  <strong className="text-slate-900">Reason:</strong> {selectedReq.reason}
                </p>
                {selectedReq.destination && (
                  <p>
                    <strong className="text-slate-900">Destination:</strong> {selectedReq.destination}
                  </p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-3">Previous Approval History</h4>
              <ApprovalTimeline timeline={timeline} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmAction({ type: 'reject', reqId: selectedReq.id })}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Reject Request
              </button>

              <button
                onClick={() => setConfirmAction({ type: 'approve', reqId: selectedReq.id })}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Advance
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecuteAction}
        title={confirmAction?.type === 'approve' ? 'Approve Permission Request' : 'Reject Permission Request'}
        message={
          confirmAction?.type === 'approve'
            ? 'Are you sure you want to approve this permission request and advance it to the next step?'
            : 'Are you sure you want to reject this permission request?'
        }
        confirmText={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        type={confirmAction?.type === 'approve' ? 'success' : 'danger'}
        requireReason={confirmAction?.type === 'reject'}
        reasonPlaceholder="Enter reason for rejection..."
      />
    </div>
  );
};

export default PendingPermissions;
