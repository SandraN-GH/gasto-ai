import { Hono } from 'hono';
import { getSaoPauloToday } from '../ai';
import { errorResponse } from '../errors';
import {
  createExpenseSchema,
  expenseFiltersSchema,
  updateExpenseSchema,
} from '../schemas';
import { isValidUuid } from '../supabase';
import type { Env, ExpenseRow, Variables } from '../types';

export const expensesRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

interface JoinedCategory {
  name: string | null;
  icon: string | null;
  color: string | null;
}

interface RawJoinedExpense extends ExpenseRow {
  category?: JoinedCategory | JoinedCategory[] | null;
}

interface ExpenseWithCategory extends ExpenseRow {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

const EXPENSE_SELECT = `
  id, user_id, amount_cents, expense_date, merchant,
  category_id, payment_method, notes, source, ai_confidence,
  created_at, updated_at,
  category:categories(name, icon, color)
`;

function flattenExpense(row: RawJoinedExpense): ExpenseWithCategory {
  const catObj = Array.isArray(row.category) ? row.category[0] : row.category;
  return {
    id: row.id,
    user_id: row.user_id,
    amount_cents: Number(row.amount_cents),
    expense_date: row.expense_date,
    merchant: row.merchant,
    category_id: row.category_id,
    payment_method: row.payment_method,
    notes: row.notes,
    source: row.source,
    ai_confidence: row.ai_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: catObj?.name ?? null,
    category_icon: catObj?.icon ?? null,
    category_color: catObj?.color ?? null,
  };
}

expensesRoute.get('/expenses', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');

  const rawQuery = {
    from: c.req.query('from'),
    to: c.req.query('to'),
    category: c.req.query('category'),
    min: c.req.query('min'),
    max: c.req.query('max'),
    q: c.req.query('q'),
    limit: c.req.query('limit'),
    cursor: c.req.query('cursor'),
  };

  const parsed = expenseFiltersSchema.safeParse(rawQuery);
  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Parâmetros de filtro inválidos.'
    );
  }

  const { from, to, category, min, max, q, limit, cursor } = parsed.data;

  if (min !== undefined && max !== undefined && min > max) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      'O valor mínimo não pode ser maior que o valor máximo.'
    );
  }

  if (category && !isValidUuid(category)) {
    return c.json({ items: [], next_cursor: null });
  }

  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('user_id', userId);

  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);
  if (category) query = query.eq('category_id', category);
  if (min !== undefined) query = query.gte('amount_cents', min);
  if (max !== undefined) query = query.lte('amount_cents', max);

  if (q) {
    const safeQ = q.replace(/[,()]/g, ' ').trim();
    if (safeQ) {
      query = query.or(`merchant.ilike.%${safeQ}%,notes.ilike.%${safeQ}%`);
    }
  }

  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('|');
    if (
      !cursorDate ||
      !cursorId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(cursorDate) ||
      !isValidUuid(cursorId)
    ) {
      return errorResponse(
        c,
        400,
        'INVALID_CURSOR',
        'Cursor de paginação inválido.'
      );
    }
    query = query.or(
      `expense_date.lt.${cursorDate},and(expense_date.eq.${cursorDate},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível carregar as despesas.'
    );
  }

  const rows = ((data ?? []) as unknown as RawJoinedExpense[]).map(flattenExpense);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const next_cursor =
    hasMore && lastItem ? `${lastItem.expense_date}|${lastItem.id}` : null;

  return c.json({ items, next_cursor });
});

expensesRoute.post('/expenses', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const rawBody = await c.req.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(rawBody);

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados da despesa inválidos.'
    );
  }

  const data = parsed.data;

  if (data.expense_date > getSaoPauloToday()) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      'A data da despesa não pode ser futura.'
    );
  }

  if (!isValidUuid(data.category_id)) {
    return errorResponse(
      c,
      400,
      'INVALID_CATEGORY',
      'Categoria não encontrada para este usuário.'
    );
  }

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', data.category_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!category) {
    return errorResponse(
      c,
      400,
      'INVALID_CATEGORY',
      'Categoria não encontrada para este usuário.'
    );
  }

  const { data: created, error: insertError } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      amount_cents: data.amount_cents,
      expense_date: data.expense_date,
      merchant: data.merchant ?? null,
      category_id: data.category_id,
      payment_method: data.payment_method ?? null,
      notes: data.notes ?? null,
      source: data.source,
      ai_confidence: data.ai_confidence ?? null,
    })
    .select(EXPENSE_SELECT)
    .single();

  if (insertError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível salvar a despesa.'
    );
  }

  return c.json(flattenExpense(created as unknown as RawJoinedExpense), 201);
});

expensesRoute.get('/expenses/:id', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  if (!isValidUuid(id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao consultar despesa.'
    );
  }

  if (!data) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  return c.json(flattenExpense(data as unknown as RawJoinedExpense));
});

expensesRoute.patch('/expenses/:id', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  if (!isValidUuid(id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  const rawBody = await c.req.json().catch(() => null);
  const parsed = updateExpenseSchema.safeParse(rawBody);

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados inválidos para atualização.'
    );
  }

  const { data: existingRow, error: fetchError } = await supabase
    .from('expenses')
    .select(
      'id, user_id, amount_cents, expense_date, merchant, category_id, payment_method, notes, source, ai_confidence'
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Erro ao consultar despesa.'
    );
  }

  if (!existingRow) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  const existing = existingRow as ExpenseRow;
  const d = parsed.data;

  if (d.expense_date && d.expense_date > getSaoPauloToday()) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      'A data da despesa não pode ser futura.'
    );
  }

  if (d.category_id && d.category_id !== existing.category_id) {
    if (!isValidUuid(d.category_id)) {
      return errorResponse(
        c,
        400,
        'INVALID_CATEGORY',
        'Categoria informada não pertence ao usuário.'
      );
    }

    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', d.category_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!cat) {
      return errorResponse(
        c,
        400,
        'INVALID_CATEGORY',
        'Categoria informada não pertence ao usuário.'
      );
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('expenses')
    .update({
      amount_cents: d.amount_cents ?? existing.amount_cents,
      expense_date: d.expense_date ?? existing.expense_date,
      merchant: d.merchant !== undefined ? d.merchant : existing.merchant,
      category_id: d.category_id ?? existing.category_id,
      payment_method:
        d.payment_method !== undefined
          ? d.payment_method
          : existing.payment_method,
      notes: d.notes !== undefined ? d.notes : existing.notes,
      source: d.source ?? existing.source,
      ai_confidence:
        d.ai_confidence !== undefined
          ? d.ai_confidence
          : existing.ai_confidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select(EXPENSE_SELECT)
    .single();

  if (updateError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível atualizar a despesa.'
    );
  }

  return c.json(flattenExpense(updated as unknown as RawJoinedExpense));
});

expensesRoute.delete('/expenses/:id', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  if (!isValidUuid(id)) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  const { count, error } = await supabase
    .from('expenses')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível excluir a despesa.'
    );
  }

  if (!count || count === 0) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Despesa não encontrada.');
  }

  return c.json({ deleted: true });
});
