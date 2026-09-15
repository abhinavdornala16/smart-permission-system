import React, { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // warning, danger, success
  requireReason = false,
  reasonPlaceholder = 'Please enter remarks...',
}) => {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireReason && !remarks.trim()) {
      setError('Remarks/Reason is required.');
      return;
    }
    setError('');
    onConfirm(remarks);
    setRemarks('');
  };

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-600',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    danger: {
      icon: XCircle,
      iconBg: 'bg-rose-100 text-rose-600',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const config = typeConfig[type] || typeConfig.warning;
  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${config.iconBg} shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{message}</p>

          {requireReason && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remarks / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setError('');
                }}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              {error && <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${config.btnBg}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
