import { useState } from 'react';
import { parseCSV } from '../services/csvService';
import { replaceStudents } from '../services/studentService';
import { clearHistory } from '../services/historyService';
import { resetStateAndCycle } from '../services/stateService';
import { Upload, RefreshCcw, Trash2 } from 'lucide-react';
import FlickerSpinner from '../components/FlickerSpinner';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disableCsvUpload = import.meta.env.VITE_DISABLE_CSV_UPLOAD === '1';
  const disableCycleUpdate = import.meta.env.VITE_DISABLE_CYCLE_UPDATE === '1';
  const disableResetHistory = import.meta.env.VITE_DISABLE_RESET_HISTORY === '1';

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const students = await parseCSV(file);
      await replaceStudents(students);
      await resetStateAndCycle();
      notify(`Imported ${students.length} students. Cycle reset.`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to parse CSV', true);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleResetCycle = async () => {
    setLoading(true);
    try {
      await resetStateAndCycle();
      notify('Cycle reset successfully.');
    } catch { notify('Failed to reset cycle.', true); }
    finally { setLoading(false); }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    setLoading(true);
    try {
      await clearHistory();
      notify('History cleared.');
    } catch { notify('Failed to clear history.', true); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-up max-w-xl">
      <div>
        <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Config</p>
        <h1 className="font-display text-3xl text-white tracking-tight">Settings</h1>
      </div>

      {/* CSV Upload */}
      <div className="panel p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Upload Roster</h2>
          <p className="text-xs text-[#555] leading-relaxed">
            CSV with <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#888]">course</code>, <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#888]">name</code>, and optional <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#888]">image-file</code> columns.
            <span className="text-[#6b3232] ml-1">Replaces all students & resets cycle.</span>
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading || disableCsvUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className={`border border-dashed border-[#222] rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors ${loading || disableCsvUpload ? 'opacity-50' : 'hover:border-[#333] hover:bg-[#131313]'}`}>
            {loading ? (
              <FlickerSpinner size={28} />
            ) : (
              <>
                <Upload size={20} className="text-[#444]" />
                <p className="text-xs text-[#555]">{disableCsvUpload ? 'CSV Upload Disabled' : 'Click to upload CSV'}</p>
              </>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-4 py-2.5 rounded-lg">{error}</p>}
        {success && <p className="text-xs text-green-400 bg-green-950/20 border border-green-900/30 px-4 py-2.5 rounded-lg">{success}</p>}
      </div>

      {/* Actions */}
      <div className="panel p-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white mb-1">Actions</h2>

        <div className="flex items-center justify-between py-3 border-b border-[#181818]">
          <div>
            <p className="text-sm text-white">Reset Cycle</p>
            <p className="text-xs text-[#555] mt-0.5">Reshuffle queue from the start.</p>
          </div>
          <button
            onClick={handleResetCycle}
            disabled={loading || disableCycleUpdate}
            className="flex items-center gap-2 text-xs text-[#888] hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-[#222] hover:border-[#333] px-3 py-2 rounded-lg transition-all duration-150 disabled:opacity-40"
          >
            <RefreshCcw size={13} />
            {disableCycleUpdate ? 'Disabled' : 'Reset'}
          </button>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-white">Clear History</p>
            <p className="text-xs text-red-900/80 mt-0.5">Permanently deletes all records.</p>
          </div>
          <button
            onClick={handleClearHistory}
            disabled={loading || disableResetHistory}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg transition-all duration-150 disabled:opacity-40"
          >
            <Trash2 size={13} />
            {disableResetHistory ? 'Disabled' : 'Clear'}
          </button>
        </div>
      </div>
    </div>
  );
}
