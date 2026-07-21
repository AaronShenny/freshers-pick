import { useState, useEffect, useCallback } from 'react';
import { fetchHistory } from '../services/historyService';
import { revealNextBatch, confirmSelection, checkWillCycle } from '../services/pickerService';
import { getAppState } from '../services/stateService';
import { toggleStudentPresence } from '../services/studentService';
import type { Student, HistoryRecord } from '../types';
import FlickerSpinner from '../components/FlickerSpinner';
import { SafeImage, getAvatarUrl } from '../components/SafeImage';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, UserX } from 'lucide-react';

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
type ToastKind = 'success' | 'error' | 'info';
interface ToastState { message: string; kind: ToastKind; id: number; }
let _toastId = 0;

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const colors: Record<ToastKind, { bg: string; border: string; dot: string; text: string }> = {
    success: { bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.25)', dot: '#4ade80', text: '#4ade80' },
    error:   { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  dot: '#f87171', text: '#f87171' },
    info:    { bg: 'rgba(147,197,253,0.10)', border: 'rgba(147,197,253,0.25)', dot: '#93c5fd', text: '#93c5fd' },
  };
  const c = colors[toast.kind];
  return (
    <div key={toast.id} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, backdropFilter: 'blur(12px)' }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        {toast.message}
      </motion.div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [cycle, setCycle] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState<string | null>(null);

  const [selectCount, setSelectCount] = useState(1);
  const [subCount, setSubCount] = useState(0);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'mixed'>('mixed');

  const [pendingSelection, setPendingSelection] = useState<Student[]>([]);
  const [pendingSubstitutes, setPendingSubstitutes] = useState<Student[]>([]);
  
  const disableCycleUpdate = import.meta.env.VITE_DISABLE_CYCLE_UPDATE === '1';

  const [toast, setToast] = useState<ToastState | null>(null);
  const [showCycleWarning, setShowCycleWarning] = useState(false);
  const [pendingReveal, setPendingReveal] = useState<(() => void) | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++_toastId;
    setToast({ message, kind, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3500);
  }, []);

  const loadData = async () => {
    try {
      const [histData, stateData] = await Promise.all([fetchHistory(), getAppState()]);
      setHistory(histData.slice(0, 8));
      setCycle(stateData.current_cycle);
    } catch (e) {
      console.error(e);
      showToast('Failed to load data. Check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const doReveal = async () => {
    setShowCycleWarning(false);
    setPendingReveal(null);
    setRevealing(true);
    setPendingSelection([]);
    setPendingSubstitutes([]);

    const startTime = Date.now();

    try {
      // 1. Fetch selection immediately
      const batch = await revealNextBatch({ count: selectCount, gender: genderFilter }, subCount);
      if (!batch) {
        showToast('No present students found. Mark students as present first.', 'error');
        setRevealing(false);
        return;
      }

      // 2. Preload primary and substitute images in parallel
      const imageUrls = [
        ...batch.primaries.map(s => s.image_file).filter(Boolean),
        ...batch.substitutes.map(s => s.image_file).filter(Boolean)
      ] as string[];

      await Promise.all(
        imageUrls.map(url => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      // 3. Keep spinner active for at least 1.5s for visual suspense
      const elapsed = Date.now() - startTime;
      const minDuration = 1500; 
      const remainingTime = Math.max(0, minDuration - elapsed);

      setTimeout(async () => {
        const primariesGot = batch.primaries.length;
        const subsGot = batch.substitutes.length;

        setPendingSelection(batch.primaries);
        setPendingSubstitutes(batch.substitutes);

        // Warn if fewer students than requested
        if (primariesGot < selectCount) {
          showToast(
            `Only ${primariesGot} present student${primariesGot !== 1 ? 's' : ''} available (requested ${selectCount}).`,
            'info'
          );
        } else if (subsGot < subCount) {
          showToast(
            `Only ${subsGot} substitute${subsGot !== 1 ? 's' : ''} available (requested ${subCount}).`,
            'info'
          );
        }

        await loadData();
        setRevealing(false);
      }, remainingTime);

    } catch (e) {
      console.error(e);
      showToast('Failed to pick students. Please try again.', 'error');
      setRevealing(false);
    }
  };

  const handleMarkAbsent = async (student: Student) => {
    if (markingAbsent) return; // prevent double-clicking
    setMarkingAbsent(student.id);
    try {
      await toggleStudentPresence(student.id, true);

      // Remove from selection, pull next sub in
      setPendingSelection(prev => {
        const newSel = prev.filter(s => s.id !== student.id);
        
        if (pendingSubstitutes.length > 0) {
          const nextSub = pendingSubstitutes[0];
          newSel.push(nextSub);
          showToast(`${student.name} marked absent — ${nextSub.name} substituted in.`, 'info');
        } else {
          showToast(`${student.name} marked absent. No more substitutes.`, 'info');
        }
        return newSel;
      });

      setPendingSubstitutes(prevSubs => {
        if (prevSubs.length > 0) {
           return prevSubs.slice(1);
        }
        return prevSubs;
      });
    } catch (e) {
      console.error(e);
      showToast(`Failed to mark ${student.name} as absent. Please try again.`, 'error');
    } finally {
      setMarkingAbsent(null);
    }
  };



  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await confirmSelection(pendingSelection, pendingSubstitutes);
      const count = pendingSelection.length;
      setPendingSelection([]);
      setPendingSubstitutes([]);
      await loadData();
      showToast(`${count} student${count !== 1 ? 's' : ''} confirmed!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to confirm selection. Please try again.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const hasPending = pendingSelection.length > 0 || pendingSubstitutes.length > 0;

  const handleReveal = async () => {
    if (revealing) return;
    // Check if a cycle rollover is about to happen
    const willCycle = await checkWillCycle(genderFilter);
    if (willCycle) {
      setShowCycleWarning(true);
      return;
    }
    doReveal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <FlickerSpinner size={36} />
      </div>
    );
  }

  return (
    <>
      {/* === Cycle Warning Modal === */}
      <AnimatePresence>
        {showCycleWarning && (
          <motion.div
            key="cycle-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              key="cycle-modal"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-[380px] rounded-2xl border border-[#2a2a2a] p-7 flex flex-col gap-5"
              style={{ background: '#111', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <AlertCircle className="text-amber-400" size={22} />
              </div>

              {/* Text & Actions */}
              {disableCycleUpdate ? (
                <>
                  <div>
                    <h2 className="text-white font-semibold text-lg mb-1.5">No students left</h2>
                    <p className="text-[#666] text-sm leading-relaxed">
                      Everyone in the current queue has been picked. Cycle resetting is disabled globally, so no more students can be picked from this queue.
                    </p>
                  </div>
                  <div className="flex pt-1">
                    <button
                      onClick={() => setShowCycleWarning(false)}
                      className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-sm text-white font-medium bg-[#222] hover:bg-[#333] transition-all"
                    >
                      Okay
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-white font-semibold text-lg mb-1.5">New cycle starting</h2>
                    <p className="text-[#666] text-sm leading-relaxed">
                      Everyone in the current queue has been picked. Starting <span className="text-amber-400 font-medium">Cycle {cycle + 1}</span> will reshuffle the list — previously picked students can be called again.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowCycleWarning(false)}
                      className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-sm text-[#888] font-medium hover:border-[#444] hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={doReveal}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}
                    >
                      Start Cycle {cycle + 1}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8 animate-fade-up h-full">
        {/* Page header */}
        <div>
          <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Cycle {cycle}</p>
          <h1 className="font-display text-3xl text-white tracking-tight">Who's next?</h1>
        </div>

        <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
          {/* === Main reveal card === */}
          <div className="col-span-3 panel flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto min-h-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center m-auto"
              >
                <div className="dot-pulse flex items-center justify-center gap-1.5 mb-4">
                  <span /><span /><span />
                </div>
                <p className="text-[#333] text-sm">Ready when you are</p>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-[#181818] flex flex-col gap-5">
              <div className="flex gap-4 items-center px-1">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Select Count</label>
                  <input
                    type="number" min={1} max={50} value={selectCount}
                    onChange={e => setSelectCount(Math.max(1, Number(e.target.value)))}
                    className="bg-[#111] border border-[#1e1e1e] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Substitutes</label>
                  <input
                    type="number" min={0} max={50} value={subCount}
                    onChange={e => setSubCount(Math.max(0, Number(e.target.value)))}
                    className="bg-[#111] border border-[#1e1e1e] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-colors"
                  />
                </div>
              </div>
              {/* Gender Filter — pill segment control */}
              <div className="flex gap-2 px-1 pb-1">
                {(['male', 'female', 'mixed'] as const).map(g => {
                  const active = genderFilter === g;
                  const icons: Record<string, string> = { male: '♂', female: '♀', mixed: '⚥' };
                  const activeColors: Record<string, string> = {
                    male:   'bg-blue-600/20 border-blue-500/60 text-blue-300',
                    female: 'bg-pink-600/20 border-pink-500/60 text-pink-300',
                    mixed:  'bg-purple-600/20 border-purple-500/60 text-purple-300',
                  };
                  return (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 select-none
                        ${active
                          ? activeColors[g]
                          : 'bg-[#111] border-[#2a2a2a] text-[#888] hover:border-[#444] hover:text-[#bbb]'
                        }`}
                    >
                      <span className="text-base leading-none">{icons[g]}</span>
                      <span className="capitalize">{g}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleReveal}
                disabled={revealing}
                className="w-full py-4 rounded-xl bg-white text-black text-sm font-semibold transition-all duration-200 hover:bg-[#e8e8e8] active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {revealing ? 'Picking…' : 'Reveal Student(s)'}
              </button>
            </div>
          </div>

          {/* === Recent picks === */}
          <div className="col-span-2 panel flex flex-col overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-[#181818]">
              <h3 className="text-sm font-medium text-[#888]">Recent Picks</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-full p-8">
                  <p className="text-[#333] text-sm text-center">No picks yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#161616]">
                  {history.map((record, i) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#141414] transition-colors min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{record.student_name}</p>
                        <p className="text-xs text-[#444] mt-0.5">
                          {new Date(record.selected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-[#333] shrink-0">{record.course}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(revealing || hasPending) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111]/95 backdrop-blur-sm"
          >
            {revealing ? (
              <div className="flex flex-col items-center gap-5">
                <FlickerSpinner size={64} />
                <p className="text-[#666] text-sm tracking-[0.3em] uppercase">Selecting…</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="w-full h-full flex flex-col overflow-hidden"
              >
                {/* Cards area */}
                <div className="flex-1 flex flex-col items-center px-8 pt-16 pb-8 overflow-y-auto">
                  <div className="my-auto flex flex-col items-center w-full">
                    {/* Primary selections */}
                    <AnimatePresence mode="popLayout">
                      {pendingSelection.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-16 max-w-[95vw]">
                          {pendingSelection.map(student => (
                            <motion.div
                              layout
                              key={student.id}
                              initial={{ opacity: 0, y: 24, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.88, y: -12 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                              className="relative flex flex-col items-center w-52 group"
                            >
                              <button
                                onClick={() => handleMarkAbsent(student)}
                                disabled={!!markingAbsent}
                                className="absolute -top-12 -right-4 p-2 text-white hover:text-red-400 hover:scale-110 transition-transform z-10 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Mark absent & pull substitute"
                              >
                                <X size={36} strokeWidth={1.5} />
                              </button>

                              <div className="w-48 h-48 overflow-hidden mb-6 shadow-2xl rounded-sm">
                                <SafeImage
                                  src={student.image_file || getAvatarUrl(student.id, student.gender)}
                                  fallbackSrc={getAvatarUrl(student.id, student.gender)}
                                  alt={student.name}
                                  className="w-full h-full"
                                />
                              </div>

                              <div className="text-center w-full px-1">
                                <h3 className="text-white font-display text-4xl mb-2 leading-none tracking-tight">{student.name}</h3>
                                <p className="text-[#888] text-sm tracking-wide font-light">{student.course}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div
                          key="all-absent"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-3 text-center"
                        >
                          <UserX size={40} className="text-[#444]" />
                          <p className="text-[#666] text-lg">All selected students marked absent.</p>
                          {pendingSubstitutes.length > 0 && (
                            <p className="text-[#444] text-sm">Pull in a substitute below, or confirm to close.</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Substitutes row */}
                    <AnimatePresence>
                      {pendingSubstitutes.length > 0 && (
                        <motion.div
                          key="subs"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="mt-12 flex flex-col items-center gap-4"
                        >
                          <p className="text-[#555] text-xs uppercase tracking-[0.2em] font-medium">
                            Substitutes in Queue
                          </p>
                          <div className="flex flex-wrap justify-center gap-3">
                            {pendingSubstitutes.map((student, i) => (
                              <div
                                key={student.id}
                                className="flex items-center gap-3 px-5 py-2 rounded-full bg-[#1a1a1a] border border-[#222] text-[#888] select-none"
                              >
                                <div className="w-4 h-4 rounded-full bg-[#333] text-black flex items-center justify-center text-[10px] font-bold">
                                  {i + 1}
                                </div>
                                <div className="flex items-center gap-2 blur-[5px] opacity-60 pointer-events-none">
                                  <span>{student.name}</span>
                                  <span className="text-[10px] uppercase font-mono">{student.course}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Warning if no subs left and no selections */}
                    {pendingSelection.length === 0 && pendingSubstitutes.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 flex items-center gap-2 text-[#555] text-sm"
                      >
                        <AlertCircle size={14} />
                        No students remaining. Confirm to close.
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="shrink-0 flex items-center justify-center pb-12 pt-4">
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="px-16 py-4 rounded-xl bg-white text-black font-semibold text-lg transition-all hover:bg-[#e8e8e8] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  >
                    {confirming ? (
                      <>
                        <FlickerSpinner size={18} />
                        Confirming…
                      </>
                    ) : (
                      'Confirm selection'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast toast={toast} />}
      </AnimatePresence>
    </>
  );
}

