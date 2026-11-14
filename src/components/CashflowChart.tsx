import { useMemo, useState } from 'react';
import type { Transaction } from '../types/finance';
import { formatCurrencyInline } from '../utils/format';

interface CashflowChartProps {
  transactions: Transaction[];
}

type PeriodKey = '7d' | '30d' | '6m';

interface ChartPoint {
  label: string;
  income: number;
  expense: number;
}

export function CashflowChart({ transactions }: CashflowChartProps) {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = useMemo<ChartPoint[]>(() => {
    if (period === '7d') {
      const days = [
        { date: '2026-11-08', label: '08/11' },
        { date: '2026-11-09', label: '09/11' },
        { date: '2026-11-10', label: '10/11' },
        { date: '2026-11-11', label: '11/11' },
        { date: '2026-11-12', label: '12/11' },
        { date: '2026-11-13', label: '13/11' },
        { date: '2026-11-14', label: 'Hoje' },
      ];
      return days.map((d) => {
        const dayTx = transactions.filter((t) => t.date.startsWith(d.date));
        return {
          label: d.label,
          income: dayTx
            .filter((t) => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0),
          expense: dayTx
            .filter((t) => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    if (period === '30d') {
      const weeks = [
        { label: 'Sem 1', start: 1, end: 5 },
        { label: 'Sem 2', start: 6, end: 10 },
        { label: 'Sem 3', start: 11, end: 14 },
        { label: 'Prev. Sem 4', start: 15, end: 22 },
      ];
      return weeks.map((w, i) => {
        if (i === 3) {
          return { label: w.label, income: 0, expense: 2720 };
        }
        const weekTx = transactions.filter((t) => {
          if (!t.date.startsWith('2026-11-')) return false;
          const day = Number(t.date.slice(8, 10));
          return day >= w.start && day <= w.end;
        });
        return {
          label: w.label,
          income: weekTx
            .filter((t) => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0),
          expense: weekTx
            .filter((t) => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }

    const novIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const novExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return [
      { label: 'Jun', income: 7400, expense: 4120 },
      { label: 'Jul', income: 7900, expense: 4590 },
      { label: 'Ago', income: 7400, expense: 3980 },
      { label: 'Set', income: 8200, expense: 4840 },
      { label: 'Out', income: 7400, expense: 4310 },
      { label: 'Nov', income: novIncome, expense: novExpense },
    ];
  }, [period, transactions]);

  const maxValue = useMemo(() => {
    const highest = Math.max(
      ...data.flatMap((d) => [d.income, d.expense]),
      500
    );
    return Math.ceil(highest / 500) * 500;
  }, [data]);

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  return (
    <section
      aria-label="Fluxo de caixa"
      className="tier-1-card rounded-2xl p-5 sm:p-6 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
            Fluxo de Caixa
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 tabular-financial">
            {activePoint ? (
              <>
                <span className="font-medium text-[var(--text-secondary)]">{activePoint.label}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="text-emerald-500 font-medium">
                  +{formatCurrencyInline(activePoint.income)}
                </span>
                <span className="mx-1.5" aria-hidden="true">/</span>
                <span className="text-rose-500 font-medium">
                  -{formatCurrencyInline(activePoint.expense)}
                </span>
              </>
            ) : (
              'Receitas comparadas às despesas no período'
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Período do gráfico"
          className="inline-flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]"
        >
          {(
            [
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '6m', label: '6M' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={period === tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                period === tab.id
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Bar Pair Visualization */}
      <div className="relative pt-2">
        <div className="grid gap-3 items-end h-44 sm:h-48" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((point, idx) => {
            const incomePct = Math.max((point.income / maxValue) * 100, point.income > 0 ? 6 : 2);
            const expensePct = Math.max((point.expense / maxValue) * 100, point.expense > 0 ? 6 : 2);
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={point.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                tabIndex={0}
                className="group flex flex-col items-center justify-end h-full outline-none cursor-pointer"
              >
                <div
                  className={`w-full max-w-[54px] flex-1 flex items-end justify-center gap-1.5 px-1.5 pb-2 rounded-xl transition-colors ${
                    isHovered ? 'bg-indigo-500/8' : ''
                  }`}
                >
                  {/* Income bar */}
                  <div className="w-full h-full flex items-end">
                    <div
                      className="w-full rounded-t-md bg-emerald-500/85 group-hover:bg-emerald-400 transition-all duration-200"
                      style={{ height: `${incomePct}%` }}
                      title={`Receitas (${point.label}): ${formatCurrencyInline(point.income)}`}
                    />
                  </div>
                  {/* Expense bar */}
                  <div className="w-full h-full flex items-end">
                    <div
                      className="w-full rounded-t-md bg-indigo-500/85 group-hover:bg-indigo-400 transition-all duration-200"
                      style={{ height: `${expensePct}%` }}
                      title={`Despesas (${point.label}): ${formatCurrencyInline(point.expense)}`}
                    />
                  </div>
                </div>
                <span
                  className={`mt-2 text-[11px] font-medium tabular-financial transition-colors ${
                    isHovered
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clean Legend */}
        <div className="flex items-center justify-end gap-5 mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" aria-hidden="true" />
            <span>Despesas</span>
          </div>
        </div>
      </div>
    </section>
  );
}
