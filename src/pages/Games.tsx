import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pencil, Trash2, X, Check, Users, Gamepad2, ChevronRight } from 'lucide-react';
import { fetchGames, createGame, updateGame, deleteGame, saveStudentsToGame, fetchGameStudents } from '../services/gameService';
import { revealNextBatch } from '../services/pickerService';
import { getAvatarUrl } from '../components/SafeImage';
import type { Game, GameStudent } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastKind = 'success' | 'error' | 'info';
interface ToastState { message: string; kind: ToastKind; id: number; }
let _toastId = 0;

// ─── Toast ────────────────────────────────────────────────────────────────────
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

// ─── Play Modal ───────────────────────────────────────────────────────────────
function PlayModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const [gameStudents, setGameStudents] = useState<GameStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'shuffling' | 'reveal'>('shuffling');
  const [revealedCount, setRevealedCount] = useState(0);
  const [shuffleText, setShuffleText] = useState('');

  const primaries = gameStudents.filter(gs => gs.role === 'primary');
  const substitutes = gameStudents.filter(gs => gs.role === 'substitute');

  useEffect(() => {
    fetchGameStudents(game.id).then(gs => {
      setGameStudents(gs);
      setLoading(false);
    });
  }, [game.id]);

  // Fake shuffle animation
  useEffect(() => {
    if (loading) return;

    const names = gameStudents.map(gs => gs.student?.name ?? '???');
    let tick = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * names.length);
      setShuffleText(names[idx] ?? '');
      tick++;
      if (tick > 30) {
        clearInterval(interval);
        setPhase('reveal');
        // Reveal one by one
        let count = 0;
        const revealer = setInterval(() => {
          count++;
          setRevealedCount(count);
          if (count >= primaries.length) clearInterval(revealer);
        }, 400);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [loading, gameStudents]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-[#555] hover:text-white transition-colors"
      >
        <X size={22} />
      </button>

      {/* Game title */}
      <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-2">Now playing</p>
      <h2 className="font-display text-4xl text-white tracking-tight mb-10">{game.name}</h2>

      {loading ? (
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : phase === 'shuffling' ? (
        <motion.div
          key="shuffle"
          className="text-center"
        >
          <motion.p
            key={shuffleText}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl text-white tracking-tight min-h-[64px]"
          >
            {shuffleText}
          </motion.p>
          <p className="text-[#444] text-sm mt-4 animate-pulse">Picking…</p>
        </motion.div>
      ) : (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-8 justify-center max-w-4xl px-8"
        >
          <AnimatePresence>
            {primaries.slice(0, revealedCount).map((gs, i) => {
              const student = gs.student;
              if (!student) return null;
              return (
                <motion.div
                  key={gs.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24, delay: i * 0.05 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-36 h-36 rounded-sm overflow-hidden shadow-2xl bg-white">
                    <img
                      src={student.image_file || getAvatarUrl(student.id, student.gender)}
                      alt={student.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">{student.name}</p>
                    <p className="text-[#555] text-xs">{student.course}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Substitutes */}
      {phase === 'reveal' && revealedCount >= primaries.length && substitutes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <p className="text-[#444] text-xs uppercase tracking-widest mb-3">Substitutes</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {substitutes.map(gs => {
              const student = gs.student;
              if (!student) return null;
              return (
                <div key={gs.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#222] bg-[#111]">
                  <div className="w-7 h-7 rounded overflow-hidden">
                    <img
                      src={student.image_file || getAvatarUrl(student.id, student.gender)}
                      alt={student.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[#888] text-sm">{student.name}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Create / Edit Game Modal ─────────────────────────────────────────────────
function GameFormModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: Game;
  onSave: (name: string, description: string, selectCount: number, subCount: number, gender: 'male' | 'female' | 'mixed') => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [selectCount, setSelectCount] = useState(1);
  const [subCount, setSubCount] = useState(0);
  const [gender, setGender] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), selectCount, subCount, gender);
    } finally {
      setSaving(false);
    }
  };

  const genderIcons: Record<string, string> = { male: '♂', female: '♀', mixed: '⚥' };
  const genderColors: Record<string, string> = {
    male:   'bg-blue-600/20 border-blue-500/60 text-blue-300',
    female: 'bg-pink-600/20 border-pink-500/60 text-pink-300',
    mixed:  'bg-purple-600/20 border-purple-500/60 text-purple-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-[420px] rounded-2xl border border-[#2a2a2a] p-7 flex flex-col gap-5"
        style={{ background: '#111', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            {existing ? 'Edit game' : 'New game'}
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Game Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Orientation Round 1"
              className="bg-[#0d0d0d] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors placeholder:text-[#333]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a note…"
              className="bg-[#0d0d0d] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors placeholder:text-[#333]"
            />
          </div>

          {/* Only show pick controls for new games */}
          {!existing && (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Pick Count</label>
                  <input
                    type="number" min={1} max={50} value={selectCount}
                    onChange={e => setSelectCount(Math.max(1, Number(e.target.value)))}
                    className="bg-[#0d0d0d] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[#555] text-[10px] uppercase tracking-widest font-medium">Substitutes</label>
                  <input
                    type="number" min={0} max={50} value={subCount}
                    onChange={e => setSubCount(Math.max(0, Number(e.target.value)))}
                    className="bg-[#0d0d0d] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#444] transition-colors"
                  />
                </div>
              </div>

              {/* Gender filter */}
              <div className="flex gap-2">
                {(['male', 'female', 'mixed'] as const).map(g => {
                  const active = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 select-none
                        ${active ? genderColors[g] : 'bg-[#0d0d0d] border-[#2a2a2a] text-[#888] hover:border-[#444] hover:text-[#bbb]'}`}
                    >
                      <span>{genderIcons[g]}</span>
                      <span className="capitalize">{g}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-sm text-[#888] font-medium hover:border-[#444] hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-[#e8e8e8] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (existing ? 'Saving…' : 'Creating…') : (existing ? 'Save' : 'Create & Pick')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Games Page ───────────────────────────────────────────────────────────────
export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [playingGame, setPlayingGame] = useState<Game | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++_toastId;
    setToast({ message, kind, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3500);
  }, []);

  const loadGames = async () => {
    try {
      const data = await fetchGames();
      setGames(data);
    } catch (e) {
      console.error(e);
      showToast('Failed to load games.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGames(); }, []);

  const handleCreate = async (name: string, description: string, selectCount: number, subCount: number, gender: 'male' | 'female' | 'mixed') => {
    try {
      // 1. Create the game record
      const game = await createGame(name, description);

      // 2. Pick students from the central queue
      const batch = await revealNextBatch({ count: selectCount, gender }, subCount);
      if (!batch) {
        showToast('No present students to pick from.', 'error');
        await loadGames();
        setShowCreate(false);
        return;
      }

      // 3. Save picked students to game
      await saveStudentsToGame(game.id, batch.primaries, batch.substitutes);

      showToast(`"${name}" created with ${batch.primaries.length} students!`, 'success');
      await loadGames();
      setShowCreate(false);
    } catch (e) {
      console.error(e);
      showToast('Failed to create game.', 'error');
    }
  };

  const handleEdit = async (name: string, description: string) => {
    if (!editingGame) return;
    try {
      await updateGame(editingGame.id, name, description);
      showToast('Game updated.', 'success');
      await loadGames();
      setEditingGame(null);
    } catch (e) {
      console.error(e);
      showToast('Failed to update game.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteGame(id);
      showToast('Game deleted.', 'info');
      await loadGames();
    } catch (e) {
      console.error(e);
      showToast('Failed to delete game.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {toast && <Toast toast={toast} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <GameFormModal
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        )}
        {editingGame && (
          <GameFormModal
            existing={editingGame}
            onSave={(name, description) => handleEdit(name, description)}
            onClose={() => setEditingGame(null)}
          />
        )}
        {playingGame && (
          <PlayModal game={playingGame} onClose={() => setPlayingGame(null)} />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8 animate-fade-up">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[#444] text-xs uppercase tracking-widest font-medium mb-1">Pre-pick</p>
            <h1 className="font-display text-3xl text-white tracking-tight">Games</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-[#e8e8e8] transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            New game
          </button>
        </div>

        {/* Game list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a' }}>
              <Gamepad2 size={24} className="text-[#333]" />
            </div>
            <p className="text-[#444] text-sm">No games yet. Create your first one.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-sm text-[#888] hover:text-white hover:border-[#444] transition-all"
            >
              <Plus size={14} />
              New game
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {games.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ delay: i * 0.04 }}
                  className="panel flex items-center gap-4 px-5 py-4 group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e1e' }}>
                    <Gamepad2 size={16} className="text-[#555]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{game.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {game.description && (
                        <span className="text-[#444] text-xs truncate">{game.description}</span>
                      )}
                      <span className="flex items-center gap-1 text-[#444] text-xs">
                        <Users size={11} />
                        {game.student_count ?? 0} students
                      </span>
                      <span className="text-[#333] text-xs">
                        {new Date(game.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingGame(game)}
                      className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-all"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(game.id)}
                      disabled={deletingId === game.id}
                      className="p-2 rounded-lg text-[#555] hover:text-red-400 hover:bg-[#1a0a0a] transition-all disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Play button */}
                  <button
                    onClick={() => setPlayingGame(game)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] text-sm text-[#888] font-medium hover:bg-white hover:text-black hover:border-white transition-all duration-200 shrink-0"
                  >
                    <Play size={13} fill="currentColor" />
                    Play
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
