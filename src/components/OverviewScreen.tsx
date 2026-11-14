import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { CATEGORY_MAP } from '../data/initialData';
import type {
  BudgetLimit,
  CategoryId,
  ScheduledTransfer,
  ScreenId,
  Transaction,
} from '../types/finance';
import { formatCurrencyInline, formatShortDueDate } from '../utils/format';
import { CashflowChart } from './CashflowChart';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';
import { TransactionRow } from './TransactionRow';

interface OverviewScreenProps {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactions: Transaction[];
  budgets: BudgetLimit[];
  scheduled: ScheduledTransfer[];
  onNavigate: (screen: ScreenId) => void;
  onOpenNewModal: () => void;
  onExplainTransaction: (tx: Transaction) => void;
  onRecategorize: (id: string, category: CategoryId) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onPayScheduled: (id: string) => void;
}

export function OverviewScreen({
  balance,
  monthlyIncome,
  monthlyExpenses,
  transactions,
  budgets,
  scheduled,
  onNavigate,
  onOpenNewModal,
  onExplainTransaction,
  onRecategorize,
  onDeleteTransaction,
  onSelectTransaction,
  onPayScheduled,
}: OverviewScreenProps) {
  const savingsRate =
    monthlyIncome > 0
      ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
      : 0;

  const upcomingScheduled = scheduled
    .filter((s) => s.status !== 'paid')
    .slice(0, 3);

  const recentTransactions = transactions.slice(0, 5);

  const categorySpendMap = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((acc, t) => acc + t.amount, 0);
    const pct = b.limit > 0 ? Math.min(Math.round((spent / b.limit) * 100), 100) : 0;
    const rawPct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
    return {
      ...b,
      spent,
      pct,
      rawPct,
      meta: CATEGORY_MAP[b.category],
    };
  });

  return (
    <div className="space-y-6">
      {/* Primary Hero Balance & Monthly Summary */}
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
              Saldo consolidado · Novembro 2026
            </p>
            <div className="mt-2">
              <CurrencyValue
                value={balance}
                size="display"
                className="text-[var(--text-primary)]"
              />
            </div>
            <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-muted)] tabular-financial">
              Taxa de economia mensal de{' '}
              <span
                className={`font-semibold ${
                  savingsRate >= 20
                    ? 'text-emerald-500 dark:text-[#4edea3]'
                    : savingsRate > 0
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {savingsRate}%
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

        {/* Inflow / Outflow clean hairline split */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/12 text-emerald-500 dark:text-[#4edea3] flex items-center justify-center shrink-0">
                <ArrowDownLeft size={18} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Receitas do mês</p>
                <CurrencyValue
                  value={monthlyIncome}
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
                  value={monthlyExpenses}
                  size="lg"
                  className="text-[var(--text-primary)] mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cashflow Visualization */}
      <CashflowChart transactions={transactions} />

      {/* Two-Column Balanced Grid: Budgets Snapshot & Scheduled Transfers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Category Budgets Snapshot */}
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

            <div className="space-y-4">
              {categorySpendMap.map((item) => {
                const isOver = item.rawPct >= 100;
                const isWarn = item.rawPct >= 80 && item.rawPct < 100;
                const barColor = isOver
                  ? '#F43F5E'
                  : isWarn
                  ? '#F59E0B'
                  : item.meta.color;

                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[var(--text-primary)]">
                        {item.meta.label}
                      </span>
                      <span className="tabular-financial text-[var(--text-muted)]">
                        <strong className="text-[var(--text-primary)] font-semibold">
                          {formatCurrencyInline(item.spent)}
                        </strong>{' '}
                        / {formatCurrencyInline(item.limit)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Scheduled Transfers Preview */}
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

            {upcomingScheduled.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarClock
                  size={28}
                  className="mx-auto text-[var(--text-muted)] mb-2"
                />
                <p className="text-sm text-[var(--text-muted)]">
                  Todas as contas do período estão pagas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {upcomingScheduled.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon category={item.category} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          Vence {formatShortDueDate(item.dueDate)}
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          {item.autoPay ? 'Débito automático' : 'Manual'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <CurrencyValue
                        value={item.amount}
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

      {/* Recent Transactions Ledger */}
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

        <div className="divide-y divide-[var(--border-subtle)]">
          {recentTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onExplain={onExplainTransaction}
              onRecategorize={onRecategorize}
              onDelete={onDeleteTransaction}
              onSelect={onSelectTransaction}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
