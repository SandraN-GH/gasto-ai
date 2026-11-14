import { Download, Loader2, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Category, Expense, ExpenseFilters } from '../types';
import { CurrencyValue } from './CurrencyValue';
import {
  EmptyStateCard,
  ErrorStateCard,
  LedgerSkeleton,
} from './ScreenStates';
import { TransactionRow } from './TransactionRow';

interface LedgerScreenProps {
  expenses: Expense[] | null;
  categories: Category[];
  filters: ExpenseFilters;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onFiltersChange: (next: ExpenseFilters) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onExportCsv: () => Promise<void>;
  onOpenNewModal: () => void;
  onRecategorize: (id: string, categoryId: string) => void;
  onDeleteExpense: (id: string) => void;
  onSelectExpense: (expense: Expense) => void;
}

export function LedgerScreen({
  expenses,
  categories,
  filters,
  loading,
  loadingMore,
  hasMore,
  error,
  onFiltersChange,
  onRetry,
  onLoadMore,
  onExportCsv,
  onOpenNewModal,
  onRecategorize,
  onDeleteExpense,
  onSelectExpense,
}: LedgerScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [minReaisText, setMinReaisText] = useState(
    filters.min !== undefined ? String(filters.min / 100) : ''
  );
  const [maxReaisText, setMaxReaisText] = useState(
    filters.max !== undefined ? String(filters.max / 100) : ''
  );

  const list = expenses ?? [];

  const totalOutflowCents = useMemo(
    () => list.reduce((acc, item) => acc + item.amount_cents, 0),
    [list]
  );

  const hasActiveFilter =
    Boolean(filters.q?.trim()) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.min !== undefined ||
    filters.max !== undefined ||
    Boolean(filters.category && filters.category !== 'all');

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExportCsv();
    } finally {
      setExporting(false);
    }
  };

  const handleMinChange = (raw: string) => {
    setMinReaisText(raw);
    const num = Number(raw.replace(',', '.'));
    const nextMin =
      raw.trim() && Number.isFinite(num) && num >= 0
        ? Math.round(num * 100)
        : undefined;
    onFiltersChange({ ...filters, min: nextMin });
  };

  const handleMaxChange = (raw: string) => {
    setMaxReaisText(raw);
    const num = Number(raw.replace(',', '.'));
    const nextMax =
      raw.trim() && Number.isFinite(num) && num > 0
        ? Math.round(num * 100)
        : undefined;
    onFiltersChange({ ...filters, max: nextMax });
  };

  const handleClearFilters = () => {
    setMinReaisText('');
    setMaxReaisText('');
    onFiltersChange({
      q: '',
      from: '',
      to: '',
      min: undefined,
      max: undefined,
      category: 'all',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Extrato
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Busca, filtros por período, categoria e faixa de valor
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={list.length === 0 || exporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:bg-indigo-500/8 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {exporting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar despesa</span>
          </button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <section className="tier-1-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={filters.q ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, q: e.target.value })
              }
              placeholder="Buscar por estabelecimento ou observação..."
              aria-label="Buscar despesas"
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, q: '' })}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de período e faixa de valor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label
              htmlFor="ledger-from"
              className="block text-[var(--text-muted)] font-medium mb-1"
            >
              Data inicial
            </label>
            <input
              id="ledger-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, from: e.target.value })
              }
              className="w-full h-10 px-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="ledger-to"
              className="block text-[var(--text-muted)] font-medium mb-1"
            >
              Data final
            </label>
            <input
              id="ledger-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, to: e.target.value })
              }
              className="w-full h-10 px-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="ledger-min"
              className="block text-[var(--text-muted)] font-medium mb-1"
            >
              Valor mínimo (R$)
            </label>
            <input
              id="ledger-min"
              type="number"
              min="0"
              step="0.01"
              value={minReaisText}
              onChange={(e) => handleMinChange(e.target.value)}
              placeholder="0,00"
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="ledger-max"
              className="block text-[var(--text-muted)] font-medium mb-1"
            >
              Valor máximo (R$)
            </label>
            <input
              id="ledger-max"
              type="number"
              min="0"
              step="0.01"
              value={maxReaisText}
              onChange={(e) => handleMaxChange(e.target.value)}
              placeholder="Sem limite"
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filtros por categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, category: 'all' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !filters.category || filters.category === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--canvas)]'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas categorias
          </button>
          {categories.map((cat) => {
            const active = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onFiltersChange({ ...filters, category: cat.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={
                  active
                    ? { backgroundColor: cat.color ?? '#6366F1' }
                    : undefined
                }
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Resumo dos resultados carregados */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-3">
            <span>
              <span className="text-[var(--text-muted)]">
                Despesas listadas:{' '}
              </span>
              <strong className="text-[var(--text-primary)] tabular-financial">
                {list.length}
              </strong>
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Total filtrado:</span>
            <CurrencyValue
              value={totalOutflowCents}
              size="sm"
              className="text-[var(--text-primary)]"
            />
          </div>
        </div>
      </section>

      {/* Estados: Carregando, Erro, Vazio ou Lista */}
      {loading && !expenses ? (
        <LedgerSkeleton />
      ) : error && !expenses ? (
        <ErrorStateCard message={error} onRetry={onRetry} />
      ) : list.length === 0 ? (
        <EmptyStateCard
          variant="ledger"
          title={
            hasActiveFilter
              ? 'Nenhuma despesa encontrada'
              : 'Seu extrato está vazio'
          }
          description={
            hasActiveFilter
              ? 'Nenhum lançamento corresponde aos filtros atuais. Limpe a busca ou ajuste o intervalo de datas e valores.'
              : 'Registre sua primeira despesa por foto de nota fiscal, texto natural ou formulário manual.'
          }
          actionLabel={
            hasActiveFilter ? 'Limpar filtros' : 'Adicionar despesa'
          }
          onAction={hasActiveFilter ? handleClearFilters : onOpenNewModal}
        />
      ) : (
        <section className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="divide-y divide-[var(--border-subtle)]">
            {list.map((expense) => (
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

          {hasMore && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={onLoadMore}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                <span>{loadingMore ? 'Carregando...' : 'Carregar mais'}</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
