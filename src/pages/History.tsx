import { useState, useEffect } from 'react';
import { fetchHistory } from '../services/historyService';
import type { HistoryRecord } from '../types';
import FlickerSpinner from '../components/FlickerSpinner';

export default function History() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><FlickerSpinner size={36} /></div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div>
        <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Log</p>
        <h1 className="font-display text-3xl text-white tracking-tight">History</h1>
      </div>

      <div className="panel overflow-hidden">
        {history.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#333] text-sm">No picks yet. Start from the dashboard.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#161616]">
            {/* Header */}
            <div className="grid grid-cols-12 px-5 py-3">
              <span className="col-span-4 text-xs text-[#444] uppercase tracking-wider">Time</span>
              <span className="col-span-1 text-xs text-[#444] uppercase tracking-wider">Cycle</span>
              <span className="col-span-2 text-xs text-[#444] uppercase tracking-wider">Course</span>
              <span className="col-span-5 text-xs text-[#444] uppercase tracking-wider">Name</span>
            </div>

            {history.map((record) => (
              <div
                key={record.id}
                className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-[#141414] transition-colors"
              >
                <span className="col-span-4 text-xs text-[#555]">
                  {new Date(record.selected_at).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <span className="col-span-1 text-xs font-mono text-[#444]">{record.cycle_number}</span>
                <span className="col-span-2 text-xs font-mono text-[#555]">{record.course}</span>
                <span className="col-span-5 text-sm font-medium text-white">{record.student_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
