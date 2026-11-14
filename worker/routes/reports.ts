import { Hono } from 'hono';
import { errorResponse } from '../errors';
import { reportsQuerySchema } from '../schemas';
import type { CategoryRow, Env, ExpenseRow, Variables } from '../types';

export const reportsRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

function getSaoPauloToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function getDefaultRange(period: 'week' | 'month' | 'year'): {
  from: string;
  to: string;
} {
  const today = getSaoPauloToday();
  const [y, m, d] = today.split('-').map(Number);

  if (period === 'week') {
    const end = new Date(Date.UTC(y, m - 1, d));
    const start = new Date(end.getTime() - 6 * 86_400_000);
    return {
      from: start.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (period === 'year') {
    return {
      from: `${y}-01-01`,
      to: `${y}-12-31`,
    };
  }

  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

reportsRoute.get('/reports', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const parsed = reportsQuerySchema.safeParse({
    period: c.req.query('period'),
    from: c.req.query('from'),
    to: c.req.query('to'),
  });

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Parâmetros de relatório inválidos.'
    );
  }

  const { period } = parsed.data;
  const defaults = getDefaultRange(period);
  const from = parsed.data.from ?? defaults.from;
  const to = parsed.data.to ?? defaults.to;

  if (from > to) {
    return errorResponse(
      c,
      400,
      'INVALID_DATE_RANGE',
      'A data inicial não pode ser posterior à data final.'
    );
  }

  const [categoriesRes, expensesRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, color, icon')
      .eq('user_id', userId)
      .order('name', { ascending: true }),

    supabase
      .from('expenses')
      .select('amount_cents, expense_date, merchant, category_id')
      .eq('user_id', userId)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date', { ascending: true }),
  ]);

  if (categoriesRes.error || expensesRes.error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível gerar os relatórios.'
    );
  }

  const categories = (categoriesRes.data ?? []) as Pick<
    CategoryRow,
    'id' | 'name' | 'color' | 'icon'
  >[];
  const expenses = (expensesRes.data ?? []) as Pick<
    ExpenseRow,
    'amount_cents' | 'expense_date' | 'merchant' | 'category_id'
  >[];

  let totalCents = 0;
  const catAgg = new Map<string, { total_cents: number; count: number }>();
  const seriesAgg = new Map<string, { total_cents: number; count: number }>();
  const merchantAgg = new Map<string, { total_cents: number; count: number }>();

  for (const exp of expenses) {
    const amount = Number(exp.amount_cents);
    totalCents += amount;

    const cPrev = catAgg.get(exp.category_id) ?? { total_cents: 0, count: 0 };
    cPrev.total_cents += amount;
    cPrev.count += 1;
    catAgg.set(exp.category_id, cPrev);

    const bucket =
      period === 'year' ? exp.expense_date.slice(0, 7) : exp.expense_date;
    const sPrev = seriesAgg.get(bucket) ?? { total_cents: 0, count: 0 };
    sPrev.total_cents += amount;
    sPrev.count += 1;
    seriesAgg.set(bucket, sPrev);

    const merchantName = exp.merchant?.trim() || 'Sem estabelecimento';
    const mPrev = merchantAgg.get(merchantName) ?? { total_cents: 0, count: 0 };
    mPrev.total_cents += amount;
    mPrev.count += 1;
    merchantAgg.set(merchantName, mPrev);
  }

  const count = expenses.length;
  const averageCents = count > 0 ? Math.round(totalCents / count) : 0;

  const byCategory = categories
    .map((cat) => {
      const agg = catAgg.get(cat.id) ?? { total_cents: 0, count: 0 };
      return {
        category_id: cat.id,
        category_name: cat.name,
        category_color: cat.color,
        category_icon: cat.icon,
        total_cents: agg.total_cents,
        count: agg.count,
      };
    })
    .sort((a, b) => {
      if (b.total_cents !== a.total_cents) return b.total_cents - a.total_cents;
      return a.category_name.localeCompare(b.category_name, 'pt-BR');
    });

  const series = Array.from(seriesAgg.entries())
    .map(([bucket, stats]) => ({
      bucket,
      total_cents: stats.total_cents,
      count: stats.count,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  const topMerchants = Array.from(merchantAgg.entries())
    .map(([merchant, stats]) => ({
      merchant,
      total_cents: stats.total_cents,
      count: stats.count,
    }))
    .sort((a, b) => b.total_cents - a.total_cents)
    .slice(0, 10);

  return c.json({
    period,
    from,
    to,
    summary: {
      total_cents: totalCents,
      count,
      average_cents: averageCents,
    },
    by_category: byCategory,
    series,
    top_merchants: topMerchants,
  });
});
