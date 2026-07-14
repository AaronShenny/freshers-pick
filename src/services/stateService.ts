import { supabase } from './supabase';
import type { AppState } from '../types';

export const getAppState = async (): Promise<AppState> => {
  const { data, error } = await supabase
    .from('app_state')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    // If no row exists, create one (fallback just in case)
    if (error.code === 'PGRST116') {
      const defaultState = { current_cycle: 1, current_index: 0, queue: [] };
      const { data: insertData, error: insertError } = await supabase
        .from('app_state')
        .insert(defaultState)
        .select()
        .single();
      if (insertError) throw insertError;
      return insertData as AppState;
    }
    throw error;
  }
  return data as AppState;
};

export const saveAppState = async (state: Partial<AppState>) => {
  // We assume there's always one row, we can just update all
  const { error } = await supabase
    .from('app_state')
    .update({ ...state, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update the existing row

  if (error) throw error;
};

export const resetStateAndCycle = async () => {
  await saveAppState({
    current_cycle: 1,
    current_index: 0,
    queue: []
  });
};
