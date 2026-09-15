import React from 'react';
import { CheckCircle2, Clock, XCircle, QrCode } from 'lucide-react';

const ApprovalTimeline = ({ timeline = [] }) => {
  if (!timeline || timeline.length === 0) {
    return <p className="text-xs text-slate-400">No timeline history available.</p>;
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {timeline.map((item, idx) => {
        const isCompleted = item.action === 'approved' || item.action === 'submitted' || item.action === 'qr_generated';
        const isRejected = item.action === 'rejected';

        return (
          <div key={idx} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white transition-all ${
                isCompleted
                  ? 'border-emerald-500 text-emerald-600 shadow-sm shadow-emerald-500/20'
                  : isRejected
                  ? 'border-rose-500 text-rose-600 shadow-sm shadow-rose-500/20'
                  : 'border-amber-500 text-amber-600 animate-pulse'
              }`}
            >
              {isCompleted ? (
                item.action === 'qr_generated' ? (
                  <QrCode className="w-3 h-3 text-emerald-600" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                )
              ) : isRejected ? (
                <XCircle className="w-3 h-3 text-rose-600" />
              ) : (
                <Clock className="w-3 h-3 text-amber-600" />
              )}
            </div>

            {/* Step details */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800">{item.step}</h5>
                {item.timestamp && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {item.actor} — <span className="capitalize font-semibold">{item.action?.replace('_', ' ')}</span>
              </p>

              {item.remarks && (
                <div className="mt-1.5 p-2 bg-white rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                  "{item.remarks}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalTimeline;
