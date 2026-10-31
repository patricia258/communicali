import { createClient } from '@supabase/supabase-js';

// Sessão só para a área administrativa; quem visita o site nunca faz login.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const anonStorage = supabase.storage;

export async function anonPublicRpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  return { data: data as T | null, error };
}
