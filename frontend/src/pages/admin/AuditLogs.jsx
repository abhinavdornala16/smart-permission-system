import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Filter, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = { page, per_page: 25 };
      if (entityFilter) params.entity_type = entityFilter;

      const res = await api.get('/admin/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data.logs);
        setTotal(res.data.data.total);
        setPages(res.data.data.pages);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (value) => {
    setEntityFilter(value);
    setPage(1);
  };

  const actionColor = (action) => {
    if (action.includes('approved')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (action.includes('rejected')) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (action.includes('created') || action.includes('submitted')) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    if (action.includes('cancelled') || action.includes('deleted')) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              Compliance Audit Trail
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-2">
              Audit Logs
            </h1>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Immutable record of all significant system actions for accountability and compliance
            </p>
          </div>

          <div className="text-right text-xs text-indigo-200 font-medium">
            {total.toLocaleString()} total entries
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filter by Entity:</span>
        </div>
        {['', 'permission', 'leave', 'substitute', 'user'].map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterChange(filter)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              entityFilter === filter
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No audit logs found for selected filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Status Change</th>
                    <th className="p-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '—'}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{log.user_name || 'System'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 capitalize">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[11px] font-bold uppercase tracking-wider">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono">#{log.entity_id || '—'}</td>
                      <td className="p-4 text-xs">
                        {log.old_status && log.new_status ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[11px] uppercase">{log.old_status}</span>
                            <span className="text-slate-400 font-bold">→</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 font-bold text-[11px] uppercase">{log.new_status}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 max-w-[200px] truncate text-[11px] italic">
                        {log.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-500 font-medium">
                  Page {page} of {pages} ({total} entries)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page >= pages}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;