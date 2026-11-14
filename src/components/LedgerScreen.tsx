import { Download, Plus, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import type { Category, Expense, ExpenseFilters } from '../types';
import { exportExpensesToCSV } from '../utils/format';
import { CurrencyValue } from './CurrencyValue';
import {
  EmptyStateCard,
  ErrorStateCard,
  LedgerSkeleton,
} from './ScreenStates';
import { TransactionRow } from './TransactionRow';

interface LedgerScreenProps {
  month: string;
  expenses: Expense[] | null;
  categories: Category[];
  filters: ExpenseFilters;
  loading: boolean;
  error: string | null;
  onFiltersChange: (next: ExpenseFilters) => void;
  onRetry: () => void;
  onOpenNewModal: () => void;
  onExplainExpense: (expense: Expense) => void;
  onRecategorize: (id: string, categoryId: string) => void;
  onDeleteExpense: (id: string) => void;
  onSelectExpense: (expense: Expense) => void;
}

export function LedgerScreen({
  month,
  expenses,
  categories,
  filters,
  loading,
  error,
  onFiltersChange,
  onRetry,
  onOpenNewModal,
  onExplainExpense,
  onRecategorize,
  onDeleteExpense,
  onSelectExpense,
}: LedgerScreenProps) {
  const list = expenses ?? [];

  const totals = useMemo(() => {
    const inflow = list
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount_cents, 0);
    const outflow = list
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount_cents, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [list]);

  const hasActiveFilter =
    Boolean(filters.search?.trim()) ||
    (filters.type && filters.type !== 'all') ||
    (filters.category_id && filters.category_id !== 'all');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Extrato
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Histórico detalhado de entradas e saídas
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={list.length === 0}
            onClick={() => exportExpensesToCSV(list, month)}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:bg-indigo-500/8 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <section className="tier-1-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={filters.search ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              placeholder="Buscar por estabelecimento, Pix, nota..."
              aria-label="Buscar lançamentos"
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filtrar por tipo"
            className="inline-flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] shrink-0"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'expense', label: 'Despesas' },
                { id: 'income', label: 'Receitas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={(filters.type ?? 'all') === tab.id}
                onClick={() => onFiltersChange({ ...filters, type: tab.id })}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  (filters.type ?? 'all') === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros por categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() =>
              onFiltersChange({ ...filters, category_id: 'all' })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !filters.category_id || filters.category_id === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--canvas)]'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas categorias
          </button>
          {categories.map((cat) => {
            const active = filters.category_id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onFiltersChange({ ...filters, category_id: cat.id })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={active ? { backgroundColor: cat.color } : undefined}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Totais filtrados */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div>
            <span className="text-[var(--text-muted)] block">
              Entradas ({list.filter((t) => t.type === 'income').length})
            </span>
            <CurrencyValue
              value={totals.inflow}
              size="sm"
              className="text-emerald-500 dark:text-[#4edea3] mt-0.5"
            />
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">
              Saídas ({list.filter((t) => t.type === 'expense').length})
            </span>
            <CurrencyValue
              value={totals.outflow}
              size="sm"
              className="text-rose-500 dark:text-[#ffb4ab] mt-0.5"
            />
          </div>
          <div className="text-right">
            <span className="text-[var(--text-muted)] block">Resultado</span>
            <CurrencyValue
              value={totals.net}
              size="sm"
              showPlus={totals.net > 0}
              className="text-[var(--text-primary)] mt-0.5"
            />
          </div>
        </div>
      </section>

      {/* Estados: Carregando, Erro, Vazio ou Lista */}
      {loading && !expenses ? (
        <LedgerSkeleton />
      ) : error ? (
        <ErrorStateCard message={error} onRetry={onRetry} />
      ) : list.length === 0 ? (
        <EmptyStateCard
          variant="ledger"
          title={
            hasActiveFilter
              ? 'Nenhum lançamento encontrado'
              : 'Seu extrato está vazio'
          }
          description={
            hasActiveFilter
              ? 'Nenhum item corresponde aos filtros selecionados. Experimente limpar a busca ou escolher outra categoria.'
              : 'Registre seu primeiro gasto ou receita manualmente ou pelo Assistente GastoIA.'
          }
          actionLabel={
            hasActiveFilter ? 'Limpar filtros' : 'Novo lançamento'
          }
          onAction={
            hasActiveFilter
              ? () =>
                  onFiltersChange({
                    month: filters.month,
                    search: '',
                    type: 'all',
                    category_id: 'all',
                  })
              : onOpenNewModal
          }
        />
      ) : (
        <section className="tier-1-card rounded-2xl p-5 sm:p-6">
          <div className="divide-y divide-[var(--border-subtle)]">
            {list.map((expense) => (
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
        </section>
      )}
    </div>
  );
}
