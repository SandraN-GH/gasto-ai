import { useMemo, useState } from 'react';
import type { CashflowSeriesPoint } from '../types';
import { formatCurrencyInline } from '../utils/format';

interface CashflowChartProps {
  series7d: CashflowSeriesPoint[];
  series30d: CashflowSeriesPoint[];
  series6m: CashflowSeriesPoint[];
}

type PeriodKey = '7d' | '30d' | '6m';

export function CashflowChart({
  series7d,
  series30d,
  series6m,
}: CashflowChartProps) {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = useMemo<CashflowSeriesPoint[]>(() => {
    if (period === '7d') return series7d;
    if (period === '30d') return series30d;
    return series6m;
  }, [period, series7d, series30d, series6m]);

  const hasAnyMovement = useMemo(
    () => data.some((d) => d.income_cents > 0 || d.expense_cents > 0),
    [data]
  );

  const maxValue = useMemo(() => {
    const highest = Math.max(
      ...data.flatMap((d) => [d.income_cents, d.expense_cents]),
      10000
    );
    return Math.ceil(highest / 10000) * 10000;
  }, [data]);

  const activePoint =
    hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

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
            {hasAnyMovement && activePoint ? (
              <>
                <span className="font-medium text-[var(--text-secondary)]">
                  {activePoint.label}
                </span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="text-emerald-500 font-medium">
                  +{formatCurrencyInline(activePoint.income_cents)}
                </span>
                <span className="mx-1.5" aria-hidden="true">
                  /
                </span>
                <span className="text-rose-500 font-medium">
                  -{formatCurrencyInline(activePoint.expense_cents)}
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

      {!hasAnyMovement || data.length === 0 ? (
        <div className="h-44 sm:h-48 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border-subtle)] rounded-xl px-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Sem movimentações neste período
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Assim que você registrar receitas ou despesas, o comparativo aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="relative pt-2">
          <div
            className="grid gap-3 items-end h-44 sm:h-48"
            style={{
              gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
            }}
          >
            {data.map((point, idx) => {
              const incomePct = Math.max(
                (point.income_cents / maxValue) * 100,
                point.income_cents > 0 ? 6 : 2
              );
              const expensePct = Math.max(
                (point.expense_cents / maxValue) * 100,
                point.expense_cents > 0 ? 6 : 2
              );
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={point.date_key || point.label}
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
                    <div className="w-full h-full flex items-end">
                      <div
                        className="w-full rounded-t-md bg-emerald-500/85 group-hover:bg-emerald-400 transition-all duration-200"
                        style={{ height: `${incomePct}%` }}
                        title={`Receitas (${point.label}): ${formatCurrencyInline(
                          point.income_cents
                        )}`}
                      />
                    </div>
                    <div className="w-full h-full flex items-end">
                      <div
                        className="w-full rounded-t-md bg-indigo-500/85 group-hover:bg-indigo-400 transition-all duration-200"
                        style={{ height: `${expensePct}%` }}
                        title={`Despesas (${point.label}): ${formatCurrencyInline(
                          point.expense_cents
                        )}`}
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
      )}
    </section>
  );
}
