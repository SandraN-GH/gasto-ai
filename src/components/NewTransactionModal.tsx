import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CATEGORY_MAP, EXPENSE_CATEGORIES } from '../data/initialData';
import type { CategoryId, PaymentMethod, Transaction } from '../types/finance';
import { formatRelativeDate } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface NewTransactionModalProps {
  open: boolean;
  selectedTransaction: Transaction | null;
  onClose: () => void;
  onCreate: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateCategory: (id: string, category: CategoryId) => void;
  onDelete: (id: string) => void;
  onExplain: (tx: Transaction) => Promise<string>;
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
  selectedTransaction,
  onClose,
  onCreate,
  onUpdateCategory,
  onDelete,
  onExplain,
}: NewTransactionModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryId>('food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');
  const [notes, setNotes] = useState('');

  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    setExplanation(null);
    setExplaining(false);
  }, [selectedTransaction, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(',', '.'));
    if (!title.trim() || !numeric || numeric <= 0) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    onCreate({
      title: title.trim(),
      amount: numeric,
      type,
      category: type === 'income' ? 'income' : category,
      paymentMethod,
      date: `2026-11-14T${hh}:${mm}`,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setAmount('');
    setNotes('');
    onClose();
  };

  const handleRequestExplanation = async () => {
    if (!selectedTransaction) return;
    setExplaining(true);
    const result = await onExplain(selectedTransaction);
    setExplanation(result);
    setExplaining(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={
        selectedTransaction ? 'Detalhes do lançamento' : 'Novo lançamento'
      }
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl glass-surface p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto sm:hidden" />

        {selectedTransaction ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <CategoryIcon category={selectedTransaction.category} />
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedTransaction.title}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {CATEGORY_MAP[selectedTransaction.category].label}
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    {formatRelativeDate(selectedTransaction.date)}
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    {selectedTransaction.paymentMethod}
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
                  selectedTransaction.type === 'income'
                    ? selectedTransaction.amount
                    : -selectedTransaction.amount
                }
                size="lg"
                showPlus={selectedTransaction.type === 'income'}
                className={
                  selectedTransaction.type === 'income'
                    ? 'text-emerald-500 dark:text-[#4edea3]'
                    : 'text-[var(--text-primary)]'
                }
              />
            </div>

            {selectedTransaction.notes && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
                  Observações
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedTransaction.notes}
                </p>
              </div>
            )}

            {selectedTransaction.type === 'expense' && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">
                  Categoria
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map((catId) => {
                    const active = selectedTransaction.category === catId;
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() =>
                          onUpdateCategory(selectedTransaction.id, catId)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'text-white'
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        style={
                          active
                            ? { backgroundColor: CATEGORY_MAP[catId].color }
                            : undefined
                        }
                      >
                        {CATEGORY_MAP[catId].label}
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
                onClick={() => {
                  onDelete(selectedTransaction.id);
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

            {/* Expense / Income Toggle */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  if (category === 'income') setCategory('food');
                }}
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
                onClick={() => {
                  setType('income');
                  setCategory('income');
                }}
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
                  placeholder="Ex: Café da manhã, Salário, Farmácia"
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

              {type === 'expense' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Categoria
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXPENSE_CATEGORIES.map((catId) => (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => setCategory(catId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          category === catId
                            ? 'text-white'
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        style={
                          category === catId
                            ? { backgroundColor: CATEGORY_MAP[catId].color }
                            : undefined
                        }
                      >
                        {CATEGORY_MAP[catId].label}
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
                className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                Salvar lançamento
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
