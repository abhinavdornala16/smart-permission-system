import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { Plus, Trash2 } from 'lucide-react';

const WorkflowConfigPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [newStep, setNewStep] = useState({
    request_type: 'out_pass',
    step_number: 1,
    approver_role: 'mentor',
  });

  const requestTypes = [
    { value: 'out_pass', label: 'Out Pass (Gate Pass)' },
    { value: 'medical', label: 'Medical Permission' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'club_activity', label: 'Club Activity' },
    { value: 'college_event', label: 'College Event' },
    { value: 'department_activity', label: 'Department Activity' },
    { value: 'other', label: 'Other' },
  ];

  const roles = [
    { value: 'mentor', label: 'Mentor' },
    { value: 'class_teacher', label: 'Class Teacher' },
    { value: 'coordinator', label: 'Department Coordinator' },
    { value: 'hod', label: 'Head of Department (HOD)' },
    { value: 'admin', label: 'System Admin' },
  ];

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/workflows');
      if (res.data.success) {
        setWorkflows(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load workflows:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleAddStep = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/workflows', newStep);
      if (res.data.success) {
        setAddModalOpen(false);
        fetchWorkflows();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add workflow step.');
    }
  };

  const handleDeleteStep = async (id) => {
    if (!window.confirm('Delete this workflow step?')) return;
    try {
      const res = await api.delete(`/admin/workflows/${id}`);
      if (res.data.success) {
        fetchWorkflows();
      }
    } catch {
      alert('Failed to delete step.');
    }
  };

  // Group workflows by request type
  const groupedWorkflows = requestTypes.map((type) => {
    const steps = workflows
      .filter((w) => w.request_type === type.value)
      .sort((a, b) => a.step_number - b.step_number);
    return { ...type, steps };
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Approval Workflow Configuration</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure dynamic multi-level approval chains for different permission types
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Workflow Step
        </button>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs glass-card rounded-2xl">
          Loading workflow configurations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupedWorkflows.map((group) => (
            <div
              key={group.value}
              className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">{group.label}</h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {group.steps.length} Step(s)
                </span>
              </div>

              {group.steps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No workflow steps configured.</p>
              ) : (
                <div className="space-y-2">
                  {group.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                          {step.step_number}
                        </span>
                        <span className="font-bold text-slate-900 uppercase">
                          {step.approver_role.replace('_', ' ')}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Step Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Workflow Step"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddStep} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Permission Type *</label>
            <select
              value={newStep.request_type}
              onChange={(e) => setNewStep({ ...newStep, request_type: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {requestTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Step Order Number *</label>
            <input
              type="number"
              min="1"
              max="10"
              value={newStep.step_number}
              onChange={(e) => setNewStep({ ...newStep, step_number: parseInt(e.target.value) || 1 })}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Approver Role *</label>
            <select
              value={newStep.approver_role}
              onChange={(e) => setNewStep({ ...newStep, approver_role: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
            >
              Save Workflow Step
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkflowConfigPage;
