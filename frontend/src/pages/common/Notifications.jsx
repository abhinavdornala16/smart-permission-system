import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Bell, Check, CheckCheck } from 'lucide-react';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?per_page=50');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (e) {
      alert('Failed to mark all read.');
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            All system notifications, approval alerts, and substitute requests
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="py-2 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition-colors flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4" /> Mark All as Read
        </button>
      </div>

      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No notifications found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                  !n.is_read ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                {!n.is_read && (
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
