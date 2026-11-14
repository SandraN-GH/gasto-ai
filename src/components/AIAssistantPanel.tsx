import {
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PenLine,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ExpenseDraft } from '../types';
import { formatCurrencyInline, formatDueDateBR } from '../utils/format';

interface AIAssistantPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendPrompt: (text: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<void>;
  onReviewDraft: (draft: ExpenseDraft) => void;
  onOpenManualForm: () => void;
  onRetryLast?: () => void;
  className?: string;
}

const SUGGESTED_EXAMPLES = [
  'Almoço no restaurante 38,50 no Pix hoje',
  'Uber para o centro R$ 24,90 no crédito ontem',
  'Farmácia 67,00 no débito',
];

export function AIAssistantPanel({
  messages,
  isLoading,
  onSendPrompt,
  onUploadReceipt,
  onReviewDraft,
  onOpenManualForm,
  onRetryLast,
  className = '',
}: AIAssistantPanelProps) {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSendPrompt(text);
  };

  const handleVoice = () => {
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => unknown;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNote('Reconhecimento de voz não disponível neste navegador.');
      setTimeout(() => setVoiceNote(null), 3500);
      return;
    }

    interface MinimalRecognition {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult:
        | ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
        | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    }

    const recognition = new SpeechRec() as MinimalRecognition;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await onUploadReceipt(file);
  };

  return (
    <aside
      aria-label="Assistente GastoIA"
      className={`tier-1-card rounded-2xl flex flex-col overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Assistente GastoIA
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Extração inteligente por texto ou foto
            </p>
          </div>
        </div>
      </div>

      {/* Área de mensagens ou estado vazio inicial */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px]">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-3 py-8 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Lançamento rápido com IA
              </p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Descreva uma despesa ou envie a foto de um comprovante. A IA prepara um rascunho para você revisar e confirmar antes de salvar.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isAiBlocked =
              msg.errorCode === 'AI_UNAVAILABLE' ||
              msg.errorCode === 'AI_DAILY_LIMIT';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    isUser
                      ? 'bg-indigo-500 text-white rounded-br-sm'
                      : msg.error
                      ? 'bg-rose-500/12 text-rose-400 border border-rose-500/25 rounded-bl-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.draft && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] space-y-2 tabular-financial">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {msg.draft.merchant.value || msg.draft.category_name}
                        </span>
                        <span className="font-bold text-[var(--text-primary)] shrink-0">
                          {formatCurrencyInline(msg.draft.amount_cents.value)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{msg.draft.category_name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDueDateBR(msg.draft.expense_date.value)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{msg.draft.payment_method.value}</span>
                      </div>
                      <div>
                        Confiança geral:{' '}
                        <strong className="text-[var(--text-primary)]">
                          {Math.round(msg.draft.overall_confidence * 100)}%
                        </strong>
                        {msg.draft.fallback_used && ' (contingência)'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onReviewDraft(msg.draft!)}
                        className="w-full h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Revisar e confirmar</span>
                      </button>
                    </div>
                  )}

                  {msg.error && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {(isAiBlocked || msg.error) && (
                        <button
                          type="button"
                          onClick={onOpenManualForm}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <PenLine size={12} />
                          <span>Abrir formulário manual</span>
                        </button>
                      )}
                      {!isAiBlocked && onRetryLast && (
                        <button
                          type="button"
                          onClick={onRetryLast}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Tentar de novo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1 tabular-financial">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              <span>IA processando...</span>
            </div>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Exemplos rápidos */}
      <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto">
        {SUGGESTED_EXAMPLES.map((qp) => (
          <button
            key={qp}
            type="button"
            disabled={isLoading}
            onClick={() => onSendPrompt(qp)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-indigo-500/12 border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {voiceNote && (
        <p className="px-4 py-1 text-[11px] text-amber-500">{voiceNote}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-lowest)]/50"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Enviar foto de recibo"
        />
        <div className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] focus-within:border-indigo-500 focus-within:ring-3 focus-within:ring-indigo-500/20 px-2.5 py-1.5 transition-all">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            title="Ler recibo ou comprovante"
            aria-label="Ler recibo por foto"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Camera size={17} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: Café 14,50 no Pix hoje..."
            aria-label="Descreva uma despesa para GastoIA"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />

          <button
            type="button"
            disabled={isLoading}
            onClick={handleVoice}
            title="Ditar despesa por voz"
            aria-label="Ditar despesa por voz"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50 ${
              listening
                ? 'bg-rose-500/15 text-rose-500'
                : 'text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10'
            }`}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Enviar para GastoIA"
            className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </aside>
  );
}
