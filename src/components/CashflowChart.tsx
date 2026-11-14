import { useMemo, useState } from 'react';
import type { DailySeriesPoint } from '../types';
import { formatCurrencyInline, formatDueDateBR } from '../utils/format';

interface CashflowChartProps {
  dailySeries: DailySeriesPoint[];
}

export function CashflowChart({ dailySeries }: CashflowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasAnyMovement = useMemo(
    () => dailySeries.some((d) => d.total_cents > 0),
    [dailySeries]
  );

  const maxValue = useMemo(() => {
    const highest = Math.max(...dailySeries.map((d) => d.total_cents), 10000);
    return Math.ceil(highest / 5000) * 5000;
  }, [dailySeries]);

  const activePoint =
    hoveredIdx !== null
      ? dailySeries[hoveredIdx]
      : dailySeries.find((d) => d.total_cents > 0) ??
        dailySeries[dailySeries.length - 1];

  return (
    <section
      aria-label="Série diária de gastos"
      className="tier-1-card rounded-2xl p-5 sm:p-6 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
            Evolução diária no mês
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 tabular-financial">
            {hasAnyMovement && activePoint ? (
              <>
                <span className="font-medium text-[var(--text-secondary)]">
                  {formatDueDateBR(activePoint.date)}
                </span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="text-indigo-400 font-semibold">
                  {formatCurrencyInline(activePoint.total_cents)}
                </span>
              </>
            ) : (
              'Distribuição dos gastos ao longo dos dias'
            )}
          </p>
        </div>
      </div>

      {!hasAnyMovement || dailySeries.length === 0 ? (
        <div className="h-44 sm:h-48 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border-subtle)] rounded-xl px-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Sem gastos registrados neste mês
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Assim que você lançar sua primeira despesa, o gráfico diário aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="relative pt-2 overflow-x-auto">
          <div
            className="grid gap-1 items-end h-44 sm:h-48 min-w-[460px]"
            style={{
              gridTemplateColumns: `repeat(${dailySeries.length}, minmax(0, 1fr))`,
            }}
          >
            {dailySeries.map((point, idx) => {
              const pct =
                point.total_cents > 0
                  ? Math.max((point.total_cents / maxValue) * 100, 8)
                  : 3;
              const isHovered = hoveredIdx === idx;
              const dayNumber = point.date.slice(8, 10);
              const showLabel =
                idx === 0 ||
                idx === dailySeries.length - 1 ||
                Number(dayNumber) % 5 === 0;

              return (
                <div
                  key={point.date}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  tabIndex={0}
                  className="group flex flex-col items-center justify-end h-full outline-none cursor-pointer"
                >
                  <div className="w-full flex-1 flex items-end justify-center px-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all duration-150 ${
                        point.total_cents > 0
                          ? isHovered
                            ? 'bg-indigo-400'
                            : 'bg-indigo-500/80'
                          : 'bg-[var(--surface-2)]'
                      }`}
                      style={{ height: `${pct}%` }}
                      title={`${formatDueDateBR(point.date)}: ${formatCurrencyInline(
                        point.total_cents
                      )}`}
                    />
                  </div>
                  <span
                    className={`mt-2 text-[10px] font-medium tabular-financial ${
                      isHovered
                        ? 'text-[var(--text-primary)]'
                        : showLabel
                        ? 'text-[var(--text-muted)]'
                        : 'text-transparent'
                    }`}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
