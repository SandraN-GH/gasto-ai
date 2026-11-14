import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './types';

// Cria um cliente Supabase autenticado no contexto do usuário (RLS aplicado no PostgreSQL)
export function createUserSupabase(
  env: Env,
  accessToken: string
): SupabaseClient {
  const supabaseUrl = (env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY ?? '';

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
