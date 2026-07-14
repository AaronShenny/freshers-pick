import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// The correct site URL for auth redirects (email magic links, OAuth, etc.)
// Set this in the Supabase dashboard → Authentication → URL Configuration → Site URL
// e.g. https://aaronshenny.github.io/picker/
export const APP_BASE_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;
