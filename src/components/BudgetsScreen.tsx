import { AlertTriangle, Check, Loader2, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Budget } from '../types';
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
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdateLimit: (categoryId: string, budgetCents: number) => Promise<void>;
  onOpenSettings: () => void;
}

export function BudgetsScreen({
  month,
  budgets,
  loading,
  error,
  onRetry,
  onUpdateLimit,
  onOpenSettings,
}: BudgetsScreenProps) {
  const [draftCents, setDraftCents] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!budgets) return;
    setDraftCents((prev) => {
      const next: Record<string, number> = {};
      for (const b of budgets) {
        next[b.category_id] =
          prev[b.category_id] !== undefined
            ? prev[b.category_id]
            : b.budget_cents;
      }
      return next;
    });
  }, [budgets]);

  if (loading && !budgets) {
    return <BudgetsSkeleton />;
  }

  if (error && !budgets) {
    return <ErrorStateCard message={error} onRetry={onRetry} />;
  }

  const list = budgets ?? [];
  const totalBudgetCents = list.reduce((acc, b) => acc + b.budget_cents, 0);
  const totalSpentCents = list.reduce((acc, b) => acc + b.spent_cents, 0);
  const remainingTotalCents = totalBudgetCents - totalSpentCents;
  const daysRemainingInMonth = getDaysRemainingInMonth(month);

  const handleSaveLimit = async (categoryId: string, cents: number) => {
    setSavingId(categoryId);
    try {
      await onUpdateLimit(categoryId, cents);
      setSavedId(categoryId);
      setTimeout(() => {
        setSavedId((curr) => (curr === categoryId ? null : curr));
      }, 2200);
    } catch {
      // Erro já exibido pelo manipulador principal via toast
    } finally {
      setSavingId(null);
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
            Defina tetos mensais por categoria e salve suas metas
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Settings size={15} />
          <span>Gerenciar categorias</span>
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyStateCard
          variant="budgets"
          title="Nenhuma categoria encontrada"
          description="Crie sua primeira categoria em Configurações para definir limites de gastos mensais e acompanhar seu orçamento."
          actionLabel="Abrir configurações"
          onAction={onOpenSettings}
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
                  Consumido no mês
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
                  {daysRemainingInMonth === 1
                    ? 'dia restante'
                    : 'dias restantes'}
                  )
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((b) => {
              const currentDraftCents =
                draftCents[b.category_id] ?? b.budget_cents;
              const isDirty = currentDraftCents !== b.budget_cents;
              const isSaving = savingId === b.category_id;
              const isSaved = savedId === b.category_id && !isDirty;

              const hasBudget = b.budget_cents > 0;
              const pct = hasBudget ? Math.round(b.used_pct) : 0;
              const remainingCents = b.budget_cents - b.spent_cents;
              const dailySafeCents =
                hasBudget && daysRemainingInMonth > 0
                  ? Math.max(0, Math.round(remainingCents / daysRemainingInMonth))
                  : 0;
              const isOver = hasBudget && pct >= 100;
              const isWarn = hasBudget && pct >= 80 && pct < 100;
              const limitReais = Math.round(currentDraftCents / 100);
              const catColor = b.category_color || '#6366F1';

              return (
                <div
                  key={b.category_id}
                  className="tier-1-card rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CategoryIcon icon={b.category_icon} color={catColor} />
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {b.category_name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] tabular-financial">
                          {hasBudget ? (
                            <>
                              {pct}% utilizado
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              {remainingCents >= 0
                                ? `Livre: ${formatCurrencyInline(dailySafeCents)}/dia`
                                : `Excedido em ${formatCurrencyInline(
                                    Math.abs(remainingCents)
                                  )}`}
                            </>
                          ) : (
                            'Sem teto definido'
                          )}
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
                          {hasBudget
                            ? formatCurrencyInline(b.budget_cents)
                            : 'Livre'}
                        </strong>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            hasBudget
                              ? Math.min(pct, 100)
                              : b.spent_cents > 0
                              ? 100
                              : 0
                          }%`,
                          backgroundColor: isOver
                            ? '#F43F5E'
                            : isWarn
                            ? '#F59E0B'
                            : catColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                      <label
                        htmlFor={`budget-${b.category_id}`}
                        className="text-xs text-[var(--text-muted)] whitespace-nowrap"
                      >
                        Teto (R$)
                      </label>
                      <input
                        id={`budget-${b.category_id}`}
                        type="range"
                        min={0}
                        max={10000}
                        step={50}
                        value={Math.min(limitReais, 10000)}
                        onChange={(e) =>
                          setDraftCents((prev) => ({
                            ...prev,
                            [b.category_id]: Number(e.target.value) * 100,
                          }))
                        }
                        className="flex-1 min-w-[70px] accent-indigo-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={limitReais}
                        aria-label={`Valor do teto de ${b.category_name}`}
                        onChange={(e) =>
                          setDraftCents((prev) => ({
                            ...prev,
                            [b.category_id]:
                              Math.max(0, Number(e.target.value) || 0) * 100,
                          }))
                        }
                        className="w-20 h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-right tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!isDirty || isSaving}
                      onClick={() =>
                        handleSaveLimit(b.category_id, currentDraftCents)
                      }
                      className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isDirty
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)] opacity-60 cursor-default'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isSaved ? (
                        <Check size={13} />
                      ) : null}
                      <span>
                        {isSaving
                          ? 'Salvando...'
                          : isSaved
                          ? 'Salvo'
                          : 'Salvar'}
                      </span>
                    </button>
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
