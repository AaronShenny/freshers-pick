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

export const revealNextBatch = async (
  criteria: { count: number, gender: 'male' | 'female' | 'mixed' }, 
  subCount: number
): Promise<{ primaries: Student[], substitutes: Student[] } | null> => {
  let state = await getAppState();
  let students = await fetchActiveStudents();

  if (students.length === 0) {
    return null; // No present students
  }

  const picked: Student[] = [];
  const totalNeeded = Math.min(criteria.count + subCount, students.length);

  while (picked.length < totalNeeded) {
    // Need a new queue?
    if (!state.queue || state.queue.length === 0) {
      const studentIds = students.map(s => s.id);
      const newQueue = shuffleArray(studentIds);
      const newCycle = state.queue && state.queue.length === 0 ? state.current_cycle + 1 : state.current_cycle;
      
      state = {
        ...state,
        queue: newQueue,
        current_cycle: newCycle
      };
      await saveAppState({ queue: newQueue, current_cycle: newCycle });
    }

    // Try to extract from current queue
    let i = 0;
    let initialQueueSize = state.queue.length;
    let initialPickedSize = picked.length;

    while (i < state.queue.length && picked.length < totalNeeded) {
      const nextId = state.queue[i];
      const student = students.find(s => s.id === nextId);

      if (student) {
        const matchesGender = criteria.gender === 'mixed' || student.gender === criteria.gender;
        if (matchesGender && !picked.find(p => p.id === student.id)) {
          picked.push(student);
          // Remove from queue
          state.queue.splice(i, 1);
          continue; // Don't increment i because array shifted left
        }
      }
      i++;
    }

    // If we didn't pick anyone in a full pass
    if (picked.length === initialPickedSize && state.queue.length === initialQueueSize) {
      const totalAvailableOfGender = students.filter(s => criteria.gender === 'mixed' || s.gender === criteria.gender).length;
      if (picked.length >= totalAvailableOfGender) {
        // Impossible to fulfill request
        break;
      } else {
        // Force a cycle refresh
        state.queue = [];
      }
    }
  }

  // Save the modified queue
  await saveAppState({ queue: state.queue });

  return {
    primaries: picked.slice(0, criteria.count),
    substitutes: picked.slice(criteria.count, totalNeeded)
  };
};

export const confirmSelection = async (selectedStudents: Student[], unusedSubstitutes: Student[]) => {
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
  if (unusedSubstitutes.length > 0 && state.queue) {
    const unusedIds = unusedSubstitutes.map(s => s.id);
    const newQueue = [...unusedIds, ...state.queue];
    await saveAppState({ queue: newQueue });
  }
};
