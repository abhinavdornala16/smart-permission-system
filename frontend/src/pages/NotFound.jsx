import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-slate-950 text-white">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-slate-800 bg-slate-900 shadow-2xl">
        <h1 className="text-6xl font-black text-indigo-500 font-mono">404</h1>
        <h2 className="text-xl font-bold text-white mt-2">Page Not Found</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          The page or resource you are looking for does not exist or has been moved.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
