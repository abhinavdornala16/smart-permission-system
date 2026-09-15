import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import ConfirmationModal from '../../components/ConfirmationModal';
import { UserCheck, CheckCircle2, XCircle, Clock, MapPin, Calendar, BookOpen } from 'lucide-react';

const SubstituteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'accept'|'reject', subId }

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/substitutes/my-assignments');
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load substitute assignments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleExecute = async (reason) => {
    if (!confirmAction) return;

    try {
      const { type, subId } = confirmAction;
      const endpoint = `/substitutes/${subId}/${type}`;
      const res = await api.post(endpoint, { reason });

      if (res.data.success) {
        setConfirmAction(null);
        fetchRequests();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update substitute request.');
    }
  };

  const pendingList = requests.filter((r) => r.status === 'pending');
  const historyList = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Substitute Class Assignments</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Review and manage requests from colleagues to substitute their classes
        </p>
      </div>

      {/* Pending Substitution Requests */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Pending Requests ({pendingList.length})
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs glass-card rounded-2xl">
            Loading substitution requests...
          </div>
        ) : pendingList.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-200 bg-white">
            No pending substitution requests requiring your response.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map((req) => (
              <div
                key={req.id}
                className="glass-card rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-br from-white to-indigo-50/20 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{req.original_faculty_name}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">Requesting Faculty</span>
                  </div>
                  <StatusBadge status={req.status} size="small" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Subject & Sec
                    </span>
                    <span className="font-bold text-slate-900">
                      {req.subject} ({req.section})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date & Time
                    </span>
                    <span className="font-semibold text-slate-800">
                      {req.date} ({req.start_time} – {req.end_time})
                    </span>
                  </div>

                  {req.room && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Classroom
                      </span>
                      <span className="font-semibold text-slate-800">{req.room}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setConfirmAction({ type: 'reject', subId: req.id })}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>

                  <button
                    onClick={() => setConfirmAction({ type: 'accept', subId: req.id })}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accept Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Substitution History
        </h3>

        <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {historyList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No substitution history records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Faculty</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Room</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historyList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{r.original_faculty_name}</td>
                      <td className="p-4 text-slate-800 font-semibold">
                        {r.subject} ({r.section})
                      </td>
                      <td className="p-4 text-slate-600">
                        {r.date} ({r.start_time}–{r.end_time})
                      </td>
                      <td className="p-4 text-slate-600">{r.room || 'N/A'}</td>
                      <td className="p-4">
                        <StatusBadge status={r.status} size="small" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecute}
        title={confirmAction?.type === 'accept' ? 'Accept Substitute Class' : 'Decline Substitute Request'}
        message={
          confirmAction?.type === 'accept'
            ? 'Are you sure you want to accept this substitution assignment?'
            : 'Please enter a reason for declining this substitution request.'
        }
        confirmText={confirmAction?.type === 'accept' ? 'Accept' : 'Decline'}
        type={confirmAction?.type === 'accept' ? 'success' : 'danger'}
        requireReason={confirmAction?.type === 'reject'}
        reasonPlaceholder="Enter reason for declining..."
      />
    </div>
  );
};

export default SubstituteRequests;
