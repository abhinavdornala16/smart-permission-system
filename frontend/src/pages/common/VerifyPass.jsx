import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { ShieldCheck, AlertOctagon, Clock, User, Calendar, MapPin, Building2 } from 'lucide-react';

const VerifyPass = () => {
  const { passId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/permissions/verify/${passId}`);
        if (res.data) {
          setData(res.data.data);
        }
      } catch (err) {
        if (err.response?.data?.data) {
          setData(err.response.data.data);
        } else {
          setData({ status: 'INVALID', valid: false });
        }
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [passId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Verifying Security Pass Signature...</p>
        </div>
      </div>
    );
  }

  const isValid = data?.valid;
  const isExpired = data?.status === 'EXPIRED';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none ${
          isValid ? 'bg-emerald-500' : isExpired ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      />

      <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-slate-800 bg-slate-900/90 text-white shadow-2xl relative z-10 text-center space-y-6">
        {/* Verification Status Header */}
        <div className="space-y-3">
          <div
            className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl border ${
              isValid
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                : isExpired
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/20'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-rose-500/20'
            }`}
          >
            {isValid ? (
              <ShieldCheck className="w-10 h-10" />
            ) : (
              <AlertOctagon className="w-10 h-10" />
            )}
          </div>

          <span
            className={`inline-block px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
              isValid
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isExpired
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {isValid ? 'PASS VALID' : isExpired ? 'PASS EXPIRED' : 'PASS INVALID'}
          </span>
          <p className="text-xs text-slate-400 font-mono">Pass Number: {passId}</p>
        </div>

        {/* Student Details */}
        {data && data.student_name && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2.5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <User className="w-4 h-4 text-indigo-400" /> Student
              </span>
              <span className="font-bold text-white">{data.student_name} ({data.student_id})</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <Building2 className="w-4 h-4 text-indigo-400" /> Permission Type
              </span>
              <span className="font-bold text-indigo-300 capitalize">{data.permission_type?.replace('_', ' ')}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <Calendar className="w-4 h-4 text-indigo-400" /> Date
              </span>
              <span className="font-semibold text-white">{data.date}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <Clock className="w-4 h-4 text-indigo-400" /> Authorized Window
              </span>
              <span className="font-semibold text-white">{data.from_time} – {data.to_time}</span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          Dhondi Security Verification Engine &bull; {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default VerifyPass;
