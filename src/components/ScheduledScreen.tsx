import { CalendarCheck, CheckCircle2, Clock, Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_MAP, EXPENSE_CATEGORIES } from '../data/initialData';
import type { CategoryId, ScheduledTransfer } from '../types/finance';
import { formatShortDueDate } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface ScheduledScreenProps {
  scheduled: ScheduledTransfer[];
  onPayScheduled: (id: string) => void;
  onToggleAutoPay: (id: string) => void;
  onAddScheduled: (item: Omit<ScheduledTransfer, 'id' | 'status'>) => void;
}

export function ScheduledScreen({
  scheduled,
  onPayScheduled,
  onToggleAutoPay,
  onAddScheduled,
}: ScheduledScreenProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-28');
  const [category, setCategory] = useState<Exclude<CategoryId, 'income'>>('other');
  const [recurrence, setRecurrence] = useState<'Mensal' | 'Única' | 'Anual'>('Mensal');
  const [autoPay, setAutoPay] = useState(true);

  const pendingTotal = scheduled
    .filter((s) => s.status !== 'paid')
    .reduce((acc, s) => acc + s.amount, 0);

  const paidTotal = scheduled
    .filter((s) => s.status === 'paid')
    .reduce((acc, s) => acc + s.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(',', '.'));
    if (!title.trim() || !numeric || numeric <= 0) return;

    onAddScheduled({
      title: title.trim(),
      recipient: recipient.trim() || title.trim(),
      amount: numeric,
      category,
      dueDate,
      recurrence,
      autoPay,
    });

    setTitle('');
    setRecipient('');
    setAmount('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Transferências agendadas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Contas recorrentes, Pix programados e débitos automáticos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>{showAddForm ? 'Fechar formulário' : 'Agendar pagamento'}</span>
        </button>
      </div>

      {/* Add Scheduled Transfer Inline Panel */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Novo agendamento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Descrição
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Energia Enel"
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Favorecido
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Ex: Enel Distribuição SP"
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Valor (R$)
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="185.00"
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Vencimento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<CategoryId, 'income'>)
                }
                className="w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_MAP[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as 'Mensal' | 'Única' | 'Anual')
                }
                className="w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              >
                <option value="Mensal">Mensal</option>
                <option value="Única">Única</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2.5 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
              <span>Ativar débito automático na data de vencimento</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                Salvar agendamento
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Commitment KPIs */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-amber-500/12 text-amber-500 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Comprometido a vencer</p>
            <CurrencyValue
              value={pendingTotal}
              size="lg"
              className="text-[var(--text-primary)] mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3.5 sm:border-l sm:border-[var(--border-subtle)] sm:pl-6">
          <div className="w-11 h-11 rounded-full bg-emerald-500/12 text-emerald-500 dark:text-[#4edea3] flex items-center justify-center shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Liquidado neste ciclo</p>
            <CurrencyValue
              value={paidTotal}
              size="lg"
              className="text-emerald-500 dark:text-[#4edea3] mt-0.5"
            />
          </div>
        </div>
      </section>

      {/* Scheduled Items List */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6 divide-y divide-[var(--border-subtle)]">
        {scheduled.map((item) => {
          const isPaid = item.status === 'paid';
          const isDueSoon = item.status === 'due_soon';

          return (
            <div
              key={item.id}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <CategoryIcon category={item.category} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[15px] font-semibold truncate ${
                        isPaid
                          ? 'text-[var(--text-muted)] line-through'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
                    <span>{item.recipient}</span>
                    <span aria-hidden="true">·</span>
                    <span className={isDueSoon && !isPaid ? 'text-amber-500 font-medium' : ''}>
                      Vence {formatShortDueDate(item.dueDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat size={11} />
                      {item.recurrence}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <button
                  type="button"
                  disabled={isPaid}
                  onClick={() => onToggleAutoPay(item.id)}
                  className={`text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    item.autoPay
                      ? 'text-indigo-400'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.autoPay ? 'Automático ativo' : 'Ativar automático'}
                </button>

                <CurrencyValue
                  value={item.amount}
                  size="md"
                  className={
                    isPaid
                      ? 'text-[var(--text-muted)]'
                      : 'text-[var(--text-primary)]'
                  }
                />

                {isPaid ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 dark:text-[#4edea3] min-w-[76px] justify-end">
                    <CheckCircle2 size={15} />
                    <span>Pago</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPayScheduled(item.id)}
                    className="h-9 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Pagar agora
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
