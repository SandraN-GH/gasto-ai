import type { Ai } from '@cloudflare/workers-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  AI: Ai;
  ASSETS: AssetsFetcher;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

export interface Variables {
  userId: string;
  userEmail: string | null;
  accessToken: string;
  supabase: SupabaseClient;
}

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budget_cents: number;
  is_default: number;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  amount_cents: number;
  expense_date: string;
  merchant: string | null;
  category_id: string;
  payment_method: string | null;
  notes: string | null;
  source: 'image' | 'text' | 'manual' | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string | null;
}
