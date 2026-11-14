import {
  Camera,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Transaction } from '../types/finance';

interface AIAssistantPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendPrompt: (text: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<void>;
  onUndoTransaction: (txId: string) => void;
  transactions: Transaction[];
  className?: string;
}

const QUICK_PROMPTS = [
  'Onde estou gastando mais?',
  'Gastei 38,50 na padaria no Pix',
  'Consigo economizar R$ 400 este mês?',
];

export function AIAssistantPanel({
  messages,
  isLoading,
  onSendPrompt,
  onUploadReceipt,
  onUndoTransaction,
  transactions,
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
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNote('Reconhecimento de voz não disponível neste navegador.');
      setTimeout(() => setVoiceNote(null), 3500);
      return;
    }

    interface MinimalRecognition {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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
      {/* Header */}
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
              Registro natural e análise financeira
            </p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const linkedTxExists =
            msg.createdTransactionId &&
            transactions.some((t) => t.id === msg.createdTransactionId);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isUser
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : msg.error
                    ? 'bg-rose-500/12 text-rose-400 border border-rose-500/25 rounded-bl-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {linkedTxExists && msg.createdTransactionId && (
                  <button
                    type="button"
                    onClick={() => onUndoTransaction(msg.createdTransactionId!)}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Undo2 size={12} />
                    <span>Desfazer lançamento</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1 tabular-financial">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              <span>Processando com GastoIA...</span>
            </div>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto">
        {QUICK_PROMPTS.map((qp) => (
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

      {/* Floating Input Bar */}
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
            placeholder='Ex: "Gastei 45 no almoço"'
            aria-label="Comando ou pergunta para GastoIA"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />

          <button
            type="button"
            disabled={isLoading}
            onClick={handleVoice}
            title="Ditar gasto por voz"
            aria-label="Ditar gasto por voz"
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
