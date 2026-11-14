import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type {
  Category,
  DashboardData,
  Expense,
  ScreenId,
} from '../types';
import {
  formatCurrencyInline,
  formatDueDateBR,
  formatMonthLabel,
} from '../utils/format';
import { CashflowChart } from './CashflowChart';
import { CategoryIcon } from './CategoryIcon';
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
  onExplainExpense: (expense: Expense) => void;
  onRecategorize: (id: string, categoryId: string) => void;
  onDeleteExpense: (id: string) => void;
  onSelectExpense: (expense: Expense) => void;
  onPayScheduled: (id: string) => void;
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
  onExplainExpense,
  onRecategorize,
  onDeleteExpense,
  onSelectExpense,
  onPayScheduled,
}: OverviewScreenProps) {
  if (loading && !dashboard) {
    return <OverviewSkeleton />;
  }

  if (error && !dashboard) {
    return <ErrorStateCard message={error} onRetry={onRetry} />;
  }

  const isEmpty =
    !dashboard ||
    (dashboard.monthly_income_cents === 0 &&
      dashboard.monthly_expense_cents === 0 &&
      dashboard.recent_expenses.length === 0 &&
      dashboard.budgets.length === 0 &&
      dashboard.upcoming_scheduled.length === 0);

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <EmptyStateCard
          variant="overview"
          title="Sua visão geral está pronta para começar"
          description={`Nenhum lançamento registrado para ${formatMonthLabel(
            month
          )}. Adicione sua primeira receita ou despesa ou use o Assistente GastoIA ao lado.`}
          actionLabel="Registrar primeiro lançamento"
          onAction={onOpenNewModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartão principal de saldo */}
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
              Saldo consolidado · {formatMonthLabel(dashboard.month)}
            </p>
            <div className="mt-2">
              <CurrencyValue
                value={dashboard.balance_cents}
                size="display"
                className="text-[var(--text-primary)]"
              />
            </div>
            <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-muted)] tabular-financial">
              Taxa de economia mensal de{' '}
              <span
                className={`font-semibold ${
                  dashboard.savings_rate >= 20
                    ? 'text-emerald-500 dark:text-[#4edea3]'
                    : dashboard.savings_rate > 0
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {dashboard.savings_rate}%
              </span>{' '}
              sobre receitas líquidas
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-indigo-500/25 border-t border-white/20"
            >
              <Plus size={16} />
              <span>Novo lançamento</span>
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/12 text-emerald-500 dark:text-[#4edea3] flex items-center justify-center shrink-0">
                <ArrowDownLeft size={18} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Receitas do mês</p>
                <CurrencyValue
                  value={dashboard.monthly_income_cents}
                  size="lg"
                  className="text-emerald-500 dark:text-[#4edea3] mt-0.5"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:border-l sm:border-[var(--border-subtle)] sm:pl-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/12 text-rose-500 dark:text-[#ffb4ab] flex items-center justify-center shrink-0">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Despesas do mês</p>
                <CurrencyValue
                  value={dashboard.monthly_expense_cents}
                  size="lg"
                  className="text-[var(--text-primary)] mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico de fluxo de caixa */}
      <CashflowChart
        series7d={dashboard.cashflow_7d}
        series30d={dashboard.cashflow_30d}
        series6m={dashboard.cashflow_6m}
      />

      {/* Grade de limites e agendamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Limites por Categoria
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Acompanhamento mensal em tempo real
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Gerenciar</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {dashboard.budgets.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhum orçamento configurado para este mês.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('budgets')}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  Definir limites mensais
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.budgets.map((item) => {
                  const pct =
                    item.limit_cents > 0
                      ? Math.min(
                          Math.round((item.spent_cents / item.limit_cents) * 100),
                          100
                        )
                      : 0;
                  const rawPct =
                    item.limit_cents > 0
                      ? Math.round((item.spent_cents / item.limit_cents) * 100)
                      : 0;
                  const isOver = rawPct >= 100;
                  const isWarn = rawPct >= 80 && rawPct < 100;
                  const barColor = isOver
                    ? '#F43F5E'
                    : isWarn
                    ? '#F59E0B'
                    : item.category_color;

                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[var(--text-primary)]">
                          {item.category_name}
                        </span>
                        <span className="tabular-financial text-[var(--text-muted)]">
                          <strong className="text-[var(--text-primary)] font-semibold">
                            {formatCurrencyInline(item.spent_cents)}
                          </strong>{' '}
                          / {formatCurrencyInline(item.limit_cents)}
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
                  Transferências agendadas
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Próximos vencimentos previstos
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('scheduled')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Ver todas</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {dashboard.upcoming_scheduled.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhum pagamento agendado pendente.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('scheduled')}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  Agendar transferência
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {dashboard.upcoming_scheduled.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        slug={item.category_slug}
                        color={item.category_color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          Vence {formatDueDateBR(item.due_date)}
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          {item.auto_pay ? 'Débito automático' : 'Manual'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <CurrencyValue
                        value={item.amount_cents}
                        size="sm"
                        className="text-[var(--text-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => onPayScheduled(item.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-indigo-500/12 hover:border-indigo-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Últimos Lançamentos */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
              Últimos Lançamentos
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Toque em qualquer item para ver detalhes ou analisar com IA
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
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Você ainda não possui lançamentos neste mês.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {dashboard.recent_expenses.map((expense) => (
              <TransactionRow
                key={expense.id}
                expense={expense}
                categories={categories}
                onExplain={onExplainExpense}
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
