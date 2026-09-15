import React from 'react';

const DashboardCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, onClick, trend }) => {
  const colorMap = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5',
      border: 'border-indigo-500/20',
      iconBg: 'bg-indigo-500/15 text-indigo-600',
      text: 'text-indigo-600',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
      text: 'text-emerald-600',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/15 text-amber-600',
      text: 'text-amber-600',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/15 text-rose-600',
      text: 'text-rose-600',
    },
    sky: {
      bg: 'from-sky-500/10 to-sky-600/5',
      border: 'border-sky-500/20',
      iconBg: 'bg-sky-500/15 text-sky-600',
      text: 'text-sky-600',
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/15 text-purple-600',
      text: 'text-purple-600',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 border ${scheme.border} bg-gradient-to-br ${scheme.bg} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
          )}
          {trend && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
              {trend}
            </span>
          )}
        </div>

        {Icon && (
          <div className={`p-3.5 rounded-2xl ${scheme.iconBg} shadow-inner`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
