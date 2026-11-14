import { useMemo, useState } from 'react';
import type { Budget } from '../types';
import { formatCurrencyInline } from '../utils/format';

interface CategoryDonutProps {
  categories: Budget[];
  totalCents: number;
}

export function CategoryDonut({ categories, totalCents }: CategoryDonutProps) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  const slices = useMemo(() => {
    const nonZero = categories.filter((c) => c.spent_cents > 0);
    if (nonZero.length === 0 || totalCents <= 0) return [];

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let cumulativeFraction = 0;

    return nonZero.map((cat) => {
      const fraction = cat.spent_cents / totalCents;
      const pct = Math.round(fraction * 1000) / 10;
      const dashLength = Math.max(fraction * circumference, 2);
      const offset = -cumulativeFraction * circumference;
      cumulativeFraction += fraction;

      return {
        category_id: cat.category_id,
        category_name: cat.category_name,
        color: cat.category_color || '#6366F1',
        spent_cents: cat.spent_cents,
        pct,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset: offset,
      };
    });
  }, [categories, totalCents]);

  const activeSlice = useMemo(
    () => slices.find((s) => s.category_id === activeCatId) ?? null,
    [slices, activeCatId]
  );

  return (
    <section
      aria-label="Distribuição por categoria"
      className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
    >
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
          Distribuição no mês
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Participação real de cada categoria nos gastos
        </p>
      </div>

      {slices.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border-subtle)] rounded-xl px-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Sem gastos neste mês
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            O gráfico de distribuição será preenchido automaticamente após a primeira despesa.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 148 148"
              className="w-full h-full -rotate-90"
              role="img"
              aria-label="Gráfico de distribuição de gastos por categoria"
            >
              <circle
                cx="74"
                cy="74"
                r="58"
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="18"
              />
              {slices.map((slice) => {
                const isActive =
                  activeCatId === null || activeCatId === slice.category_id;
                return (
                  <circle
                    key={slice.category_id}
                    cx="74"
                    cy="74"
                    r="58"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={activeCatId === slice.category_id ? 21 : 18}
                    strokeDasharray={slice.dashArray}
                    strokeDashoffset={slice.dashOffset}
                    opacity={isActive ? 1 : 0.35}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setActiveCatId(slice.category_id)}
                    onMouseLeave={() => setActiveCatId(null)}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
              <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[92px]">
                {activeSlice ? activeSlice.category_name : 'Total'}
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] tabular-financial">
                {formatCurrencyInline(
                  activeSlice ? activeSlice.spent_cents : totalCents
                )}
              </span>
              {activeSlice && (
                <span className="text-[11px] font-semibold text-indigo-400 tabular-financial">
                  {activeSlice.pct}%
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full space-y-2.5 min-w-0">
            {slices.map((slice) => (
              <button
                key={slice.category_id}
                type="button"
                onMouseEnter={() => setActiveCatId(slice.category_id)}
                onMouseLeave={() => setActiveCatId(null)}
                onFocus={() => setActiveCatId(slice.category_id)}
                onBlur={() => setActiveCatId(null)}
                className="w-full flex items-center justify-between gap-3 text-left rounded-lg px-2 py-1 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {slice.category_name}
                  </span>
                </div>
                <div className="text-xs tabular-financial shrink-0 text-right">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatCurrencyInline(slice.spent_cents)}
                  </span>
                  <span className="text-[var(--text-muted)] ml-1.5">
                    ({slice.pct}%)
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
