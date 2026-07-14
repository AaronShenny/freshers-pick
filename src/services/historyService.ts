import { supabase } from './supabase';
import type { HistoryRecord } from '../types';

export const fetchHistory = async (): Promise<HistoryRecord[]> => {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('selected_at', { ascending: false });

  if (error) throw error;
  return data as HistoryRecord[];
};

export const clearHistory = async () => {
  const { error } = await supabase
    .from('history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) throw error;
};
