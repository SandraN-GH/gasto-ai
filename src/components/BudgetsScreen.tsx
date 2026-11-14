import { AlertTriangle, Check, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import type { Budget, BudgetRecommendation, Category } from '../types';
import {
  formatCurrencyInline,
  getDaysRemainingInMonth,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';
import {
  BudgetsSkeleton,
  EmptyStateCard,
  ErrorStateCard,
} from './ScreenStates';

interface BudgetsScreenProps {
  month: string;
  budgets: Budget[] | null;
  categories: Category[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdateLimit: (categoryId: string, limitCents: number) => Promise<void>;
}

export function BudgetsScreen({
  month,
  budgets,
  categories,
  loading,
  error,
  onRetry,
  onUpdateLimit,
}: BudgetsScreenProps) {
  const [optimizing, setOptimizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>(
    []
  );
  const [appliedNames, setAppliedNames] = useState<Record<string, boolean>>({});
  const [savingCatId, setSavingCatId] = useState<string | null>(null);

  if (loading && !budgets) {
    return <BudgetsSkeleton />;
  }

  if (error && !budgets) {
    return <ErrorStateCard message={error} onRetry={onRetry} />;
  }

  const list = budgets ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const totalBudgetCents = list.reduce((acc, b) => acc + b.limit_cents, 0);
  const totalSpentCents = list.reduce((acc, b) => acc + b.spent_cents, 0);
  const remainingTotalCents = totalBudgetCents - totalSpentCents;
  const daysRemainingInMonth = getDaysRemainingInMonth(month);

  const handleOptimizeWithAI = async () => {
    setOptimizing(true);
    setAiError(null);
    setAppliedNames({});

    try {
      const data = await api.optimizeBudgets(month);
      setAiSummary(data.summary);
      setRecommendations(data.recommendations ?? []);
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao GastoIA.'
      );
    } finally {
      setOptimizing(false);
    }
  };

  const applyRecommendation = async (rec: BudgetRecommendation) => {
    const matched = list.find(
      (b) =>
        b.id === rec.category_id ||
        b.category_name.toLowerCase() === rec.category_name.toLowerCase()
    );
    if (matched) {
      await onUpdateLimit(
        matched.category_id,
        Math.max(5000, Math.round(rec.suggested_limit_cents))
      );
      setAppliedNames((prev) => ({ ...prev, [rec.category_name]: true }));
    }
  };

  const handleInitializeDefaultBudgets = async () => {
    if (expenseCategories.length === 0) return;
    setSavingCatId(expenseCategories[0].id);
    try {
      await onUpdateLimit(expenseCategories[0].id, 100000);
    } finally {
      setSavingCatId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Orçamentos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Ajuste tetos mensais e receba sugestões inteligentes
          </p>
        </div>

        <button
          type="button"
          onClick={handleOptimizeWithAI}
          disabled={optimizing || list.length === 0}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          {optimizing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>{optimizing ? 'Analisando...' : 'Otimizar com IA'}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyStateCard
          variant="budgets"
          title="Nenhum orçamento definido neste mês"
          description="Defina limites de gastos por categoria para acompanhar o ritmo do seu mês e receber alertas antes de ultrapassar o teto."
          actionLabel={
            expenseCategories.length > 0
              ? savingCatId
                ? 'Criando...'
                : `Definir teto para ${expenseCategories[0].name}`
              : undefined
          }
          onAction={
            expenseCategories.length > 0
              ? handleInitializeDefaultBudgets
              : undefined
          }
        />
      ) : (
        <>
          <section className="tier-1-card rounded-2xl p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Teto mensal planejado
                </p>
                <CurrencyValue
                  value={totalBudgetCents}
                  size="lg"
                  className="text-[var(--text-primary)] mt-1"
                />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Consumido até hoje
                </p>
                <CurrencyValue
                  value={totalSpentCents}
                  size="lg"
                  className="text-[var(--text-primary)] mt-1"
                />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Disponível ({daysRemainingInMonth}{' '}
                  {daysRemainingInMonth === 1 ? 'dia restante' : 'dias restantes'})
                </p>
                <CurrencyValue
                  value={remainingTotalCents}
                  size="lg"
                  className={`mt-1 ${
                    remainingTotalCents >= 0
                      ? 'text-emerald-500 dark:text-[#4edea3]'
                      : 'text-rose-500 dark:text-[#ffb4ab]'
                  }`}
                />
              </div>
            </div>
          </section>

          {aiError && (
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-400">
              {aiError}
            </div>
          )}

          {aiSummary && (
            <section className="tier-1-card rounded-2xl p-5 sm:p-6 border-indigo-500/30 bg-indigo-500/[0.04] space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Diagnóstico GastoIA
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {aiSummary}
                  </p>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="divide-y divide-[var(--border-subtle)] pt-2">
                  {recommendations.map((rec) => {
                    const applied = appliedNames[rec.category_name];
                    return (
                      <div
                        key={rec.category_name}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {rec.category_name}{' '}
                            <span className="text-indigo-400 font-mono-tabular">
                              → {formatCurrencyInline(rec.suggested_limit_cents)}
                            </span>
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {rec.reason}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={applied}
                          onClick={() => applyRecommendation(rec)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            applied
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                          }`}
                        >
                          {applied && <Check size={14} />}
                          <span>{applied ? 'Aplicado' : 'Aplicar limite'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((b) => {
              const pct =
                b.limit_cents > 0
                  ? Math.round((b.spent_cents / b.limit_cents) * 100)
                  : 0;
              const remainingCents = b.limit_cents - b.spent_cents;
              const dailySafeCents =
                daysRemainingInMonth > 0
                  ? Math.max(0, Math.round(remainingCents / daysRemainingInMonth))
                  : 0;
              const isOver = pct >= 100;
              const isWarn = pct >= 80 && pct < 100;
              const limitReais = Math.round(b.limit_cents / 100);

              return (
                <div
                  key={b.id}
                  className="tier-1-card rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        slug={b.category_slug}
                        color={b.category_color}
                      />
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {b.category_name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] tabular-financial">
                          {pct}% utilizado
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          {remainingCents >= 0
                            ? `Livre: ${formatCurrencyInline(dailySafeCents)}/dia`
                            : `Excedido em ${formatCurrencyInline(
                                Math.abs(remainingCents)
                              )}`}
                        </p>
                      </div>
                    </div>

                    {(isOver || isWarn) && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          isOver ? 'text-rose-500' : 'text-amber-500'
                        }`}
                      >
                        <AlertTriangle size={14} />
                        <span>{isOver ? 'Acima' : 'Atenção'}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-2 tabular-financial">
                      <span className="text-[var(--text-muted)]">
                        Gasto:{' '}
                        <strong className="text-[var(--text-primary)]">
                          {formatCurrencyInline(b.spent_cents)}
                        </strong>
                      </span>
                      <span className="text-[var(--text-muted)]">
                        Teto:{' '}
                        <strong className="text-[var(--text-primary)]">
                          {formatCurrencyInline(b.limit_cents)}
                        </strong>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isOver
                            ? '#F43F5E'
                            : isWarn
                            ? '#F59E0B'
                            : b.category_color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <label
                      htmlFor={`budget-${b.id}`}
                      className="text-xs text-[var(--text-muted)] whitespace-nowrap"
                    >
                      Ajustar teto (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`budget-${b.id}`}
                        type="range"
                        min={50}
                        max={10000}
                        step={50}
                        value={limitReais}
                        onChange={(e) =>
                          onUpdateLimit(
                            b.category_id,
                            Number(e.target.value) * 100
                          )
                        }
                        className="w-24 sm:w-28 accent-indigo-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={50}
                        step={50}
                        value={limitReais}
                        aria-label={`Valor do teto de ${b.category_name}`}
                        onChange={(e) =>
                          onUpdateLimit(
                            b.category_id,
                            Math.max(50, Number(e.target.value) || 50) * 100
                          )
                        }
                        className="w-20 h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-right tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
