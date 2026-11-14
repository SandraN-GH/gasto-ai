import { Sparkles, Trash2, Tag } from 'lucide-react';
import { CATEGORY_MAP, EXPENSE_CATEGORIES } from '../data/initialData';
import type { CategoryId, Transaction } from '../types/finance';
import { formatRelativeDate } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';
import { useState } from 'react';

interface TransactionRowProps {
  transaction: Transaction;
  onExplain?: (tx: Transaction) => void;
  onRecategorize?: (id: string, category: CategoryId) => void;
  onDelete?: (id: string) => void;
  onSelect?: (tx: Transaction) => void;
}

export function TransactionRow({
  transaction,
  onExplain,
  onRecategorize,
  onDelete,
  onSelect,
}: TransactionRowProps) {
  const [editingCat, setEditingCat] = useState(false);
  const category = CATEGORY_MAP[transaction.category];
  const isIncome = transaction.type === 'income';

  return (
    <div className="group relative flex items-center justify-between gap-3 min-h-[64px] py-2.5 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-2)]/70 transition-colors">
      <button
        type="button"
        onClick={() => onSelect?.(transaction)}
        className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        <CategoryIcon category={transaction.category} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
              {transaction.title}
            </p>
            {transaction.aiParsed && (
              <span
                className="text-[11px] font-medium text-indigo-400 shrink-0"
                title="Registrado via GastoIA"
              >
                IA
              </span>
            )}
          </div>
          {/* Clean unboxed metadata with typographic separators */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5 truncate">
            <span className="font-medium" style={{ color: category.textColor }}>
              {category.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeDate(transaction.date)}</span>
            <span aria-hidden="true">·</span>
            <span>{transaction.paymentMethod}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {/* Inline hover micro-actions */}
        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onExplain && (
            <button
              type="button"
              onClick={() => onExplain(transaction)}
              title="Explicar impacto com GastoIA"
              aria-label={`Explicar ${transaction.title} com IA`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/12 transition-colors cursor-pointer"
            >
              <Sparkles size={15} />
            </button>
          )}
          {onRecategorize && !isIncome && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setEditingCat((v) => !v)}
                title="Alterar categoria"
                aria-label={`Alterar categoria de ${transaction.title}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] transition-colors cursor-pointer"
              >
                <Tag size={15} />
              </button>
              {editingCat && (
                <div
                  className="absolute right-0 top-9 z-30 w-44 p-1.5 rounded-xl glass-surface shadow-xl"
                  onMouseLeave={() => setEditingCat(false)}
                >
                  {EXPENSE_CATEGORIES.map((catId) => (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => {
                        onRecategorize(transaction.id, catId);
                        setEditingCat(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                        transaction.category === catId
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-high)]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_MAP[catId].color }}
                      />
                      <span>{CATEGORY_MAP[catId].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              title="Excluir lançamento"
              aria-label={`Excluir ${transaction.title}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/12 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <CurrencyValue
          value={isIncome ? transaction.amount : -transaction.amount}
          size="md"
          showPlus={isIncome}
          className={
            isIncome
              ? 'text-emerald-500 dark:text-[#4edea3]'
              : 'text-[var(--text-primary)]'
          }
        />
      </div>
    </div>
  );
}
