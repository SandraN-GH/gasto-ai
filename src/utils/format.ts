import type { Transaction } from '../types/finance';

export function formatCurrencyParts(value: number): {
  sign: string;
  symbol: string;
  number: string;
} {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return {
    sign: value < 0 ? '-' : '',
    symbol: 'R$',
    number: formatted,
  };
}

export function formatCurrencyInline(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${value < 0 ? '-' : ''}R$ ${formatted}`;
}

export function formatRelativeDate(isoDate: string): string {
  const datePart = isoDate.slice(0, 10);
  const timePart = isoDate.length >= 16 ? isoDate.slice(11, 16) : '';

  if (datePart === '2026-11-14') {
    return timePart ? `Hoje, ${timePart}` : 'Hoje';
  }
  if (datePart === '2026-11-13') {
    return timePart ? `Ontem, ${timePart}` : 'Ontem';
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  const formatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  return timePart ? `${formatted}, ${timePart}` : formatted;
}

export function formatShortDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Pagamento', 'Valor (BRL)', 'Notas'];
  const rows = transactions.map((t) => [
    t.date.replace('T', ' '),
    `"${t.title.replace(/"/g, '""')}"`,
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.category,
    t.paymentMethod,
    (t.type === 'income' ? t.amount : -t.amount).toFixed(2).replace('.', ','),
    `"${(t.notes ?? '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `gastoia-extrato-2026-11.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
