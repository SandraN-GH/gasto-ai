import { Download, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORY_MAP, EXPENSE_CATEGORIES } from '../data/initialData';
import type { CategoryId, Transaction } from '../types/finance';
import { exportTransactionsToCSV } from '../utils/format';
import { CurrencyValue } from './CurrencyValue';
import { TransactionRow } from './TransactionRow';

interface LedgerScreenProps {
  transactions: Transaction[];
  onOpenNewModal: () => void;
  onExplainTransaction: (tx: Transaction) => void;
  onRecategorize: (id: string, category: CategoryId) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export function LedgerScreen({
  transactions,
  onOpenNewModal,
  onExplainTransaction,
  onRecategorize,
  onDeleteTransaction,
  onSelectTransaction,
}: LedgerScreenProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryId>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchMethod = t.paymentMethod.toLowerCase().includes(q);
        const matchNotes = (t.notes ?? '').toLowerCase().includes(q);
        if (!matchTitle && !matchMethod && !matchNotes) return false;
      }
      return true;
    });
  }, [transactions, query, typeFilter, categoryFilter]);

  const totals = useMemo(() => {
    const inflow = filtered
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const outflow = filtered
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

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
            onClick={() => exportTransactionsToCSV(filtered)}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:bg-indigo-500/8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

      {/* Filter & Search Bar */}
      <section className="tier-1-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por estabelecimento, Pix, nota..."
              aria-label="Buscar lançamentos"
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
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
                aria-selected={typeFilter === tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Category Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--canvas)]'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas categorias
          </button>
          {[...EXPENSE_CATEGORIES, 'income' as const].map((catId) => {
            const meta = CATEGORY_MAP[catId];
            const active = categoryFilter === catId;
            return (
              <button
                key={catId}
                type="button"
                onClick={() => setCategoryFilter(catId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={active ? { backgroundColor: meta.color } : undefined}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Filtered Totals Strip */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div>
            <span className="text-[var(--text-muted)] block">Entradas ({filtered.filter((t) => t.type === 'income').length})</span>
            <CurrencyValue
              value={totals.inflow}
              size="sm"
              className="text-emerald-500 dark:text-[#4edea3] mt-0.5"
            />
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">Saídas ({filtered.filter((t) => t.type === 'expense').length})</span>
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

      {/* Ledger List */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Nenhum lançamento encontrado para os filtros aplicados.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Tente limpar a busca ou registre uma nova movimentação.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-high)] transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((tx) => (
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
        )}
      </section>
    </div>
  );
}
