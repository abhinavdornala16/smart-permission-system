import React from 'react';
import { QrCode, Calendar, Clock, MapPin, User, Printer, ShieldCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';

const QRPassCard = ({ pass, permission }) => {
  if (!pass) return null;

  const isExpired = new Date() > new Date(pass.expires_at);

  return (
    <div
      id="printable-qr-pass"
      className="glass-card rounded-3xl p-6 border-2 border-indigo-500/30 max-w-md mx-auto shadow-2xl relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-slate-50"
    >
      {/* Decorative Top Accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-bold">
            Dhondi Digital Pass
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
            {permission?.permission_type?.replace('_', ' ').toUpperCase() || 'OFFICIAL PERMISSION'}
          </h3>
        </div>
        <StatusBadge status={isExpired ? 'expired' : pass.status} />
      </div>

      {/* QR Image Container */}
      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-inner mb-5">
        {pass.qr_image ? (
          <img
            src={`data:image/png;base64,${pass.qr_image}`}
            alt="QR Permission Pass"
            className="w-48 h-48 object-contain rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
            <QrCode className="w-16 h-16" />
          </div>
        )}
        <span className="text-xs font-mono font-bold text-slate-700 mt-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          {pass.pass_number}
        </span>
      </div>

      {/* Details Grid */}
      <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-200/80 pt-4 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-indigo-500" /> Student
          </span>
          <span className="font-bold text-slate-900">{permission?.student?.full_name || 'Student'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date
          </span>
          <span className="font-semibold text-slate-800">{permission?.date}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-500" /> Time Window
          </span>
          <span className="font-semibold text-slate-800">
            {permission?.from_time} – {permission?.to_time}
          </span>
        </div>

        {permission?.destination && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Destination
            </span>
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
              {permission.destination}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[11px]">
          <span className="text-slate-400">Valid Until</span>
          <span className="font-mono font-semibold text-slate-600">
            {new Date(pass.expires_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Verification Seal */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 mb-5 text-emerald-800 text-[11px] font-medium">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>Cryptographically verified by Dhondi College Smart Permission System</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <Printer className="w-4 h-4" /> Print Pass
        </button>

        <a
          href={`/verify-pass/${pass.pass_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
        >
          <QrCode className="w-4 h-4" /> Public Verification
        </a>
      </div>
    </div>
  );
};

export default QRPassCard;
