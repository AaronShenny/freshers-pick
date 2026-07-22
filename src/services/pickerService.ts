import { supabase } from './supabase';
import { getAppState, saveAppState } from './stateService';
import { fetchActiveStudents } from './studentService';
import type { Student, AppState } from '../types';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

/**
 * Returns true if calling revealNextBatch would trigger a new cycle
 * (i.e. the queue is genuinely exhausted, not just uninitialized).
 *
 * current_cycle === 0 means no cycle has started yet (fresh start / reset).
 * An empty queue at cycle 0 is not a rollover — it just needs to be built.
 */
export const checkWillCycle = async (gender: 'male' | 'female' | 'mixed'): Promise<boolean> => {
  const state = await getAppState();

  // cycle 0 = fresh/reset, queue hasn't been built yet — never a rollover
  if (state.current_cycle === 0) return false;

  if (!state.queue || state.queue.length === 0) return true;

  const students = await fetchActiveStudents();
  const available = state.queue.filter(id => {
    const s = students.find(st => st.id === id);
    return s && (gender === 'mixed' || s.gender === gender);
  });
  return available.length === 0;
};

export const revealNextBatch = async (
  criteria: { count: number, gender: 'male' | 'female' | 'mixed' },
  subCount: number
): Promise<{ primaries: Student[], substitutes: Student[], queueExhausted?: boolean, finalQueue: string[] } | null> => {
  let state = await getAppState();
  let students = await fetchActiveStudents();

  if (students.length === 0) {
    return null; // No present students
  }

  // FIX M1: Cap totalNeeded against gender-filtered count, not all students
  const genderMatchingStudents = criteria.gender === 'mixed'
    ? students
    : students.filter(s => s.gender === criteria.gender);

  const picked: Student[] = [];
  const totalNeeded = Math.min(criteria.count + subCount, genderMatchingStudents.length);

  // FIX BUG 1: Use === '1' not !== '0' (consistent with all other env vars)
  const disableAutoCycleIncrement = import.meta.env.VITE_DISABLE_AUTO_CYCLE_INCREMENT === '1';
  let queueExhausted = false;

  while (picked.length < totalNeeded) {
    // Need a new queue?
    if (!state.queue || state.queue.length === 0) {
      // cycle=0 is a fresh start — always build the first queue regardless of the flag.
      // Only block rollover when cycle > 0 (queue was genuinely exhausted mid-run).
      if (disableAutoCycleIncrement && state.current_cycle > 0) {
        queueExhausted = true;
        break;
      }

      const studentIds = students.map(s => s.id);
      const newQueue = shuffleArray(studentIds);
      // cycle 0 = fresh start: set to 1. Otherwise increment (genuine rollover).
      const newCycle = state.current_cycle === 0 ? 1 : state.current_cycle + 1;

      state = {
        ...state,
        queue: [...newQueue], // FIX M8: use a new array copy, not mutation
        current_cycle: newCycle
      };
      await saveAppState({ queue: state.queue, current_cycle: newCycle });
    }

    // Try to extract from current queue
    let i = 0;
    const initialQueueSize = state.queue.length;
    const initialPickedSize = picked.length;

    while (i < state.queue.length && picked.length < totalNeeded) {
      const nextId = state.queue[i];
      const student = students.find(s => s.id === nextId);

      if (student) {
        const matchesGender = criteria.gender === 'mixed' || student.gender === criteria.gender;
        if (matchesGender && !picked.find(p => p.id === student.id)) {
          picked.push(student);
          // FIX M8: build new array instead of splice mutation
          state.queue = state.queue.filter((_, idx) => idx !== i);
          continue; // Don't increment i because array shifted left
        }
      }
      i++;
    }

    // If we didn't pick anyone in a full pass
    if (picked.length === initialPickedSize && state.queue.length === initialQueueSize) {
      // FIX M1: use gender-filtered count for the break check
      if (picked.length >= genderMatchingStudents.length) {
        // Impossible to fulfill request with available gender-matching students
        break;
      } else {
        // Force a cycle refresh (non-matching gender students remain — reset queue)
        state = { ...state, queue: [] }; // FIX M8: don't mutate, create new state
      }
    }
  }

  // Save the modified queue
  await saveAppState({ queue: state.queue });

  return {
    primaries: picked.slice(0, criteria.count),
    substitutes: picked.slice(criteria.count, totalNeeded),
    queueExhausted,
    finalQueue: state.queue, // FIX BUG 8: return final queue for confirmSelection
  };
};

export const confirmSelection = async (
  selectedStudents: Student[],
  unusedSubstitutes: Student[],
  snapshotQueue?: string[] // FIX BUG 8: accept post-reveal queue to avoid stale reads
) => {
  const state = await getAppState();

  // 1. Insert into history
  if (selectedStudents.length > 0) {
    const historyRecords = selectedStudents.map(student => ({
      student_id: student.id,
      cycle_number: state.current_cycle,
      course: student.course,
      student_name: student.name
    }));

    const { error: historyError } = await supabase
      .from('history')
      .insert(historyRecords);

    if (historyError) throw historyError;
  }

  // 2. Return unused substitutes to the FRONT of the queue
  // FIX BUG 8: use the snapshot queue from revealNextBatch if provided,
  // otherwise fall back to current state. Deduplicate to prevent double-entries.
  if (unusedSubstitutes.length > 0) {
    const baseQueue = snapshotQueue ?? state.queue ?? [];
    const unusedIds = unusedSubstitutes.map(s => s.id);
    // Deduplicate: only prepend IDs that aren't already in the base queue
    const newQueue = [...unusedIds, ...baseQueue.filter(id => !unusedIds.includes(id))];
    await saveAppState({ queue: newQueue });
  }
};
