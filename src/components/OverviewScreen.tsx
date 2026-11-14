import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Info,
  Lightbulb,
  Plus,
  Store,
  TrendingDown,
} from 'lucide-react';
import type { Category, DashboardData, Expense, ScreenId } from '../types';
import { formatCurrencyInline, formatMonthLabel } from '../utils/format';
import { CashflowChart } from './CashflowChart';
import { CategoryDonut } from './CategoryDonut';
import { CurrencyValue } from './CurrencyValue';
import {
  EmptyStateCard,
  ErrorStateCard,
  OverviewSkeleton,
} from './ScreenStates';
import { TransactionRow } from './TransactionRow';

interface OverviewScreenProps {
  month: string;
  dashboard: DashboardData | null;
  categories: Category[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenNewModal: () => void;
  onRecategorize: (id: string, categoryId: string) => void;
  onDeleteExpense: (id: string) => void;
  onSelectExpense: (expense: Expense) => void;
}

export function OverviewScreen({
  month,
  dashboard,
  categories,
  loading,
  error,
  onRetry,
  onNavigate,
  onOpenNewModal,
  onRecategorize,
  onDeleteExpense,
  onSelectExpense,
}: OverviewScreenProps) {
  if (loading && !dashboard) {
    return <OverviewSkeleton />;
  }

  if (error && !dashboard) {
    return <ErrorStateCard message={error} onRetry={onRetry} />;
  }

  const isEmpty =
    !dashboard ||
    (dashboard.total_cents === 0 &&
      dashboard.previous_month_cents === 0 &&
      dashboard.recent_expenses.length === 0);

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <EmptyStateCard
          variant="overview"
          title="Nenhuma despesa registrada neste mês"
          description={`Você ainda não lançou despesas em ${formatMonthLabel(
            month
          )}. Envie uma foto de nota fiscal, digite um gasto natural ou preencha manualmente.`}
          actionLabel="Adicionar primeira despesa"
          onAction={onOpenNewModal}
        />
      </div>
    );
  }

  const variation = dashboard.variation_pct ?? 0;
  const variationUp = variation > 0;
  const insights = dashboard.insights ?? [];

  return (
    <div className="space-y-6">
      {/* Cartão principal de gastos do mês */}
      <section
        aria-label="Resumo financeiro"
        className="tier-1-card rounded-2xl p-5 sm:p-7 relative overflow-hidden"
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(16,185,129,0.15) 60%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
              Total gasto · {formatMonthLabel(dashboard.month)}
            </p>
            <div className="mt-2">
              <CurrencyValue
                value={dashboard.total_cents}
                size="display"
                className="text-[var(--text-primary)]"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)] tabular-financial">
              <span>
                Mês anterior:{' '}
                <strong className="text-[var(--text-secondary)]">
                  {formatCurrencyInline(dashboard.previous_month_cents)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  variation === 0
                    ? 'text-[var(--text-muted)]'
                    : variationUp
                    ? 'text-rose-500 dark:text-[#ffb4ab]'
                    : 'text-emerald-500 dark:text-[#4edea3]'
                }`}
              >
                {variation !== 0 &&
                  (variationUp ? (
                    <ArrowUpRight size={15} />
                  ) : (
                    <ArrowDownRight size={15} />
                  ))}
                <span>
                  {variation > 0 ? `+${variation}%` : `${variation}%`} vs. mês
                  anterior
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-indigo-500/25 border-t border-white/20"
            >
              <Plus size={16} />
              <span>Adicionar despesa</span>
            </button>
          </div>
        </div>
      </section>

      {/* Insights gerados por regras determinísticas (oculto se não houver dados suficientes) */}
      {insights.length > 0 && (
        <section
          aria-label="Insights do mês"
          className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={17} className="text-indigo-400" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Insights do mês
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((item) => {
              const iconEl =
                item.severity === 'alert' || item.severity === 'warning' ? (
                  <AlertTriangle
                    size={16}
                    className={
                      item.severity === 'alert'
                        ? 'text-rose-500 shrink-0 mt-0.5'
                        : 'text-amber-500 shrink-0 mt-0.5'
                    }
                  />
                ) : item.severity === 'positive' ? (
                  <TrendingDown
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                ) : (
                  <Info
                    size={16}
                    className="text-indigo-400 shrink-0 mt-0.5"
                  />
                );

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-start gap-3"
                >
                  {iconEl}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Gráficos reais: tendência diária + donut por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <CashflowChart dailySeries={dashboard.daily_series} />
        <CategoryDonut
          categories={dashboard.by_category}
          totalCents={dashboard.total_cents}
        />
      </div>

      {/* Categorias & Principais estabelecimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Gastos por Categoria
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Orçamento e consumo mensal
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Orçamentos</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {dashboard.by_category.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                Nenhuma categoria encontrada.
              </p>
            ) : (
              <div className="space-y-4">
                {dashboard.by_category.map((item) => {
                  const pct =
                    item.budget_cents > 0
                      ? Math.min(Math.round(item.used_pct), 100)
                      : item.spent_cents > 0
                      ? 100
                      : 0;
                  const isOver = item.budget_cents > 0 && item.used_pct >= 100;
                  const isWarn =
                    item.budget_cents > 0 &&
                    item.used_pct >= 80 &&
                    item.used_pct < 100;
                  const barColor = isOver
                    ? '#F43F5E'
                    : isWarn
                    ? '#F59E0B'
                    : item.category_color || '#6366F1';

                  return (
                    <div key={item.category_id}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[var(--text-primary)]">
                          {item.category_name}
                        </span>
                        <span className="tabular-financial text-[var(--text-muted)]">
                          <strong className="text-[var(--text-primary)] font-semibold">
                            {formatCurrencyInline(item.spent_cents)}
                          </strong>
                          {item.budget_cents > 0
                            ? ` / ${formatCurrencyInline(item.budget_cents)} (${item.used_pct}%)`
                            : ' (sem teto)'}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Principais estabelecimentos
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Onde você mais concentrou gastos no mês
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Relatórios</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {dashboard.top_merchants.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                Nenhum estabelecimento registrado neste mês.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {dashboard.top_merchants.map((m) => (
                  <div
                    key={m.merchant}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                        <Store size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {m.merchant}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] tabular-financial">
                          {m.count}{' '}
                          {m.count === 1 ? 'lançamento' : 'lançamentos'}
                        </p>
                      </div>
                    </div>
                    <CurrencyValue
                      value={m.total_cents}
                      size="sm"
                      className="text-[var(--text-primary)] shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5 Últimas despesas */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
              Últimas despesas
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Toque em qualquer despesa para ver detalhes, reclassificar ou editar
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ledger')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Extrato completo</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {dashboard.recent_expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            Sem despesas neste mês.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {dashboard.recent_expenses.map((expense) => (
              <TransactionRow
                key={expense.id}
                expense={expense}
                categories={categories}
                onRecategorize={onRecategorize}
                onDelete={onDeleteExpense}
                onSelect={onSelectExpense}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
