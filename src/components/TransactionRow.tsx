import { Sparkles, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Category, Expense } from '../types';
import { formatRelativeDate } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface TransactionRowProps {
  expense: Expense;
  categories: Category[];
  onExplain?: (expense: Expense) => void;
  onRecategorize?: (id: string, categoryId: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (expense: Expense) => void;
}

export function TransactionRow({
  expense,
  categories,
  onExplain,
  onRecategorize,
  onDelete,
  onSelect,
}: TransactionRowProps) {
  const [editingCat, setEditingCat] = useState(false);
  const isIncome = expense.type === 'income';

  const matchedCat = categories.find((c) => c.id === expense.category_id);
  const catName =
    expense.category_name ?? matchedCat?.name ?? (isIncome ? 'Receitas' : 'Outros');
  const catSlug =
    expense.category_slug ?? matchedCat?.slug ?? (isIncome ? 'income' : 'other');
  const catColor =
    expense.category_color ?? matchedCat?.color ?? (isIncome ? '#10B981' : '#64748B');

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="group relative flex items-center justify-between gap-3 min-h-[64px] py-2.5 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-2)]/70 transition-colors">
      <button
        type="button"
        onClick={() => onSelect?.(expense)}
        className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        <CategoryIcon slug={catSlug} color={catColor} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
              {expense.title}
            </p>
            {expense.ai_parsed && (
              <span
                className="text-[11px] font-medium text-indigo-400 shrink-0"
                title="Registrado via GastoIA"
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
            <span>{formatRelativeDate(expense.occurred_at)}</span>
            <span aria-hidden="true">·</span>
            <span>{expense.payment_method}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onExplain && (
            <button
              type="button"
              onClick={() => onExplain(expense)}
              title="Explicar impacto com GastoIA"
              aria-label={`Explicar ${expense.title} com IA`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/12 transition-colors cursor-pointer"
            >
              <Sparkles size={15} />
            </button>
          )}
          {onRecategorize && !isIncome && expenseCategories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setEditingCat((v) => !v)}
                title="Alterar categoria"
                aria-label={`Alterar categoria de ${expense.title}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] transition-colors cursor-pointer"
              >
                <Tag size={15} />
              </button>
              {editingCat && (
                <div
                  className="absolute right-0 top-9 z-30 w-44 p-1.5 rounded-xl glass-surface shadow-xl"
                  onMouseLeave={() => setEditingCat(false)}
                >
                  {expenseCategories.map((cat) => (
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
                        style={{ backgroundColor: cat.color }}
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
              onClick={() => onDelete(expense.id)}
              title="Excluir lançamento"
              aria-label={`Excluir ${expense.title}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/12 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <CurrencyValue
          value={isIncome ? expense.amount_cents : -expense.amount_cents}
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
