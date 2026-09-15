import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-slate-950 text-white">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-rose-500/30 bg-slate-900 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-rose-500 font-mono">403</h1>
        <h2 className="text-xl font-bold text-white mt-1">Access Denied</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          You do not have authorization to access this role-restricted page.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Authorized Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
