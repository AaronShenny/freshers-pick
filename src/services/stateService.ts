import { supabase } from './supabase';
import type { AppState } from '../types';

// Module-level ID cache so saveAppState can target the exact row (FIX BUG 9)
let _appStateId: string | null = null;

export const getAppState = async (): Promise<AppState> => {
  const { data, error } = await supabase
    .from('app_state')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    // If no row exists, create one (fallback just in case)
    if (error.code === 'PGRST116') {
      const defaultState = { current_cycle: 0, queue: [] };
      const { data: insertData, error: insertError } = await supabase
        .from('app_state')
        .insert(defaultState)
        .select()
        .single();
      if (insertError) throw insertError;
      _appStateId = insertData.id; // FIX BUG 9: cache ID
      return insertData as AppState;
    }
    throw error;
  }
  _appStateId = data.id; // FIX BUG 9: cache ID on every successful fetch
  return data as AppState;
};

export const saveAppState = async (state: Partial<AppState>) => {
  // FIX BUG 9: Use the exact row ID instead of neq(nil-uuid) which matches ALL rows
  let id = _appStateId;
  if (!id) {
    // If we don't have a cached ID, fetch it first
    const current = await getAppState();
    id = current.id;
  }

  const { error } = await supabase
    .from('app_state')
    .update({ ...state, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const resetStateAndCycle = async () => {
  await saveAppState({
    current_cycle: 0,
    queue: []
  });
};
