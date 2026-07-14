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

export const revealNextBatch = async (primaryCount: number, subCount: number): Promise<{ primaries: Student[], substitutes: Student[] } | null> => {
  let state = await getAppState();
  let students = await fetchActiveStudents();

  if (students.length === 0) {
    return null; // No present students
  }

  const totalNeeded = Math.min(primaryCount + subCount, students.length);
  const picked: Student[] = [];

  // Helper loop to fill 'picked' array up to totalNeeded
  while (picked.length < totalNeeded) {
    // Need a new queue?
    if (!state.queue || state.queue.length === 0 || state.current_index >= state.queue.length) {
      // Generate new queue
      const studentIds = students.map(s => s.id);
      const newQueue = shuffleArray(studentIds);
      
      const newCycle = state.queue && state.queue.length > 0 ? state.current_cycle + 1 : state.current_cycle;

      state = {
        ...state,
        queue: newQueue,
        current_index: 0,
        current_cycle: newCycle
      };
      await saveAppState({ queue: newQueue, current_index: 0, current_cycle: newCycle });
    }

    // Try to pop next valid student
    while (state.current_index < state.queue.length && picked.length < totalNeeded) {
      const nextStudentId = state.queue[state.current_index];
      const student = students.find(s => s.id === nextStudentId);
      
      state.current_index++;

      if (student && !picked.find(p => p.id === student.id)) {
        picked.push(student);
      }
    }

    // Save the advanced index
    await saveAppState({ current_index: state.current_index });
  }

  return {
    primaries: picked.slice(0, primaryCount),
    substitutes: picked.slice(primaryCount, totalNeeded)
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

  // 2. Return unused substitutes to the queue
  if (unusedSubstitutes.length > 0 && state.queue) {
    // Put them back exactly where current_index is, so they are next.
    const unusedIds = unusedSubstitutes.map(s => s.id);
    const newQueue = [
      ...state.queue.slice(0, state.current_index),
      ...unusedIds,
      ...state.queue.slice(state.current_index)
    ];
    await saveAppState({ queue: newQueue });
  }
};
