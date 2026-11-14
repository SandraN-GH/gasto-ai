import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface AuthLoadingScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export function AuthLoadingScreen({ error, onRetry }: AuthLoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm tier-1-card rounded-2xl p-8 text-center space-y-4">
        <div className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          GastoIA
        </div>

        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-500/12 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Falha ao conectar
              </p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {error}
              </p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Tentar de novo</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <p className="text-sm text-[var(--text-muted)]">
              Carregando sua conta...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
