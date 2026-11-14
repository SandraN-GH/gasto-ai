import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  PenLine,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type CreateExpensePayload } from '../lib/api';
import type {
  Category,
  Expense,
  ExpenseDraft,
  ExpenseSource,
} from '../types';
import {
  formatRelativeDate,
  getSaoPauloDateString,
} from '../utils/format';
import { resizeImageForAI } from '../utils/imageResize';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

type ModalStep = 'choose' | 'processing' | 'review';

interface NewTransactionModalProps {
  open: boolean;
  categories: Category[];
  selectedExpense: Expense | null;
  initialDraft?: ExpenseDraft | null;
  initialManual?: boolean;
  initialCamera?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateExpensePayload) => Promise<void>;
  onUpdateExpense: (
    id: string,
    payload: Partial<CreateExpensePayload>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<boolean | void>;
}

const PAYMENT_METHODS = [
  'Pix',
  'Crédito',
  'Débito',
  'Transferência',
  'Dinheiro',
];

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function centsToInputValue(cents: number): string {
  if (!cents || cents <= 0) return '';
  return (cents / 100).toFixed(2);
}

export function NewTransactionModal({
  open,
  categories,
  selectedExpense,
  initialDraft = null,
  initialManual = false,
  initialCamera = false,
  onClose,
  onCreate,
  onUpdateExpense,
  onDelete,
}: NewTransactionModalProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [step, setStep] = useState<ModalStep>('choose');
  const [processingLabel, setProcessingLabel] = useState(
    'Analisando com Workers AI...'
  );
  const [naturalText, setNaturalText] = useState('');
  const [parseError, setParseError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);

  // Campos do formulário de revisão/criação
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [source, setSource] = useState<ExpenseSource>('manual');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getSaoPauloDateString);
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edição inline e confirmação de exclusão quando inspecionando despesa existente
  const [editingExisting, setEditingExisting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const applyDraftToForm = (d: ExpenseDraft) => {
    setDraft(d);
    setSource(d.source);
    setAmount(centsToInputValue(d.amount_cents.value));
    setExpenseDate(d.expense_date.value || getSaoPauloDateString());
    setMerchant(d.merchant.value || '');
    const validCat = categories.some((c) => c.id === d.category_id.value)
      ? d.category_id.value
      : categories[0]?.id ?? '';
    setCategoryId(validCat);
    setPaymentMethod(d.payment_method.value || 'Pix');
    setNotes(d.notes ?? '');
    setFormError(null);
    setStep('review');
  };

  const resetToManualForm = () => {
    setDraft(null);
    setSource('manual');
    setAmount('');
    setExpenseDate(getSaoPauloDateString());
    setMerchant('');
    setCategoryId(categories[0]?.id ?? '');
    setPaymentMethod('Pix');
    setNotes('');
    setFormError(null);
    setParseError(null);
    setStep('review');
  };

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    setParseError(null);
    setFormError(null);
    setEditingExisting(false);
    setConfirmingDelete(false);

    if (selectedExpense) {
      setAmount(centsToInputValue(selectedExpense.amount_cents));
      setExpenseDate(selectedExpense.expense_date || getSaoPauloDateString());
      setMerchant(selectedExpense.merchant ?? '');
      setCategoryId(
        selectedExpense.category_id || categories[0]?.id || ''
      );
      setPaymentMethod(selectedExpense.payment_method || 'Pix');
      setNotes(selectedExpense.notes ?? '');
      return;
    }

    if (initialDraft) {
      applyDraftToForm(initialDraft);
      return;
    }

    if (initialManual) {
      resetToManualForm();
      return;
    }

    setDraft(null);
    setSource('manual');
    setNaturalText('');
    setAmount('');
    setExpenseDate(getSaoPauloDateString());
    setMerchant('');
    setCategoryId(categories[0]?.id ?? '');
    setPaymentMethod('Pix');
    setNotes('');
    setStep('choose');

    if (initialCamera) {
      const timer = window.setTimeout(() => {
        cameraInputRef.current?.click();
      }, 120);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedExpense, initialDraft, initialManual, initialCamera]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  if (!open) return null;

  const effectiveCategoryId = categoryId || categories[0]?.id || '';

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = naturalText.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setParseError(null);
    setProcessingLabel('Interpretando texto com Workers AI...');
    setStep('processing');

    try {
      const res = await api.parseExpenseText(trimmed, controller.signal);
      setRemainingQuota(res.remaining_daily_quota);
      applyDraftToForm(res.draft);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ABORTED') {
        setStep('choose');
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível analisar o texto agora.';
      const code = err instanceof ApiError ? err.code : undefined;
      setParseError({ message, code });
      setStep('choose');
    }
  };

  const handleImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setParseError(null);
    setProcessingLabel('Preparando imagem e lendo comprovante...');
    setStep('processing');

    try {
      const compressed = await resizeImageForAI(rawFile);
      if (controller.signal.aborted) return;

      setProcessingLabel('Extraindo dados da nota com Workers AI...');
      const res = await api.parseExpenseImage(compressed, controller.signal);
      setRemainingQuota(res.remaining_daily_quota);
      applyDraftToForm(res.draft);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ABORTED') {
        setStep('choose');
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível ler a imagem selecionada.';
      const code = err instanceof ApiError ? err.code : undefined;
      setParseError({ message, code });
      setStep('choose');
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedReais = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedReais) || parsedReais < 0.01 || parsedReais > 1_000_000) {
      setFormError('Informe um valor válido entre R$ 0,01 e R$ 1.000.000,00.');
      return;
    }

    const todayStr = getSaoPauloDateString();
    if (!expenseDate || expenseDate > todayStr) {
      setFormError('Informe uma data válida que não seja futura.');
      return;
    }

    if (!effectiveCategoryId) {
      setFormError('Selecione uma categoria.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        amount_cents: Math.round(parsedReais * 100),
        expense_date: expenseDate,
        merchant: merchant.trim() || null,
        category_id: effectiveCategoryId,
        payment_method: paymentMethod.trim() || null,
        notes: notes.trim() || null,
        source,
        ai_confidence: draft ? draft.overall_confidence : null,
      });
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível salvar a despesa.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setFormError(null);

    const parsedReais = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedReais) || parsedReais < 0.01 || parsedReais > 1_000_000) {
      setFormError('Informe um valor válido entre R$ 0,01 e R$ 1.000.000,00.');
      return;
    }

    const todayStr = getSaoPauloDateString();
    if (!expenseDate || expenseDate > todayStr) {
      setFormError('Informe uma data válida que não seja futura.');
      return;
    }

    setSubmitting(true);
    try {
      await onUpdateExpense(selectedExpense.id, {
        amount_cents: Math.round(parsedReais * 100),
        expense_date: expenseDate,
        merchant: merchant.trim() || null,
        category_id: effectiveCategoryId,
        payment_method: paymentMethod.trim() || null,
        notes: notes.trim() || null,
      });
      setEditingExisting(false);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao atualizar despesa.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCat = categories.find(
    (c) => c.id === selectedExpense?.category_id
  );

  const isLowConfidence = (conf?: number) =>
    draft !== null && typeof conf === 'number' && conf < LOW_CONFIDENCE_THRESHOLD;

  const isAiBlocked =
    parseError?.code === 'AI_UNAVAILABLE' ||
    parseError?.code === 'AI_DAILY_LIMIT';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={selectedExpense ? 'Detalhes da despesa' : 'Adicionar despesa'}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl glass-surface p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto sm:hidden" />

        {/* Inputs ocultos de câmera e galeria */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
          aria-label="Tirar foto de comprovante"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          onChange={handleImageSelected}
          className="hidden"
          aria-label="Enviar imagem de comprovante"
        />

        {/* MODO 1: INSPEÇÃO / EDIÇÃO DE DESPESA EXISTENTE */}
        {selectedExpense ? (
          editingExisting ? (
            <form onSubmit={handleSaveExisting} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingExisting(false)}
                    aria-label="Voltar aos detalhes"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Editar despesa
                  </h2>
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

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    max={getSaoPauloDateString()}
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Estabelecimento / Descrição
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Ex.: Supermercado, Padaria..."
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Forma de pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={effectiveCategoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Observações
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
                  onClick={() => setEditingExisting(false)}
                  className="h-10 px-4 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {submitting ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <CategoryIcon
                    icon={
                      selectedExpense.category_icon ??
                      selectedCat?.icon ??
                      'tag'
                    }
                    color={
                      selectedExpense.category_color ??
                      selectedCat?.color ??
                      '#64748B'
                    }
                  />
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedExpense.merchant?.trim() ||
                        selectedExpense.category_name ||
                        selectedCat?.name ||
                        'Despesa'}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {selectedExpense.category_name ??
                        selectedCat?.name ??
                        'Outros'}
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      {formatRelativeDate(selectedExpense.expense_date)}
                      {selectedExpense.payment_method && (
                        <>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          {selectedExpense.payment_method}
                        </>
                      )}
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
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-[var(--text-muted)] block">
                    Valor da despesa
                  </span>
                  {selectedExpense.source && (
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Origem:{' '}
                      {selectedExpense.source === 'image'
                        ? 'Foto com IA'
                        : selectedExpense.source === 'text'
                        ? 'Texto com IA'
                        : 'Manual'}
                      {selectedExpense.ai_confidence !== null &&
                      selectedExpense.ai_confidence !== undefined
                        ? ` (${Math.round(selectedExpense.ai_confidence * 100)}% confiança)`
                        : ''}
                    </span>
                  )}
                </div>
                <CurrencyValue
                  value={-selectedExpense.amount_cents}
                  size="lg"
                  className="text-[var(--text-primary)]"
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

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">
                    Alterar categoria rapidamente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const active = selectedExpense.category_id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={submitting}
                          onClick={async () => {
                            setFormError(null);
                            setSubmitting(true);
                            try {
                              await onUpdateExpense(selectedExpense.id, {
                                category_id: cat.id,
                              });
                            } catch (err) {
                              setFormError(
                                err instanceof Error
                                  ? err.message
                                  : 'Não foi possível alterar a categoria.'
                              );
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                            active
                              ? 'text-white'
                              : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
                </div>
              )}

              {confirmingDelete ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    Tem certeza que deseja excluir esta despesa?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmingDelete(false)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setFormError(null);
                        setSubmitting(true);
                        try {
                          const ok = await onDelete(selectedExpense.id);
                          if (ok !== false) {
                            onClose();
                          } else {
                            setFormError(
                              'Não foi possível excluir a despesa. Tente novamente.'
                            );
                          }
                        } catch (err) {
                          setFormError(
                            err instanceof Error
                              ? err.message
                              : 'Não foi possível excluir a despesa.'
                          );
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="h-9 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                    >
                      {submitting ? 'Excluindo...' : 'Confirmar exclusão'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>Excluir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingExisting(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <PenLine size={15} />
                    <span>Editar campos</span>
                  </button>
                </div>
              )}
            </>
          )
        ) : step === 'processing' ? (
          /* MODO 2: IA PROCESSANDO */
          <div className="py-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                IA processando
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {processingLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                setStep('choose');
              }}
              className="h-10 px-4 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : step === 'choose' ? (
          /* MODO 3: ADICIONAR DESPESA — ESCOLHA DO MÉTODO */
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Adicionar despesa
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Fotografe uma nota, digite naturalmente ou lance manualmente
                </p>
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

            {parseError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3"
              >
                <div className="flex items-start gap-2.5 text-xs text-rose-400 leading-relaxed">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{parseError.message}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetToManualForm}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <PenLine size={14} />
                    <span>Abrir formulário manual</span>
                  </button>
                  {!isAiBlocked && (
                    <button
                      type="button"
                      onClick={() => setParseError(null)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] cursor-pointer"
                    >
                      Dispensar
                    </button>
                  )}
                </div>
              </div>
            )}

            {initialCamera && !parseError && (
              <div className="p-3.5 rounded-xl bg-indigo-500/12 border border-indigo-500/30 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Atalho rápido: toque ao lado caso a câmera não tenha aberto automaticamente.
                </span>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Abrir câmera
                </button>
              </div>
            )}

            {/* Captura por foto */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-indigo-500/10 border border-[var(--border-subtle)] hover:border-indigo-500/40 transition-colors cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Camera size={20} />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    Tirar foto
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    Câmera do dispositivo
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-indigo-500/10 border border-[var(--border-subtle)] hover:border-indigo-500/40 transition-colors cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <ImagePlus size={20} />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    Enviar imagem
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    JPEG, PNG ou WebP
                  </span>
                </div>
              </button>
            </div>

            {/* Digitar em linguagem natural */}
            <form
              onSubmit={handleAnalyzeText}
              className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="ai-text-input"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]"
                >
                  <FileText size={14} className="text-indigo-400" />
                  <span>Digitar despesa</span>
                </label>
                {remainingQuota !== null && (
                  <span className="text-[11px] text-[var(--text-muted)] tabular-financial">
                    {remainingQuota} análises restantes hoje
                  </span>
                )}
              </div>

              <textarea
                id="ai-text-input"
                rows={3}
                maxLength={1000}
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="Ex.: Almoço no restaurante Sabor Brasileiro 42,90 no Pix hoje"
                className="w-full p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 resize-none"
              />

              <button
                type="submit"
                disabled={!naturalText.trim()}
                className="w-full h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles size={15} />
                <span>Analisar com IA</span>
              </button>
            </form>

            {/* Fallback manual direto */}
            <button
              type="button"
              onClick={resetToManualForm}
              className="w-full h-10 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PenLine size={14} />
              <span>Preencher manualmente</span>
            </button>
          </div>
        ) : (
          /* MODO 4: REVISAR E CONFIRMAR (OU FORMULÁRIO MANUAL) */
          <form onSubmit={handleSaveNew} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  aria-label="Voltar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {draft ? 'Revisar e confirmar' : 'Nova despesa manual'}
                  </h2>
                  {draft && (
                    <p className="text-[11px] text-[var(--text-muted)] tabular-financial">
                      Confiança geral:{' '}
                      {Math.round(draft.overall_confidence * 100)}%
                      {remainingQuota !== null
                        ? ` · ${remainingQuota} análises restantes hoje`
                        : ''}
                    </p>
                  )}
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

            {draft && draft.fallback_used && (
              <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-500 dark:text-amber-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  Extração automática simplificada usada como contingência.
                  Confira os campos destacados antes de salvar.
                </span>
              </div>
            )}

            {draft && !draft.fallback_used && draft.overall_confidence >= 0.75 && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-500 dark:text-[#4edea3]">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>
                  Dados extraídos pela IA. Revise e toque em Salvar para confirmar.
                </span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Valor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Valor (R$)
                  </label>
                  {draft && (
                    <span
                      className={`text-[11px] tabular-financial font-medium ${
                        isLowConfidence(draft.amount_cents.confidence)
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isLowConfidence(draft.amount_cents.confidence)
                        ? `Revisar (${Math.round(
                            draft.amount_cents.confidence * 100
                          )}%)`
                        : `${Math.round(draft.amount_cents.confidence * 100)}%`}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  autoFocus={!draft}
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={`w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border text-sm tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 ${
                    isLowConfidence(draft?.amount_cents.confidence)
                      ? 'border-amber-500/70 ring-2 ring-amber-500/20'
                      : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              {/* Data */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Data
                  </label>
                  {draft && (
                    <span
                      className={`text-[11px] tabular-financial font-medium ${
                        isLowConfidence(draft.expense_date.confidence)
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isLowConfidence(draft.expense_date.confidence)
                        ? `Revisar (${Math.round(
                            draft.expense_date.confidence * 100
                          )}%)`
                        : `${Math.round(draft.expense_date.confidence * 100)}%`}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  required
                  max={getSaoPauloDateString()}
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 ${
                    isLowConfidence(draft?.expense_date.confidence)
                      ? 'border-amber-500/70 ring-2 ring-amber-500/20'
                      : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              {/* Estabelecimento */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Estabelecimento / Descrição
                  </label>
                  {draft && (
                    <span
                      className={`text-[11px] tabular-financial font-medium ${
                        isLowConfidence(draft.merchant.confidence)
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isLowConfidence(draft.merchant.confidence)
                        ? `Revisar (${Math.round(
                            draft.merchant.confidence * 100
                          )}%)`
                        : `${Math.round(draft.merchant.confidence * 100)}%`}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Ex.: Mercado Central, Uber, Farmácia..."
                  className={`w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 ${
                    isLowConfidence(draft?.merchant.confidence)
                      ? 'border-amber-500/70 ring-2 ring-amber-500/20'
                      : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              {/* Forma de pagamento */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Forma de pagamento
                  </label>
                  {draft && (
                    <span
                      className={`text-[11px] tabular-financial font-medium ${
                        isLowConfidence(draft.payment_method.confidence)
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isLowConfidence(draft.payment_method.confidence)
                        ? `Revisar (${Math.round(
                            draft.payment_method.confidence * 100
                          )}%)`
                        : `${Math.round(
                            draft.payment_method.confidence * 100
                          )}%`}
                    </span>
                  )}
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`w-full h-11 px-3 rounded-xl bg-[var(--surface-2)] border text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 ${
                    isLowConfidence(draft?.payment_method.confidence)
                      ? 'border-amber-500/70 ring-2 ring-amber-500/20'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {!PAYMENT_METHODS.includes(paymentMethod) && paymentMethod && (
                    <option value={paymentMethod}>{paymentMethod}</option>
                  )}
                </select>
              </div>

              {/* Categoria */}
              {categories.length > 0 && (
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      Categoria
                    </label>
                    {draft && (
                      <span
                        className={`text-[11px] tabular-financial font-medium ${
                          isLowConfidence(draft.category_id.confidence)
                            ? 'text-amber-500'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isLowConfidence(draft.category_id.confidence)
                          ? `Revisar (${Math.round(
                              draft.category_id.confidence * 100
                            )}%)`
                          : `${Math.round(
                              draft.category_id.confidence * 100
                            )}%`}
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex flex-wrap gap-2 p-2 rounded-xl ${
                      isLowConfidence(draft?.category_id.confidence)
                        ? 'border border-amber-500/70 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    {categories.map((cat) => (
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
                            ? { backgroundColor: cat.color ?? '#6366F1' }
                            : undefined
                        }
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Observação */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Observações (opcional)
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
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
