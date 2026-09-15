import React from 'react';
import { useParams } from 'react-router-dom';
import { Building2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PlaceholderModule = ({ moduleName }) => {
  const params = useParams();
  const title = moduleName || params.module || 'Dhondi Core Module';
  const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-xl bg-white">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mx-auto flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {formattedTitle} Module
        </h2>

        <div className="my-6 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900 text-xs font-semibold leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-bold">Standalone ERP Extension Notice</p>
            <p className="mt-1 text-slate-700 font-medium">
              This module is managed by the existing Dhondi application.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          This system is designed as a standalone extension module that can be integrated with an existing college ERP through APIs.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Functional Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PlaceholderModule;
