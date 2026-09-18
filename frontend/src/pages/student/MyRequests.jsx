import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import QRPassCard from '../../components/QRPassCard';
import { Eye, Ban, Filter, QrCode } from 'lucide-react';

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/permissions/my-requests?per_page=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setRequests(res.data.data.requests);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      await fetchRequests();
    })();
  }, [fetchRequests]);

  const handleViewTimeline = async (req) => {
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

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this permission request?')) return;
    try {
      const res = await api.post(`/permissions/${id}/cancel`);
      if (res.data.success) {
        fetchRequests();
        if (selectedReq?.id === id) setSelectedReq(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Permission Requests</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Track workflow approvals, timeline logs, and digital QR passes
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No permission requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Req ID</th>
                  <th className="p-4">Permission Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Time Window</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Current Approver</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{r.request_number}</td>
                    <td className="p-4 font-bold text-slate-800 capitalize">
                      {r.permission_type?.replace('_', ' ')}
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">{r.date}</td>
                    <td className="p-4 text-slate-600 font-mono">
                      {r.from_time} – {r.to_time}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={r.status} size="small" />
                    </td>
                    <td className="p-4 text-slate-600 capitalize">
                      {r.current_approver_role?.replace('_', ' ') || 'Completed'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewTimeline(r)}
                          className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                          title="View Approval Timeline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Timeline</span>
                        </button>

                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(r.id)}
                            className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                            title="Cancel Request"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Details & Approval Timeline Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Request Details: ${selectedReq?.request_number}`}
        maxWidth="max-w-xl"
      >
        {selectedReq && (
          <div className="space-y-6 text-left text-xs">
            {/* Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm capitalize">
                  {selectedReq.permission_type?.replace('_', ' ')}
                </span>
                <StatusBadge status={selectedReq.status} />
              </div>
              <p className="text-slate-600 font-medium">Reason: {selectedReq.reason}</p>
              <div className="text-slate-500 font-mono text-[11px] flex items-center gap-4 pt-1">
                <span>Date: {selectedReq.date}</span>
                <span>Time: {selectedReq.from_time} – {selectedReq.to_time}</span>
              </div>
            </div>

            {/* If approved, show QR Pass Card inline */}
            {selectedReq.status === 'approved' && selectedReq.qr_pass && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" /> Digital Permission Pass
                </h4>
                <QRPassCard pass={selectedReq.qr_pass} permission={selectedReq} />
              </div>
            )}

            {/* Approval Timeline */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-4">Approval Timeline & History</h4>
              <ApprovalTimeline timeline={timeline} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyRequests;
