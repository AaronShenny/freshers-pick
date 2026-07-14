import { useState, useEffect } from 'react';
import { fetchHistory } from '../services/historyService';
import { revealNextBatch, confirmSelection } from '../services/pickerService';
import { getAppState } from '../services/stateService';
import { toggleStudentPresence } from '../services/studentService';
import type { Student, HistoryRecord } from '../types';
import FlickerSpinner from '../components/FlickerSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [cycle, setCycle] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);

  const [selectCount, setSelectCount] = useState(1);
  const [subCount, setSubCount] = useState(0);

  const [pendingSelection, setPendingSelection] = useState<Student[]>([]);
  const [pendingSubstitutes, setPendingSubstitutes] = useState<Student[]>([]);

  const loadData = async () => {
    try {
      const [histData, stateData] = await Promise.all([fetchHistory(), getAppState()]);
      setHistory(histData.slice(0, 6));
      setCycle(stateData.current_cycle);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleReveal = async () => {
    setRevealing(true);
    setPendingSelection([]);
    setPendingSubstitutes([]);

    setTimeout(async () => {
      try {
        const batch = await revealNextBatch(selectCount, subCount);
        if (batch) {
          setPendingSelection(batch.primaries);
          setPendingSubstitutes(batch.substitutes);
        }
        await loadData();
      } catch (e) {
        console.error(e);
      } finally {
        setRevealing(false);
      }
    }, 1800);
  };

  const handleMarkAbsent = async (student: Student) => {
    try {
      await toggleStudentPresence(student.id, true);
      
      let newSelection = pendingSelection.filter(s => s.id !== student.id);
      let newSubs = [...pendingSubstitutes];

      if (newSubs.length > 0) {
        const substitute = newSubs.shift()!;
        newSelection.push(substitute);
      }

      setPendingSelection(newSelection);
      setPendingSubstitutes(newSubs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSubstitute = (substitute: Student) => {
    setPendingSelection([...pendingSelection, substitute]);
    setPendingSubstitutes(pendingSubstitutes.filter(s => s.id !== substitute.id));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmSelection(pendingSelection, pendingSubstitutes);
      setPendingSelection([]);
      setPendingSubstitutes([]);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const hasPending = pendingSelection.length > 0 || pendingSubstitutes.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <FlickerSpinner size={36} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Page header */}
      <div>
        <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Cycle {cycle}</p>
        <h1 className="font-display text-3xl text-white tracking-tight">Who's next?</h1>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* === Main reveal card === */}
        <div className="col-span-3 panel flex flex-col min-h-[440px] overflow-hidden">
          {/* Student display area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              {revealing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5 m-auto"
                >
                  <FlickerSpinner size={48} />
                  <p className="text-[#444] text-xs tracking-[0.25em] uppercase">Selecting…</p>
                </motion.div>
              ) : hasPending ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="w-full max-w-md flex flex-col gap-6"
                >
                  <div className="space-y-3">
                    {pendingSelection.map((student) => (
                      <div key={student.id} className="bg-[#161616] border border-[#222] rounded-xl p-5 flex items-center justify-between group transition-colors hover:border-[#333]">
                        <div>
                          <p className="text-[#555] text-xs font-mono tracking-widest mb-1.5">{student.course}</p>
                          <h3 className="text-white text-2xl font-display">{student.name}</h3>
                        </div>
                        <button onClick={() => handleMarkAbsent(student)} className="p-2 text-[#555] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors" title="Mark Absent">
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                    {pendingSelection.length === 0 && (
                      <p className="text-[#555] text-sm text-center py-4">No students selected.</p>
                    )}
                  </div>

                  {pendingSubstitutes.length > 0 && (
                    <div className="space-y-2 mt-2 pt-4 border-t border-[#1a1a1a]">
                      <p className="text-[#555] text-[10px] uppercase tracking-widest font-medium mb-3">Substitutes</p>
                      {pendingSubstitutes.map(student => (
                        <div key={student.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between opacity-50 blur-[3px] hover:blur-none hover:opacity-100 hover:border-[#333] transition-all duration-300">
                          <div>
                            <p className="text-[#444] text-[10px] font-mono tracking-widest mb-0.5">{student.course}</p>
                            <h3 className="text-[#aaa] text-base font-medium">{student.name}</h3>
                          </div>
                          <button onClick={() => handleManualSubstitute(student)} className="p-1.5 text-[#555] hover:text-green-400 hover:bg-green-950/30 rounded-lg transition-colors" title="Use Substitute">
                            <Check size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center m-auto"
                >
                  <div className="dot-pulse flex items-center justify-center gap-1.5 mb-4">
                    <span /><span /><span />
                  </div>
                  <p className="text-[#333] text-sm">Ready when you are</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="p-6 border-t border-[#181818] flex flex-col gap-5">
            {!hasPending ? (
              <>
                <div className="flex gap-4 items-center px-1">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Select Count</label>
                    <input type="number" min={1} max={50} value={selectCount} onChange={e => setSelectCount(Number(e.target.value))} className="bg-[#111] border border-[#1e1e1e] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Substitutes</label>
                    <input type="number" min={0} max={50} value={subCount} onChange={e => setSubCount(Number(e.target.value))} className="bg-[#111] border border-[#1e1e1e] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-colors" />
                  </div>
                </div>
                <button
                  onClick={handleReveal}
                  disabled={revealing}
                  className="w-full py-4 rounded-xl bg-white text-black text-sm font-semibold transition-all duration-200 hover:bg-[#e8e8e8] active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {revealing ? 'Picking…' : 'Reveal Student(s)'}
                </button>
              </>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={revealing}
                className="w-full py-4 rounded-xl bg-[#222] border border-[#333] text-white text-sm font-semibold transition-all duration-200 hover:bg-[#2a2a2a] hover:border-[#444] active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirm Selection
              </button>
            )}
          </div>
        </div>

        {/* === Recent picks === */}
        <div className="col-span-2 panel flex flex-col overflow-hidden max-h-[500px]">
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
  );
}
