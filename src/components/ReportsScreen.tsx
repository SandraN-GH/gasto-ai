import { BarChart3, Download, Store } from 'lucide-react';
import { useState } from 'react';
import type { ReportsData } from '../types';
import {
  formatCurrencyInline,
  formatDueDateBR,
  formatMonthLabel,
} from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';
import {
  EmptyStateCard,
  ErrorStateCard,
  ReportsSkeleton,
} from './ScreenStates';

interface ReportsScreenProps {
  period: 'week' | 'month' | 'year';
  from: string;
  to: string;
  reports: ReportsData | null;
  loading: boolean;
  error: string | null;
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
  onDateRangeChange: (from: string, to: string) => void;
  onRetry: () => void;
  onExportCsv: () => Promise<void>;
  onOpenNewModal: () => void;
}

export function ReportsScreen({
  period,
  from,
  to,
  reports,
  loading,
  error,
  onPeriodChange,
  onDateRangeChange,
  onRetry,
  onExportCsv,
  onOpenNewModal,
}: ReportsScreenProps) {
  const [customMode, setCustomMode] = useState(Boolean(from || to));
  const [exporting, setExporting] = useState(false);

  const summary = reports?.summary ?? {
    total_cents: 0,
    count: 0,
    average_cents: 0,
  };
  const series = reports?.series ?? [];
  const byCategory = reports?.by_category ?? [];
  const topMerchants = reports?.top_merchants ?? [];
  const maxSeriesCents = Math.max(...series.map((s) => s.total_cents), 1);

  const activeTab = customMode || Boolean(from || to) ? 'custom' : period;

  const handleSelectTab = (tabId: 'week' | 'month' | 'year' | 'custom') => {
    if (tabId === 'custom') {
      setCustomMode(true);
      if (!from && !to && reports) {
        onDateRangeChange(reports.from, reports.to);
      }
      return;
    }
    setCustomMode(false);
    if (from || to) {
      onDateRangeChange('', '');
    }
    onPeriodChange(tabId);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExportCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Relatórios
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Análise por semana, mês, ano ou período personalizado
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!reports || summary.count === 0 || exporting}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:bg-indigo-500/8 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download size={15} />
          <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
        </button>
      </div>

      {/* Controles de período e intervalo personalizado */}
      <section className="tier-1-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Período do relatório"
            className="inline-flex flex-wrap items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]"
          >
            {(
              [
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mês' },
                { id: 'year', label: 'Ano' },
                { id: 'custom', label: 'Personalizado' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'custom' && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="report-from"
                  className="text-[var(--text-muted)] font-medium"
                >
                  De
                </label>
                <input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(e) => onDateRangeChange(e.target.value, to)}
                  className="h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="report-to"
                  className="text-[var(--text-muted)] font-medium"
                >
                  Até
                </label>
                <input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(e) => onDateRangeChange(from, e.target.value)}
                  className="h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              {(from || to) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode(false);
                    onDateRangeChange('', '');
                  }}
                  className="h-9 px-2.5 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                >
                  Resetar
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {loading && !reports ? (
        <ReportsSkeleton />
      ) : error && !reports ? (
        <ErrorStateCard message={error} onRetry={onRetry} />
      ) : summary.count === 0 ? (
        <EmptyStateCard
          variant="reports"
          title="Sem despesas neste período"
          description="Não há despesas registradas para o intervalo selecionado. Adicione uma despesa ou ajuste o período."
          actionLabel="Adicionar despesa"
          onAction={onOpenNewModal}
        />
      ) : (
        <>
          {/* Resumo numérico */}
          <section className="tier-1-card rounded-2xl p-5 sm:p-6">
            {reports && (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Intervalo analisado:{' '}
                <strong className="text-[var(--text-secondary)]">
                  {formatDueDateBR(reports.from)} até{' '}
                  {formatDueDateBR(reports.to)}
                </strong>
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Total no período
                </p>
                <CurrencyValue
                  value={summary.total_cents}
                  size="lg"
                  className="text-[var(--text-primary)] mt-1"
                />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Quantidade de despesas
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-financial mt-1">
                  {summary.count}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Ticket médio
                </p>
                <CurrencyValue
                  value={summary.average_cents}
                  size="lg"
                  className="text-[var(--text-primary)] mt-1"
                />
              </div>
            </div>
          </section>

          {/* Série temporal */}
          {series.length > 0 && (
            <section className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={17} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Evolução no período
                </h2>
              </div>

              <div className="space-y-3">
                {series.map((point) => {
                  const widthPct = Math.max(
                    4,
                    Math.round((point.total_cents / maxSeriesCents) * 100)
                  );
                  const bucketLabel =
                    point.bucket.length === 10
                      ? formatDueDateBR(point.bucket)
                      : point.bucket.length === 7
                      ? formatMonthLabel(point.bucket)
                      : point.bucket;
                  return (
                    <div key={point.bucket} className="space-y-1">
                      <div className="flex items-center justify-between text-xs tabular-financial">
                        <span className="font-medium text-[var(--text-secondary)]">
                          {bucketLabel}{' '}
                          <span className="text-[var(--text-muted)]">
                            ({point.count})
                          </span>
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatCurrencyInline(point.total_cents)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Por categoria & Principais estabelecimentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Distribuição por categoria
              </h2>
              <div className="space-y-3.5">
                {byCategory.map((cat) => {
                  const sharePct =
                    summary.total_cents > 0
                      ? Math.round((cat.total_cents / summary.total_cents) * 100)
                      : 0;
                  return (
                    <div
                      key={cat.category_id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          icon={cat.category_icon}
                          color={cat.category_color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {cat.category_name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] tabular-financial">
                            {cat.count}{' '}
                            {cat.count === 1 ? 'despesa' : 'despesas'} ·{' '}
                            {sharePct}%
                          </p>
                        </div>
                      </div>
                      <CurrencyValue
                        value={cat.total_cents}
                        size="sm"
                        className="text-[var(--text-primary)] shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Principais estabelecimentos
              </h2>
              {topMerchants.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                  Nenhum estabelecimento informado neste período.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {topMerchants.map((m) => (
                    <div
                      key={m.merchant}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                          <Store size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {m.merchant}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] tabular-financial">
                            {m.count}{' '}
                            {m.count === 1 ? 'lançamento' : 'lançamentos'}
                          </p>
                        </div>
                      </div>
                      <CurrencyValue
                        value={m.total_cents}
                        size="sm"
                        className="text-[var(--text-primary)] shrink-0"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
