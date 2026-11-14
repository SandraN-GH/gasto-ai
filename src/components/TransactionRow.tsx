import { Check, Tag, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Category, Expense } from '../types';
import { formatRelativeDate } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface TransactionRowProps {
  expense: Expense;
  categories: Category[];
  onRecategorize?: (id: string, categoryId: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (expense: Expense) => void;
}

export function TransactionRow({
  expense,
  categories,
  onRecategorize,
  onDelete,
  onSelect,
}: TransactionRowProps) {
  const [editingCat, setEditingCat] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const matchedCat = categories.find((c) => c.id === expense.category_id);
  const catName = expense.category_name ?? matchedCat?.name ?? 'Outros';
  const catIcon = expense.category_icon ?? matchedCat?.icon ?? 'tag';
  const catColor = expense.category_color ?? matchedCat?.color ?? '#64748B';
  const title = expense.merchant?.trim() || catName;

  return (
    <div className="group relative flex items-center justify-between gap-3 min-h-[64px] py-2.5 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-2)]/70 transition-colors">
      <button
        type="button"
        onClick={() => onSelect?.(expense)}
        className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        <CategoryIcon icon={catIcon} color={catColor} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
              {title}
            </p>
            {(expense.source === 'image' || expense.source === 'text') && (
              <span
                className="text-[11px] font-medium text-indigo-400 shrink-0"
                title="Extraído com Workers AI"
              >
                IA
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5 truncate">
            <span className="font-medium" style={{ color: catColor }}>
              {catName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeDate(expense.expense_date)}</span>
            {expense.payment_method && (
              <>
                <span aria-hidden="true">·</span>
                <span>{expense.payment_method}</span>
              </>
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {confirmingDelete && onDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete(expense.id);
              }}
              aria-label={`Confirmar exclusão de ${title}`}
              className="h-8 px-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check size={13} />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancelar exclusão"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            {onRecategorize && categories.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEditingCat((v) => !v)}
                  title="Reclassificar categoria"
                  aria-label={`Reclassificar categoria de ${title}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] transition-colors cursor-pointer"
                >
                  <Tag size={15} />
                </button>
                {editingCat && (
                  <div
                    className="absolute right-0 top-9 z-30 w-48 p-1.5 rounded-xl glass-surface shadow-xl"
                    onMouseLeave={() => setEditingCat(false)}
                  >
                    <p className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
                      Reclassificar para
                    </p>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onRecategorize(expense.id, cat.id);
                          setEditingCat(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          expense.category_id === cat.id
                            ? 'bg-indigo-500/15 text-indigo-400'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-high)]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color ?? '#64748B' }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                title="Excluir despesa"
                aria-label={`Excluir ${title}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/12 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}

        <CurrencyValue
          value={-expense.amount_cents}
          size="md"
          className="text-[var(--text-primary)]"
        />
      </div>
    </div>
  );
}
