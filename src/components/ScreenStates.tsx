import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorStateCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      role="alert"
      className="tier-1-card rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-4"
    >
      <div className="w-12 h-12 rounded-full bg-rose-500/12 text-rose-500 dark:text-[#ffb4ab] flex items-center justify-center">
        <AlertCircle size={22} />
      </div>
      <div className="max-w-md space-y-1">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Não foi possível carregar os dados
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
      >
        <RefreshCw size={15} />
        <span>Tentar de novo</span>
      </button>
    </section>
  );
}

export function EmptyStateCard({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
}: {
  variant: 'overview' | 'ledger' | 'budgets' | 'reports';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
}) {
  return (
    <section className="tier-1-card rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center gap-4">
      {/* Ilustração vetorial minimalista coerente com o tema */}
      <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-indigo-400">
        {variant === 'overview' && (
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="5"
              y="10"
              width="34"
              height="24"
              rx="5"
              stroke="currentColor"
              strokeWidth="1.8"
              opacity="0.7"
            />
            <path
              d="M11 26L18 20L24 24L33 15"
              stroke="#4edea3"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="33" cy="15" r="2.5" fill="#4edea3" />
          </svg>
        )}
        {variant === 'ledger' && (
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="7"
              width="26"
              height="30"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.8"
              opacity="0.7"
            />
            <path
              d="M15 16H29M15 22H29M15 28H23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {variant === 'budgets' && (
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              r="13"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M22 9A13 13 0 0 1 35 22H22V9Z"
              fill="currentColor"
              opacity="0.75"
            />
          </svg>
        )}
        {variant === 'reports' && (
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="8"
              y="22"
              width="6"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
              opacity="0.7"
            />
            <rect
              x="19"
              y="14"
              width="6"
              height="22"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
              opacity="0.85"
            />
            <rect
              x="30"
              y="9"
              width="6"
              height="27"
              rx="2"
              fill="#4edea3"
              opacity="0.85"
            />
          </svg>
        )}
      </div>

      <div className="max-w-md space-y-1.5">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </section>
  );
}

function PulseBox({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--surface-high)]/70 ${className}`}
      aria-hidden="true"
    />
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando visão geral">
      <div className="tier-1-card rounded-2xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3">
            <PulseBox className="h-3.5 w-44" />
            <PulseBox className="h-10 w-56" />
            <PulseBox className="h-3.5 w-64" />
          </div>
          <PulseBox className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <PulseBox className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <PulseBox className="h-3 w-28" />
              <PulseBox className="h-6 w-36" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PulseBox className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <PulseBox className="h-3 w-28" />
              <PulseBox className="h-6 w-36" />
            </div>
          </div>
        </div>
      </div>

      <div className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <PulseBox className="h-4 w-32" />
            <PulseBox className="h-3 w-48" />
          </div>
          <PulseBox className="h-8 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
          <PulseBox className="h-24 w-full" />
          <PulseBox className="h-36 w-full" />
          <PulseBox className="h-20 w-full" />
          <PulseBox className="h-32 w-full" />
          <PulseBox className="h-28 w-full" />
          <PulseBox className="h-40 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
          <PulseBox className="h-4 w-40" />
          <PulseBox className="h-2 w-full" />
          <PulseBox className="h-2 w-full" />
          <PulseBox className="h-2 w-4/5" />
        </div>
        <div className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
          <PulseBox className="h-4 w-44" />
          <PulseBox className="h-11 w-full" />
          <PulseBox className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando extrato">
      <div className="tier-1-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <PulseBox className="h-11 flex-1 rounded-xl" />
          <PulseBox className="h-11 w-56 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <PulseBox className="h-8 w-28" />
          <PulseBox className="h-8 w-24" />
          <PulseBox className="h-8 w-24" />
        </div>
      </div>
      <div className="tier-1-card rounded-2xl p-5 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-3.5">
              <PulseBox className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <PulseBox className="h-4 w-40" />
                <PulseBox className="h-3 w-32" />
              </div>
            </div>
            <PulseBox className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando orçamentos">
      <div className="tier-1-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <PulseBox className="h-14 w-full" />
        <PulseBox className="h-14 w-full" />
        <PulseBox className="h-14 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="tier-1-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <PulseBox className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <PulseBox className="h-4 w-32" />
                <PulseBox className="h-3 w-44" />
              </div>
            </div>
            <PulseBox className="h-2.5 w-full rounded-full" />
            <PulseBox className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando relatórios">
      <div className="tier-1-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <PulseBox className="h-14 w-full" />
        <PulseBox className="h-14 w-full" />
        <PulseBox className="h-14 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="tier-1-card rounded-2xl p-6 space-y-4">
          <PulseBox className="h-4 w-40" />
          <PulseBox className="h-36 w-full" />
        </div>
        <div className="tier-1-card rounded-2xl p-6 space-y-4">
          <PulseBox className="h-4 w-44" />
          <PulseBox className="h-10 w-full" />
          <PulseBox className="h-10 w-full" />
          <PulseBox className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
