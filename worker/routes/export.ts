import { Hono } from 'hono';
import { errorResponse } from '../errors';
import type { Env, Variables } from '../types';

export const exportRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

interface ExportRow {
  expense_date: string;
  merchant: string | null;
  payment_method: string | null;
  amount_cents: number;
  source: string | null;
  notes: string | null;
  category?: { name: string | null } | { name: string | null }[] | null;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Neutraliza possível injeção de fórmula em planilhas
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

exportRoute.get('/export.csv', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('expenses')
    .select(
      'expense_date, merchant, payment_method, amount_cents, source, notes, category:categories(name)'
    )
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível exportar suas despesas.'
    );
  }

  const headers = [
    'Data',
    'Estabelecimento',
    'Categoria',
    'Pagamento',
    'Valor (R$)',
    'Origem',
    'Observações',
  ];

  const rows = ((data ?? []) as unknown as ExportRow[]).map((row) => {
    const [year, month, day] = row.expense_date.split('-');
    const brDate =
      year && month && day ? `${day}/${month}/${year}` : row.expense_date;
    const reais = (Number(row.amount_cents) / 100).toFixed(2).replace('.', ',');
    const catObj = Array.isArray(row.category) ? row.category[0] : row.category;

    return [
      escapeCsvCell(brDate),
      escapeCsvCell(row.merchant ?? ''),
      escapeCsvCell(catObj?.name ?? 'Outros'),
      escapeCsvCell(row.payment_method ?? ''),
      escapeCsvCell(reais),
      escapeCsvCell(row.source ?? 'manual'),
      escapeCsvCell(row.notes ?? ''),
    ].join(';');
  });

  const csvBody = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gastoia-despesas.csv"',
      'Cache-Control': 'no-store',
    },
  });
});
