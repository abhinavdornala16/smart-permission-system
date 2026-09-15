import React, { useState } from 'react';
import api from '../../api/axios';
import { Calendar, Clock, UserCheck, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const ApplyLeave = ({ onSuccess }) => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    leave_type: 'personal',
    start_date: tomorrowStr,
    end_date: tomorrowStr,
    session: 'full_day',
    reason: '',
    remarks: '',
  });

  const [step, setStep] = useState(1);
  const [affectedClasses, setAffectedClasses] = useState([]);
  const [availableSubstitutes, setAvailableSubstitutes] = useState({}); // { classId: [substitutes] }
  const [selectedSubstitutes, setSelectedSubstitutes] = useState({}); // { classId: subFacultyId }
  const [createdLeave, setCreatedLeave] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const leaveTypes = [
    { value: 'personal', label: 'Personal Leave' },
    { value: 'medical', label: 'Medical Leave' },
    { value: 'official_work', label: 'Official Work / Deputation' },
    { value: 'conference', label: 'Conference / Seminar' },
    { value: 'training', label: 'Training Program' },
    { value: 'emergency', label: 'Emergency Leave' },
    { value: 'other', label: 'Other' },
  ];

  const sessions = [
    { value: 'full_day', label: 'Full Day (09:00 - 17:00)' },
    { value: 'morning', label: 'Morning Session (09:00 - 13:00)' },
    { value: 'afternoon', label: 'Afternoon Session (13:00 - 17:00)' },
  ];

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      setError('Reason for leave is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.post('/faculty/leave', {
        ...formData,
        date: formData.start_date,
      });

      if (res.data.success) {
        const leaveData = res.data.data.leave;
        const classes = res.data.data.affected_classes || [];
        setCreatedLeave(leaveData);
        setAffectedClasses(classes);

        if (classes.length === 0) {
          if (onSuccess) onSuccess();
          return;
        }

        // Fetch smart substitute recommendations for each affected class
        const subsMap = {};
        for (const cls of classes) {
          try {
            const subRes = await api.get(
              `/substitutes/available?date=${formData.start_date}&start_time=${cls.start_time}&end_time=${cls.end_time}&department=${cls.department || ''}&subject=${cls.subject}&exclude_faculty_id=${leaveData.faculty_id}`
            );
            if (subRes.data.success) {
              subsMap[cls.id] = subRes.data.data;
            }
          } catch (e) {
            // Ignore substitute fetch errors
          }
        }
        setAvailableSubstitutes(subsMap);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubstituteSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      for (const cls of affectedClasses) {
        const subFacultyId = selectedSubstitutes[cls.id];
        if (subFacultyId) {
          await api.post('/substitutes/request', {
            leave_id: createdLeave.id,
            substitute_faculty_id: subFacultyId,
            timetable_entry_id: cls.id,
            subject: cls.subject,
            section: cls.section,
            date: formData.start_date,
            start_time: cls.start_time,
            end_time: cls.end_time,
            room: cls.room,
          });
        }
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send substitute requests.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleLeaveSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="leave_type"
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {leaveTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Session <span className="text-rose-500">*</span>
              </label>
              <select
                name="session"
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {sessions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData({
                    ...formData,
                    start_date: newStart,
                    end_date: formData.end_date < newStart ? newStart : formData.end_date,
                  });
                }}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={formData.start_date}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Leave <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide complete reason for leave..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Optional Remarks / Notes
            </label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Lesson plan prepared for substitute"
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit Leave Request</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Substitutes Confirmation */
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
            <p className="font-bold">Leave Submitted to Coordinator!</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              The following classes fall during your leave. Select substitute colleagues or proceed:
            </p>
          </div>

          <div className="space-y-3">
            {affectedClasses.map((cls) => {
              const subs = availableSubstitutes[cls.id] || [];
              return (
                <div key={cls.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{cls.subject} ({cls.section})</span>
                    <span className="font-mono text-indigo-600">{cls.start_time} - {cls.end_time}</span>
                  </div>

                  <select
                    value={selectedSubstitutes[cls.id] || ''}
                    onChange={(e) => setSelectedSubstitutes({ ...selectedSubstitutes, [cls.id]: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select Optional Substitute Faculty --</option>
                    {subs.map((s) => (
                      <option key={s.faculty_id} value={s.faculty_id}>
                        {s.faculty_name} ({s.department}) - Score: {s.suitability_score}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                if (onSuccess) onSuccess();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Skip Substitute Assignment
            </button>

            <button
              onClick={handleSubstituteSubmit}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              {loading ? 'Sending...' : 'Confirm & Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplyLeave;
