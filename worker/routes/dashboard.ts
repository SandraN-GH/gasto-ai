import { Hono } from 'hono';
import { errorResponse } from '../errors';
import { dashboardQuerySchema } from '../schemas';
import type { CategoryRow, Env, ExpenseRow, Variables } from '../types';

export const dashboardRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

interface DashboardInsight {
  id: string;
  kind: 'budget_alert' | 'category_variation' | 'largest_expense';
  severity: 'info' | 'warning' | 'alert' | 'positive';
  title: string;
  description: string;
}

function getSaoPauloCurrentMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${y}-${m}`;
}

function getPreviousMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthBounds(monthStr: string): {
  start: string;
  end: string;
  daysInMonth: number;
} {
  const [y, m] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  };
}

function formatCentsBRL(cents: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(cents) / 100);
  return `${cents < 0 ? '-' : ''}R$ ${formatted}`;
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

dashboardRoute.get('/dashboard', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const parsed = dashboardQuerySchema.safeParse({ month: c.req.query('month') });

  if (!parsed.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Mês inválido.'
    );
  }

  const month = parsed.data.month ?? getSaoPauloCurrentMonth();
  const prevMonth = getPreviousMonth(month);
  const { start, end, daysInMonth } = getMonthBounds(month);
  const { start: prevStart, end: prevEnd } = getMonthBounds(prevMonth);

  const [categoriesRes, currentExpensesRes, prevExpensesRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, icon, color, budget_cents')
      .eq('user_id', userId)
      .order('name', { ascending: true }),

    supabase
      .from('expenses')
      .select(
        'id, amount_cents, expense_date, merchant, category_id, payment_method, notes, source, ai_confidence, created_at'
      )
      .eq('user_id', userId)
      .gte('expense_date', start)
      .lte('expense_date', end)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('expenses')
      .select('category_id, amount_cents')
      .eq('user_id', userId)
      .gte('expense_date', prevStart)
      .lte('expense_date', prevEnd),
  ]);

  if (
    categoriesRes.error ||
    currentExpensesRes.error ||
    prevExpensesRes.error
  ) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível carregar os dados do painel.'
    );
  }

  const categories = (categoriesRes.data ?? []) as Pick<
    CategoryRow,
    'id' | 'name' | 'icon' | 'color' | 'budget_cents'
  >[];
  const currentExpenses = (currentExpensesRes.data ?? []) as ExpenseRow[];
  const prevExpenses = (prevExpensesRes.data ?? []) as Pick<
    ExpenseRow,
    'category_id' | 'amount_cents'
  >[];

  const categoryMap = new Map<string, (typeof categories)[number]>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  let totalCents = 0;
  const spentByCategory = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  const merchantMap = new Map<string, { count: number; total_cents: number }>();

  let largestExpense: {
    id: string;
    amount_cents: number;
    expense_date: string;
    label: string;
  } | null = null;

  for (const exp of currentExpenses) {
    const amount = Number(exp.amount_cents);
    totalCents += amount;

    spentByCategory.set(
      exp.category_id,
      (spentByCategory.get(exp.category_id) ?? 0) + amount
    );

    dailyMap.set(
      exp.expense_date,
      (dailyMap.get(exp.expense_date) ?? 0) + amount
    );

    const merchantLabel = exp.merchant?.trim() || 'Sem estabelecimento';
    const prevM = merchantMap.get(merchantLabel) ?? {
      count: 0,
      total_cents: 0,
    };
    prevM.count += 1;
    prevM.total_cents += amount;
    merchantMap.set(merchantLabel, prevM);

    const catName = categoryMap.get(exp.category_id)?.name ?? 'Despesa';
    if (
      !largestExpense ||
      amount > largestExpense.amount_cents ||
      (amount === largestExpense.amount_cents &&
        exp.expense_date > largestExpense.expense_date)
    ) {
      largestExpense = {
        id: exp.id,
        amount_cents: amount,
        expense_date: exp.expense_date,
        label: exp.merchant?.trim() || catName,
      };
    }
  }

  let previousMonthCents = 0;
  const prevCatMap = new Map<string, number>();
  for (const exp of prevExpenses) {
    const amount = Number(exp.amount_cents);
    previousMonthCents += amount;
    prevCatMap.set(
      exp.category_id,
      (prevCatMap.get(exp.category_id) ?? 0) + amount
    );
  }

  let variationPct: number | null = null;
  if (previousMonthCents > 0) {
    variationPct = Number(
      (((totalCents - previousMonthCents) / previousMonthCents) * 100).toFixed(1)
    );
  } else if (totalCents > 0) {
    variationPct = 100;
  } else {
    variationPct = 0;
  }

  const byCategory = categories
    .map((cat) => {
      const budgetCents = Number(cat.budget_cents);
      const spentCents = spentByCategory.get(cat.id) ?? 0;
      return {
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon,
        category_color: cat.color,
        budget_cents: budgetCents,
        spent_cents: spentCents,
        used_pct:
          budgetCents > 0
            ? Number(((spentCents / budgetCents) * 100).toFixed(1))
            : 0,
      };
    })
    .sort((a, b) => {
      if (b.spent_cents !== a.spent_cents) return b.spent_cents - a.spent_cents;
      return a.category_name.localeCompare(b.category_name, 'pt-BR');
    });

  // Insights determinísticos por regras (sem IA)
  const insights: DashboardInsight[] = [];

  const budgetAlerts = byCategory
    .filter((cat) => cat.budget_cents > 0 && cat.used_pct >= 80)
    .sort((a, b) => b.used_pct - a.used_pct)
    .slice(0, 2);

  for (const cat of budgetAlerts) {
    const isOver = cat.used_pct >= 100;
    const diffCents = cat.spent_cents - cat.budget_cents;
    insights.push({
      id: `budget-${cat.category_id}`,
      kind: 'budget_alert',
      severity: isOver ? 'alert' : 'warning',
      title: isOver
        ? `Orçamento de ${cat.category_name} excedido`
        : `${cat.category_name} acima de 80% do teto`,
      description: isOver
        ? `Consumido ${cat.used_pct}% (${formatCentsBRL(cat.spent_cents)} de ${formatCentsBRL(cat.budget_cents)}, excesso de ${formatCentsBRL(diffCents)}).`
        : `Já foram utilizados ${cat.used_pct}% do limite mensal (${formatCentsBRL(cat.spent_cents)} de ${formatCentsBRL(cat.budget_cents)}).`,
    });
  }

  let topVariation: {
    category_id: string;
    category_name: string;
    pct: number;
    diffCents: number;
  } | null = null;

  for (const cat of byCategory) {
    const prevSpent = prevCatMap.get(cat.category_id) ?? 0;
    if (prevSpent <= 0 || cat.spent_cents <= 0) continue;
    const diffCents = cat.spent_cents - prevSpent;
    const pct = Math.round((diffCents / prevSpent) * 100);
    if (Math.abs(pct) >= 15 && Math.abs(diffCents) >= 2000) {
      if (
        !topVariation ||
        Math.abs(diffCents) > Math.abs(topVariation.diffCents)
      ) {
        topVariation = {
          category_id: cat.category_id,
          category_name: cat.category_name,
          pct,
          diffCents,
        };
      }
    }
  }

  if (topVariation) {
    const increased = topVariation.diffCents > 0;
    insights.push({
      id: `var-${topVariation.category_id}`,
      kind: 'category_variation',
      severity: increased ? 'warning' : 'positive',
      title: increased
        ? `Alta em ${topVariation.category_name}`
        : `Redução em ${topVariation.category_name}`,
      description: increased
        ? `Subiu ${topVariation.pct}% em relação ao mês anterior (+${formatCentsBRL(topVariation.diffCents)}).`
        : `Caiu ${Math.abs(topVariation.pct)}% em comparação ao mês anterior (-${formatCentsBRL(Math.abs(topVariation.diffCents))}).`,
    });
  }

  if (currentExpenses.length >= 2 && largestExpense) {
    const sharePct =
      totalCents > 0
        ? Math.round((largestExpense.amount_cents / totalCents) * 100)
        : 0;
    insights.push({
      id: `largest-${largestExpense.id}`,
      kind: 'largest_expense',
      severity: 'info',
      title: 'Maior despesa do mês',
      description: `${largestExpense.label} em ${formatDateBR(
        largestExpense.expense_date
      )}: ${formatCentsBRL(largestExpense.amount_cents)} (${sharePct}% do total mensal).`,
    });
  }

  const dailySeries = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayStr = `${month}-${String(idx + 1).padStart(2, '0')}`;
    return {
      date: dayStr,
      total_cents: dailyMap.get(dayStr) ?? 0,
    };
  });

  const recentExpenses = currentExpenses.slice(0, 5).map((exp) => {
    const cat = categoryMap.get(exp.category_id);
    return {
      ...exp,
      amount_cents: Number(exp.amount_cents),
      category_name: cat?.name ?? null,
      category_icon: cat?.icon ?? null,
      category_color: cat?.color ?? null,
    };
  });

  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, stats]) => ({
      merchant,
      count: stats.count,
      total_cents: stats.total_cents,
    }))
    .sort((a, b) => b.total_cents - a.total_cents)
    .slice(0, 5);

  return c.json({
    month,
    total_cents: totalCents,
    previous_month_cents: previousMonthCents,
    variation_pct: variationPct,
    by_category: byCategory,
    daily_series: dailySeries,
    recent_expenses: recentExpenses,
    top_merchants: topMerchants,
    insights,
  });
});
