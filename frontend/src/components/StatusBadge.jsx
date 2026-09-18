import React from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Slash } from 'lucide-react';

const StatusBadge = ({ status, size = 'normal' }) => {
  const normalized = (status || '').toLowerCase().replace(/_/g, ' ');

  const config = {
    pending: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      label: 'Pending',
    },
    'pending coordinator': {
      bg: 'bg-amber-50 text-amber-700 border-amber-300',
      icon: Clock,
      label: 'Pending Coordinator Approval',
    },
    'coordinator review': {
      bg: 'bg-amber-50 text-amber-700 border-amber-300',
      icon: Clock,
      label: 'Pending Coordinator Approval',
    },
    'pending hod': {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      icon: Clock,
      label: 'Pending HOD Approval',
    },
    'hod review': {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      icon: Clock,
      label: 'Pending HOD Approval',
    },
    'under review': {
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Clock,
      label: 'Under Review',
    },
    'substitute pending': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      label: 'Sub Pending',
    },
    approved: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Approved',
    },
    accepted: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Accepted',
    },
    rejected: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'Rejected',
    },
    'rejected by coordinator': {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'Rejected by Coordinator',
    },
    'rejected by hod': {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'Rejected by HOD',
    },
    cancelled: {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: Slash,
      label: 'Cancelled',
    },
    expired: {
      bg: 'bg-slate-100 text-slate-500 border-slate-300',
      icon: AlertCircle,
      label: 'Expired',
    },
    active: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Active',
    },
  };

  const style = config[normalized] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
  };

  const Icon = style.icon;

  const sizeClasses = size === 'small'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${style.bg} ${sizeClasses}`}
    >
      <Icon className={size === 'small' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{style.label}</span>
    </span>
  );
};

export default StatusBadge;
