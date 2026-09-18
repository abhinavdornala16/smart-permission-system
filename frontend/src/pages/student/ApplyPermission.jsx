import React, { useState } from 'react';
import api from '../../api/axios';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const defaultDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();

const ApplyPermission = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    permission_type: 'out_pass',
    reason: '',
    date: defaultDate, // Default tomorrow
    from_time: '10:00',
    to_time: '16:00',
    destination: '',
    contact_number: '',
    remarks: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const permissionTypes = [
    { value: 'out_pass', label: 'Out Pass (Gate Pass)' },
    { value: 'medical', label: 'Medical Permission' },
    { value: 'personal', label: 'Personal Leave/Permission' },
    { value: 'club_activity', label: 'Club Activity' },
    { value: 'college_event', label: 'College Event' },
    { value: 'department_activity', label: 'Department Activity' },
    { value: 'other', label: 'Other' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.reason.trim()) {
      setError('Please provide a reason for the permission request.');
      return false;
    }
    if (!formData.date) {
      setError('Please select a valid date.');
      return false;
    }
    if (formData.to_time <= formData.from_time) {
      setError('End time must be strictly after start time.');
      return false;
    }
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Date cannot be in the past.');
      return false;
    }
    return true;
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/permissions', formData);
      if (res.data.success) {
        setShowConfirmation(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit permission request.');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {!showConfirmation ? (
        <form onSubmit={handlePreSubmit} className="space-y-4 text-left">
          {/* Permission Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Permission Type <span className="text-rose-500">*</span>
            </label>
            <select
              name="permission_type"
              value={formData.permission_type}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {permissionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Times Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                From Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                name="from_time"
                value={formData.from_time}
                onChange={handleChange}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                To Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                name="to_time"
                value={formData.to_time}
                onChange={handleChange}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Request <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Provide specific reason for leaving campus / permission..."
              rows={3}
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Destination & Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Destination
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="e.g. City Hospital, Home"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Review Application</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        /* Confirmation Screen */
        <div className="space-y-4 text-left animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 space-y-2 text-xs">
            <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Confirm Permission Request Details
            </h4>
            <p className="text-slate-600">Please double check your details before submitting to faculty.</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-500">Permission Type</span>
              <span className="font-bold text-slate-900 capitalize">{formData.permission_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-500">Date & Window</span>
              <span className="font-bold text-slate-900">{formData.date} ({formData.from_time} – {formData.to_time})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-500">Reason</span>
              <span className="font-medium text-slate-900 max-w-[200px] text-right truncate">{formData.reason}</span>
            </div>
            {formData.destination && (
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Destination</span>
                <span className="font-medium text-slate-900">{formData.destination}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Back & Edit
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Confirm & Submit Request</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplyPermission;
