import { Hono } from 'hono';
import { errorResponse } from '../errors';
import {
  createCategorySchema,
  deleteCategoryBodySchema,
  updateCategorySchema,
} from '../schemas';
import { isValidUuid } from '../supabase';
import type { CategoryRow, Env, Variables } from '../types';

export const categoriesRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

const CATEGORY_COLS =
  'id, user_id, name, icon, color, budget_cents, is_default, created_at';

categoriesRoute.get('/categories', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_COLS)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível listar as categorias.'
    );
  }

  return c.json((data ?? []) as CategoryRow[]);
});

categoriesRoute.post('/categories', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const rawBody = await c.req.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(rawBody);

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados de categoria inválidos.'
    );
  }

  const { name, icon, color, budget_cents } = parsed.data;

  const { data: existing, error: dupError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle();

  if (dupError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao verificar categoria existente.'
    );
  }

  if (existing) {
    return errorResponse(
      c,
      409,
      'CATEGORY_EXISTS',
      'Já existe uma categoria com esse nome.'
    );
  }

  const { data: created, error: insertError } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name,
      icon: icon ?? 'tag',
      color: color ?? '#64748B',
      budget_cents,
      is_default: 0,
    })
    .select(CATEGORY_COLS)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return errorResponse(
        c,
        409,
        'CATEGORY_EXISTS',
        'Já existe uma categoria com esse nome.'
      );
    }
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível criar a categoria.'
    );
  }

  return c.json(created as CategoryRow, 201);
});

categoriesRoute.patch('/categories/:id', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  if (!isValidUuid(id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Categoria não encontrada.');
  }

  const rawBody = await c.req.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(rawBody);

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados inválidos para atualização.'
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select(CATEGORY_COLS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao buscar categoria.'
    );
  }

  if (!existing) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Categoria não encontrada.');
  }

  const current = existing as CategoryRow;
  const nextName = parsed.data.name ?? current.name;

  if (
    parsed.data.name &&
    parsed.data.name.toLowerCase() !== current.name.toLowerCase()
  ) {
    const { data: dup } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', nextName)
      .neq('id', id)
      .maybeSingle();

    if (dup) {
      return errorResponse(
        c,
        409,
        'CATEGORY_EXISTS',
        'Já existe outra categoria com esse nome.'
      );
    }
  }

  const nextIcon =
    parsed.data.icon !== undefined ? parsed.data.icon : current.icon;
  const nextColor =
    parsed.data.color !== undefined ? parsed.data.color : current.color;
  const nextBudget =
    parsed.data.budget_cents !== undefined
      ? parsed.data.budget_cents
      : current.budget_cents;

  const { data: updated, error: updateError } = await supabase
    .from('categories')
    .update({
      name: nextName,
      icon: nextIcon,
      color: nextColor,
      budget_cents: nextBudget,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select(CATEGORY_COLS)
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return errorResponse(
        c,
        409,
        'CATEGORY_EXISTS',
        'Já existe outra categoria com esse nome.'
      );
    }
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível atualizar a categoria.'
    );
  }

  return c.json(updated as CategoryRow);
});

categoriesRoute.delete('/categories/:id', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  if (!isValidUuid(id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Categoria não encontrada.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', id)
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

  const rawBody = await c.req.json().catch(() => undefined);
  const parsedBody = deleteCategoryBodySchema.safeParse(rawBody);
  const reassignTo =
    c.req.query('reassign_to') ??
    (parsedBody.success ? parsedBody.data?.reassign_to : undefined);

  const { count: linkedCountRaw, error: countError } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category_id', id);

  if (countError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao verificar despesas vinculadas.'
    );
  }

  const linkedCount = linkedCountRaw ?? 0;

  if (linkedCount > 0) {
    if (!reassignTo || reassignTo === id || !isValidUuid(reassignTo)) {
      return errorResponse(
        c,
        409,
        'CATEGORY_HAS_EXPENSES',
        'Esta categoria possui despesas vinculadas. Reatribua para outra categoria antes de excluir.'
      );
    }

    const { data: targetCat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', reassignTo)
      .eq('user_id', userId)
      .maybeSingle();

    if (!targetCat) {
      return errorResponse(
        c,
        400,
        'INVALID_REASSIGN_CATEGORY',
        'A categoria de destino para reatribuição não foi encontrada.'
      );
    }

    const { error: reassignError } = await supabase
      .from('expenses')
      .update({
        category_id: reassignTo,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('category_id', id);

    if (reassignError) {
      return errorResponse(
        c,
        500,
        'DATABASE_ERROR',
        'Não foi possível reatribuir as despesas antes da exclusão.'
      );
    }
  }

  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (deleteError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível excluir a categoria.'
    );
  }

  return c.json({ deleted: true, reassigned_expenses: linkedCount });
});
