import { useState, useEffect, useCallback } from 'react';
import { fetchStudents, toggleStudentPresence, syncAttendance, addStudent } from '../services/studentService';
import type { Student } from '../types';
import FlickerSpinner from '../components/FlickerSpinner';
import { RefreshCw, Plus, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
type ToastKind = 'success' | 'error';

interface ToastState {
  message: string;
  kind: ToastKind;
  id: number;
}

let _toastId = 0;

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  const isSuccess = toast.kind === 'success';

  return (
    <div
      key={toast.id}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl"
        style={{
          background: isSuccess ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.10)',
          border: isSuccess
            ? '1px solid rgba(74,222,128,0.25)'
            : '1px solid rgba(239,68,68,0.25)',
          color: isSuccess ? '#4ade80' : '#f87171',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isSuccess ? '#4ade80' : '#f87171',
            flexShrink: 0,
          }}
        />
        {toast.message}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Add student modal state
  const [addingStudent, setAddingStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  /** Show a toast, then auto-dismiss after 3 s */
  const showToast = useCallback((message: string, kind: ToastKind) => {
    const id = ++_toastId;
    setToast({ message, kind, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // -------------------------------------------------------------------------
  // Per-student toggle
  // -------------------------------------------------------------------------
  const handleToggle = async (id: string, currentStatus: boolean) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, present: !currentStatus } : s))
    );
    try {
      await toggleStudentPresence(id, currentStatus);
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  // -------------------------------------------------------------------------
  // Bulk sync
  // -------------------------------------------------------------------------
  const handleSync = async () => {
    if (syncing || students.length === 0) return;
    setSyncing(true);
    try {
      const targetPresent = await syncAttendance(students);
      // Optimistically update local state to match
      setStudents((prev) => prev.map((s) => ({ ...s, present: targetPresent })));
      showToast(
        targetPresent ? 'All students marked present.' : 'All students marked absent.',
        'success'
      );
    } catch (e) {
      console.error(e);
      showToast('Failed to sync attendance. Please try again.', 'error');
      loadData(); // re-sync with DB on failure
    } finally {
      setSyncing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Add single student
  // -------------------------------------------------------------------------
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCourse.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const newStudent = await addStudent(newName.trim(), newCourse.trim().toUpperCase());
      setStudents(prev => [...prev, newStudent].sort((a, b) => a.course.localeCompare(b.course)));
      setAddingStudent(false);
      setNewName('');
      setNewCourse('');
      showToast(`${newStudent.name} added successfully!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to add student. Please try again.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // -------------------------------------------------------------------------
  // Derived counts
  // -------------------------------------------------------------------------
  const presentCount = students.filter((s) => s.present).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <FlickerSpinner size={36} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8 animate-fade-up">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Roster</p>
            <h1 className="font-display text-3xl text-white tracking-tight">Students</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Add Student button */}
            <button
              onClick={() => setAddingStudent(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#fff',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              }}
              title="Add a single student manually"
            >
              <Plus size={14} />
              Add Student
            </button>

            {/* Sync Attendance button */}
            <button
              id="sync-attendance-btn"
              onClick={handleSync}
              disabled={syncing || students.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#aaa',
              }}
              onMouseEnter={(e) => {
                if (!syncing && students.length > 0) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.09)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    'rgba(255,255,255,0.20)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.10)';
                (e.currentTarget as HTMLButtonElement).style.color = '#aaa';
              }}
              title="Automatically flip attendance based on current class state"
            >
              <RefreshCw
                size={13}
                style={syncing ? { animation: 'spin 0.8s linear infinite' } : undefined}
              />
              {syncing ? 'Syncing…' : 'Sync Attendance'}
            </button>

            {/* Present count */}
            <div className="text-right">
              <p className="text-2xl font-semibold text-white">
                {presentCount}
                <span className="text-[#444] text-base font-normal">/{students.length}</span>
              </p>
              <p className="text-xs text-[#444]">present today</p>
            </div>
          </div>
        </div>

        {/* Roster table */}
        <div className="panel overflow-hidden">
          {students.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-[#333] text-sm">No students. Upload a CSV in Settings.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#161616]">
              {/* Column headers */}
              <div className="grid grid-cols-12 px-5 py-3">
                <span className="col-span-2 text-xs text-[#444] uppercase tracking-wider">Course</span>
                <span className="col-span-8 text-xs text-[#444] uppercase tracking-wider">Name</span>
                <span className="col-span-2 text-xs text-[#444] uppercase tracking-wider text-right">
                  Status
                </span>
              </div>

              {students.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-[#141414] transition-colors"
                >
                  <span className="col-span-2 text-xs font-mono text-[#555]">{student.course}</span>
                  <span className="col-span-8 text-sm font-medium text-white">{student.name}</span>
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleToggle(student.id, student.present)}
                      className={`text-xs font-medium px-3 py-1 rounded-full transition-all duration-200 ${
                        student.present ? 'badge-present' : 'badge-absent'
                      }`}
                    >
                      {student.present ? 'Present' : 'Absent'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast toast={toast} />

      {/* Add Student Modal */}
      {addingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 rounded-2xl w-[400px] shadow-2xl relative">
            <button
              onClick={() => setAddingStudent(false)}
              className="absolute top-4 right-4 p-2 text-[#666] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-display text-white mb-6">Add New Student</h2>
            <form onSubmit={handleAddStudent} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#666] text-[10px] uppercase tracking-widest font-medium">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-[#111] border border-[#222] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#666] text-[10px] uppercase tracking-widest font-medium">Course</label>
                <input
                  type="text"
                  value={newCourse}
                  onChange={e => setNewCourse(e.target.value)}
                  placeholder="e.g. BCA, MCA"
                  className="bg-[#111] border border-[#222] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors uppercase"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAdding || !newName.trim() || !newCourse.trim()}
                className="mt-2 w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold transition-all hover:bg-[#e8e8e8] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isAdding ? <FlickerSpinner size={16} /> : 'Add Student'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inline spin keyframes (no extra CSS file needed) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
