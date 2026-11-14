import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Category, Expense, PaymentMethod } from '../types';
import {
  formatRelativeDate,
  getCurrentSaoPauloDateTime,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface NewTransactionModalProps {
  open: boolean;
  categories: Category[];
  selectedExpense: Expense | null;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    amount_cents: number;
    type: 'expense' | 'income';
    category_id: string;
    payment_method: PaymentMethod;
    occurred_at: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateCategory: (id: string, categoryId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExplain: (expense: Expense) => Promise<string>;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Pix',
  'Crédito',
  'Débito',
  'Transferência',
  'Dinheiro',
];

export function NewTransactionModal({
  open,
  categories,
  selectedExpense,
  onClose,
  onCreate,
  onUpdateCategory,
  onDelete,
  onExplain,
}: NewTransactionModalProps) {
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    setExplanation(null);
    setExplaining(false);
  }, [selectedExpense, open]);

  useEffect(() => {
    if (type === 'expense' && expenseCategories.length > 0) {
      if (!expenseCategories.some((c) => c.id === categoryId)) {
        setCategoryId(expenseCategories[0].id);
      }
    } else if (type === 'income' && incomeCategories.length > 0) {
      if (!incomeCategories.some((c) => c.id === categoryId)) {
        setCategoryId(incomeCategories[0].id);
      }
    }
  }, [type, categories, categoryId, expenseCategories, incomeCategories]);

  if (!open) return null;

  const activeCategories =
    type === 'expense' ? expenseCategories : incomeCategories;
  const effectiveCategoryId =
    categoryId || activeCategories[0]?.id || categories[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericReais = Number(amount.replace(',', '.'));
    if (!title.trim() || !numericReais || numericReais <= 0 || !effectiveCategoryId) {
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        amount_cents: Math.round(numericReais * 100),
        type,
        category_id: effectiveCategoryId,
        payment_method: paymentMethod,
        occurred_at: getCurrentSaoPauloDateTime(),
        notes: notes.trim() || undefined,
      });

      setTitle('');
      setAmount('');
      setNotes('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestExplanation = async () => {
    if (!selectedExpense) return;
    setExplaining(true);
    const result = await onExplain(selectedExpense);
    setExplanation(result);
    setExplaining(false);
  };

  const selectedCat = categories.find(
    (c) => c.id === selectedExpense?.category_id
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={selectedExpense ? 'Detalhes do lançamento' : 'Novo lançamento'}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl glass-surface p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto sm:hidden" />

        {selectedExpense ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <CategoryIcon
                  slug={
                    selectedExpense.category_slug ??
                    selectedCat?.slug ??
                    (selectedExpense.type === 'income' ? 'income' : 'other')
                  }
                  color={
                    selectedExpense.category_color ??
                    selectedCat?.color ??
                    '#64748B'
                  }
                />
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedExpense.title}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedExpense.category_name ??
                      selectedCat?.name ??
                      'Outros'}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    {formatRelativeDate(selectedExpense.occurred_at)}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    {selectedExpense.payment_method}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 border-y border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Valor do lançamento
              </span>
              <CurrencyValue
                value={
                  selectedExpense.type === 'income'
                    ? selectedExpense.amount_cents
                    : -selectedExpense.amount_cents
                }
                size="lg"
                showPlus={selectedExpense.type === 'income'}
                className={
                  selectedExpense.type === 'income'
                    ? 'text-emerald-500 dark:text-[#4edea3]'
                    : 'text-[var(--text-primary)]'
                }
              />
            </div>

            {selectedExpense.notes && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
                  Observações
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedExpense.notes}
                </p>
              </div>
            )}

            {selectedExpense.type === 'expense' &&
              expenseCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">
                    Categoria
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {expenseCategories.map((cat) => {
                      const active = selectedExpense.category_id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            onUpdateCategory(selectedExpense.id, cat.id)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'text-white'
                              : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                          style={
                            active ? { backgroundColor: cat.color } : undefined
                          }
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {explanation && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-sm text-[var(--text-primary)] leading-relaxed">
                <p className="text-xs font-semibold text-indigo-400 mb-1">
                  Análise GastoIA
                </p>
                {explanation}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await onDelete(selectedExpense.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Excluir</span>
              </button>

              <button
                type="button"
                onClick={handleRequestExplanation}
                disabled={explaining}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {explaining ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>
                  {explaining ? 'Analisando...' : 'Explicar impacto com IA'}
                </span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Novo lançamento
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-high)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Receita
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Descrição do lançamento"
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Forma de pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {activeCategories.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Categoria
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          effectiveCategoryId === cat.id
                            ? 'text-white'
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        style={
                          effectiveCategoryId === cat.id
                            ? { backgroundColor: cat.color }
                            : undefined
                        }
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !effectiveCategoryId}
                className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {submitting ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
