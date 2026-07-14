import { supabase } from './supabase';
import type { Student } from '../types';

export const fetchStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('course', { ascending: true });

  if (error) throw error;
  return data as Student[];
};

export const fetchActiveStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('present', true)
    .order('course', { ascending: true });

  if (error) throw error;
  return data as Student[];
};

export const replaceStudents = async (students: Omit<Student, 'id' | 'created_at'>[]) => {
  // First, clear existing students (history cascade deletes, app_state might need reset)
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) throw deleteError;

  if (students.length > 0) {
    const { error: insertError } = await supabase
      .from('students')
      .insert(students);

    if (insertError) throw insertError;
  }
};

export const toggleStudentPresence = async (id: string, currentStatus: boolean) => {
  const { error } = await supabase
    .from('students')
    .update({ present: !currentStatus })
    .eq('id', id);

  if (error) throw error;
};

/**
 * Decides the target attendance state for the whole class using:
 *   - All present  → set all absent
 *   - All absent   → set all present
 *   - Majority present (or exact tie) → set all present
 *   - Majority absent  → set all absent
 *
 * Performs a single bulk UPDATE in Supabase and returns the resolved target value.
 */
export const syncAttendance = async (students: Student[]): Promise<boolean> => {
  const totalStudents = students.length;
  if (totalStudents === 0) throw new Error('No students to sync.');

  const presentCount = students.filter((s) => s.present).length;
  const absentCount = totalStudents - presentCount;

  let targetPresent: boolean;

  if (presentCount === totalStudents) {
    // Everyone is present → flip to absent
    targetPresent = false;
  } else if (absentCount === totalStudents) {
    // Everyone is absent → flip to present
    targetPresent = true;
  } else if (presentCount >= absentCount) {
    // Majority present (or exact tie) → set all present
    targetPresent = true;
  } else {
    // Majority absent → set all absent
    targetPresent = false;
  }

  const { error } = await supabase
    .from('students')
    .update({ present: targetPresent })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // target every real row

  if (error) throw error;

  return targetPresent;
};
