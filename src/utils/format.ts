import type { Expense } from '../types';

const SAO_PAULO_TZ = 'America/Sao_Paulo';

// Retorna a data atual (YYYY-MM-DD) no fuso America/Sao_Paulo
export function getSaoPauloDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

// Retorna o mês atual (YYYY-MM) no fuso America/Sao_Paulo
export function getCurrentSaoPauloMonth(): string {
  return getSaoPauloDateString().slice(0, 7);
}

// Retorna o timestamp ISO atual no fuso America/Sao_Paulo (YYYY-MM-DDTHH:mm)
export function getCurrentSaoPauloDateTime(): string {
  const now = new Date();
  const datePart = getSaoPauloDateString(now);
  const timePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return `${datePart}T${timePart}`;
}

export function getCurrentSaoPauloTimeLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

// Calcula dias restantes no mês de referência considerando America/Sao_Paulo
export function getDaysRemainingInMonth(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return 1;
  const lastDay = new Date(year, month, 0).getDate();
  const todayStr = getSaoPauloDateString();
  const currentMonth = todayStr.slice(0, 7);
  if (monthStr > currentMonth) return lastDay;
  if (monthStr < currentMonth) return 0;
  const currentDay = Number(todayStr.slice(8, 10));
  return Math.max(1, lastDay - currentDay + 1);
}

export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return monthStr;
  const date = new Date(year, month - 1, 1);
  const formatted = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Formata centavos inteiros para exibição em escala dupla (R$ menor + valor)
export function formatCurrencyParts(cents: number): {
  sign: string;
  symbol: string;
  number: string;
} {
  const absReais = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absReais);

  return {
    sign: cents < 0 ? '-' : '',
    symbol: 'R$',
    number: formatted,
  };
}

export function formatCurrencyInline(cents: number): string {
  const absReais = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absReais);
  return `${cents < 0 ? '-' : ''}R$ ${formatted}`;
}

// Formata data/hora com "Hoje"/"Ontem" no fuso America/Sao_Paulo e fallback dd/mm/aaaa
export function formatRelativeDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  const isValidDate = !Number.isNaN(parsed.getTime());

  const datePart = isValidDate
    ? getSaoPauloDateString(parsed)
    : isoDate.slice(0, 10);

  const timePart = isValidDate
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: SAO_PAULO_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(parsed)
    : isoDate.length >= 16
    ? isoDate.slice(11, 16)
    : '';

  const todayStr = getSaoPauloDateString(new Date());
  const yesterdayDate = new Date(Date.now() - 86_400_000);
  const yesterdayStr = getSaoPauloDateString(yesterdayDate);

  if (datePart === todayStr) {
    return timePart ? `Hoje, ${timePart}` : 'Hoje';
  }
  if (datePart === yesterdayStr) {
    return timePart ? `Ontem, ${timePart}` : 'Ontem';
  }

  const [year, month, day] = datePart.split('-');
  const ddmmaaaa =
    year && month && day ? `${day}/${month}/${year}` : datePart;
  return timePart ? `${ddmmaaaa}, ${timePart}` : ddmmaaaa;
}

// Formata YYYY-MM-DD como dd/mm/aaaa
export function formatDueDateBR(dateStr: string): string {
  const clean = dateStr.slice(0, 10);
  const [year, month, day] = clean.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function exportExpensesToCSV(
  expenses: Expense[],
  monthLabel: string
): void {
  const headers = [
    'Data',
    'Descrição',
    'Tipo',
    'Categoria',
    'Pagamento',
    'Valor (R$)',
    'Notas',
  ];
  const rows = expenses.map((e) => {
    const signedReais =
      (e.type === 'income' ? e.amount_cents : -e.amount_cents) / 100;
    return [
      formatRelativeDate(e.occurred_at),
      `"${e.title.replace(/"/g, '""')}"`,
      e.type === 'income' ? 'Receita' : 'Despesa',
      `"${(e.category_name ?? 'Outros').replace(/"/g, '""')}"`,
      e.payment_method,
      signedReais.toFixed(2).replace('.', ','),
      `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `gastoia-extrato-${monthLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
