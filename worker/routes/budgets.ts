import { Hono } from 'hono';
import { errorResponse } from '../errors';
import { upsertBudgetSchema } from '../schemas';
import { isValidUuid } from '../supabase';
import type { CategoryRow, Env, Variables } from '../types';

export const budgetsRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// Atualiza o orçamento mensal (em centavos) de uma categoria do usuário no Supabase
budgetsRoute.put('/budgets', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const rawBody = await c.req.json().catch(() => null);
  const parsed = upsertBudgetSchema.safeParse(rawBody);

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados de orçamento inválidos.'
    );
  }

  const { category_id, budget_cents } = parsed.data;
  if (!isValidUuid(category_id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Categoria não encontrada.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao consultar categoria.'
    );
  }

  if (!existing) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Categoria não encontrada.');
  }

  const { data: updated, error: updateError } = await supabase
    .from('categories')
    .update({ budget_cents })
    .eq('id', category_id)
    .eq('user_id', userId)
    .select('id, user_id, name, icon, color, budget_cents, is_default, created_at')
    .single();

  if (updateError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível salvar o orçamento.'
    );
  }

  return c.json(updated as CategoryRow);
});
