-- Schema idempotente do GastoIA para Supabase (PostgreSQL + Row Level Security)
-- Cole e execute este arquivo no SQL Editor do seu projeto Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  budget_cents BIGINT NOT NULL DEFAULT 0 CHECK (budget_cents >= 0),
  is_default SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  expense_date DATE NOT NULL,
  merchant TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  payment_method TEXT,
  notes TEXT,
  source TEXT CHECK (source IN ('image', 'text', 'manual')),
  ai_confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON public.expenses(user_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_category
  ON public.expenses(user_id, category_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_lower_name
  ON public.categories(user_id, LOWER(name));

-- Segurança por linha (RLS): cada usuário acessa apenas seus próprios registros
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
CREATE POLICY "categories_select_own" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
CREATE POLICY "expenses_select_own" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;
CREATE POLICY "expenses_insert_own" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;
CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses_delete_own" ON public.expenses;
CREATE POLICY "expenses_delete_own" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage;
CREATE POLICY "ai_usage_insert_own" ON public.ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_update_own" ON public.ai_usage;
CREATE POLICY "ai_usage_update_own" ON public.ai_usage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Incremento atômico de cota diária de IA por usuário autenticado
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  INSERT INTO public.ai_usage (user_id, day, count)
  VALUES (v_user_id, p_day, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET count = public.ai_usage.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;
