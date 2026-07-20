import { supabase } from './supabase';
import type { Game, GameStudent, Student } from '../types';

// ─── Fetch all games (with student count) ───────────────────────────────────
export const fetchGames = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from('games')
    .select('*, game_students(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((g: any) => ({
    ...g,
    student_count: g.game_students?.[0]?.count ?? 0,
  }));
};

// ─── Fetch students for a specific game ─────────────────────────────────────
export const fetchGameStudents = async (gameId: string): Promise<GameStudent[]> => {
  const { data, error } = await supabase
    .from('game_students')
    .select('*, student:students(*)')
    .eq('game_id', gameId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as GameStudent[];
};

// ─── Create a new game ───────────────────────────────────────────────────────
export const createGame = async (name: string, description?: string): Promise<Game> => {
  const { data, error } = await supabase
    .from('games')
    .insert({ name, description })
    .select()
    .single();

  if (error) throw error;
  return data as Game;
};

// ─── Update game name/description ───────────────────────────────────────────
export const updateGame = async (id: string, name: string, description?: string): Promise<void> => {
  const { error } = await supabase
    .from('games')
    .update({ name, description })
    .eq('id', id);

  if (error) throw error;
};

// ─── Delete a game (cascades to game_students) ───────────────────────────────
export const deleteGame = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ─── Save picked students to a game ─────────────────────────────────────────
export const saveStudentsToGame = async (
  gameId: string,
  primaries: Student[],
  substitutes: Student[]
): Promise<void> => {
  // Remove existing students for this game before re-saving
  await supabase.from('game_students').delete().eq('game_id', gameId);

  const rows = [
    ...primaries.map((s, i) => ({
      game_id: gameId,
      student_id: s.id,
      role: 'primary' as const,
      position: i,
    })),
    ...substitutes.map((s, i) => ({
      game_id: gameId,
      student_id: s.id,
      role: 'substitute' as const,
      position: primaries.length + i,
    })),
  ];

  if (rows.length === 0) return;

  const { error } = await supabase.from('game_students').insert(rows);
  if (error) throw error;
};
