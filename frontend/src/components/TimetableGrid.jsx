import React from 'react';
import { Clock, MapPin, User, BookOpen } from 'lucide-react';

const TimetableGrid = ({ entries = [], onSelectEntry, highlightLeave = false }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getEntriesForDay = (dayName) => {
    return entries
      .filter((e) => e.day === dayName)
      .sort((a, b) => a.period - b.period);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 glass-card">
      <div className="min-w-[700px]">
        {/* Header Days */}
        <div className="grid grid-cols-6 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider text-center py-3">
          {days.map((day) => (
            <div key={day} className="border-r border-slate-800 last:border-0">
              {day}
            </div>
          ))}
        </div>

        {/* Timetable Cards per day */}
        <div className="grid grid-cols-6 divide-x divide-slate-200 bg-slate-50/50 min-h-[350px]">
          {days.map((day) => {
            const dayEntries = getEntriesForDay(day);

            return (
              <div key={day} className="p-2 space-y-2">
                {dayEntries.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4 text-center">
                    <span className="text-[11px] text-slate-400 font-medium italic">No classes</span>
                  </div>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => onSelectEntry && onSelectEntry(entry)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        onSelectEntry ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : ''
                      } ${
                        highlightLeave
                          ? 'bg-amber-50/90 border-amber-200 hover:border-amber-300'
                          : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          P{entry.period}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {entry.start_time} - {entry.end_time}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 truncate">
                        {entry.subject}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {entry.section}
                        </span>
                        {entry.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {entry.room}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;
