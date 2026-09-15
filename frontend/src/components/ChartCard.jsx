import React from 'react';

const ChartCard = ({ title, subtitle, children, action }) => {
  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="w-full h-64 flex-1">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
