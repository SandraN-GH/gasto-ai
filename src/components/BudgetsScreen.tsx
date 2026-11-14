import { AlertTriangle, Check, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_MAP } from '../data/initialData';
import type {
  BudgetLimit,
  BudgetRecommendation,
  CategoryId,
  Transaction,
} from '../types/finance';
import { formatCurrencyInline } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { CurrencyValue } from './CurrencyValue';

interface BudgetsScreenProps {
  budgets: BudgetLimit[];
  transactions: Transaction[];
  monthlyIncome: number;
  monthlyExpenses: number;
  onUpdateLimit: (category: Exclude<CategoryId, 'income'>, limit: number) => void;
}

export function BudgetsScreen({
  budgets,
  transactions,
  monthlyIncome,
  monthlyExpenses,
  onUpdateLimit,
}: BudgetsScreenProps) {
  const [optimizing, setOptimizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [appliedNames, setAppliedNames] = useState<Record<string, boolean>>({});

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const remainingTotal = totalBudget - monthlyExpenses;

  const daysRemainingInMonth = 16; // Nov 14 -> Nov 30

  const handleOptimizeWithAI = async () => {
    setOptimizing(true);
    setAiError(null);
    setAppliedNames({});

    try {
      const categoriesContext = budgets.map((b) => {
        const spent = transactions
          .filter((t) => t.type === 'expense' && t.category === b.category)
          .reduce((acc, t) => acc + t.amount, 0);
        return {
          name: CATEGORY_MAP[b.category].label,
          spent,
          limit: b.limit,
        };
      });

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'optimize_budgets',
          context: {
            balance: monthlyIncome - monthlyExpenses,
            monthlyIncome,
            monthlyExpenses,
            categories: categoriesContext,
            recentTransactions: [],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao otimizar orçamentos.');
      }

      setAiSummary(data.summary);
      setRecommendations(data.recommendations ?? []);
    } catch (err: unknown) {
      setAiError(
        err instanceof Error ? err.message : 'Não foi possível conectar ao GastoIA.'
      );
    } finally {
      setOptimizing(false);
    }
  };

  const applyRecommendation = (rec: BudgetRecommendation) => {
    const matched = budgets.find(
      (b) =>
        CATEGORY_MAP[b.category].label.toLowerCase() ===
        rec.categoryName.toLowerCase()
    );
    if (matched) {
      onUpdateLimit(matched.category, Math.max(50, Math.round(rec.suggestedLimit)));
      setAppliedNames((prev) => ({ ...prev, [rec.categoryName]: true }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            Orçamentos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Ajuste tetos mensais e receba sugestões inteligentes
          </p>
        </div>

        <button
          type="button"
          onClick={handleOptimizeWithAI}
          disabled={optimizing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          {optimizing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>{optimizing ? 'Analisando...' : 'Otimizar com IA'}</span>
        </button>
      </div>

      {/* Overall Budget Summary */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Teto mensal planejado</p>
            <CurrencyValue
              value={totalBudget}
              size="lg"
              className="text-[var(--text-primary)] mt-1"
            />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Consumido até hoje</p>
            <CurrencyValue
              value={monthlyExpenses}
              size="lg"
              className="text-[var(--text-primary)] mt-1"
            />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              Disponível ({daysRemainingInMonth} dias restantes)
            </p>
            <CurrencyValue
              value={remainingTotal}
              size="lg"
              className={`mt-1 ${
                remainingTotal >= 0
                  ? 'text-emerald-500 dark:text-[#4edea3]'
                  : 'text-rose-500 dark:text-[#ffb4ab]'
              }`}
            />
          </div>
        </div>
      </section>

      {/* AI Optimization Recommendations */}
      {aiError && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-400">
          {aiError}
        </div>
      )}

      {aiSummary && (
        <section className="tier-1-card rounded-2xl p-5 sm:p-6 border-indigo-500/30 bg-indigo-500/[0.04] space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Diagnóstico GastoIA
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                {aiSummary}
              </p>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] pt-2">
              {recommendations.map((rec) => {
                const applied = appliedNames[rec.categoryName];
                return (
                  <div
                    key={rec.categoryName}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {rec.categoryName}{' '}
                        <span className="text-indigo-400 font-mono-tabular">
                          → {formatCurrencyInline(rec.suggestedLimit)}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {rec.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={applied}
                      onClick={() => applyRecommendation(rec)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        applied
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                      }`}
                    >
                      {applied && <Check size={14} />}
                      <span>{applied ? 'Aplicado' : 'Aplicar limite'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Per-Category Editable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => {
          const meta = CATEGORY_MAP[b.category];
          const spent = transactions
            .filter((t) => t.type === 'expense' && t.category === b.category)
            .reduce((acc, t) => acc + t.amount, 0);
          const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
          const remaining = b.limit - spent;
          const dailySafe = Math.max(0, remaining / daysRemainingInMonth);
          const isOver = pct >= 100;
          const isWarn = pct >= 80 && pct < 100;

          return (
            <div
              key={b.category}
              className="tier-1-card rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={b.category} />
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {meta.label}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] tabular-financial">
                      {pct}% utilizado
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      {remaining >= 0
                        ? `Livre: ${formatCurrencyInline(dailySafe)}/dia`
                        : `Excedido em ${formatCurrencyInline(Math.abs(remaining))}`}
                    </p>
                  </div>
                </div>

                {(isOver || isWarn) && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isOver ? 'text-rose-500' : 'text-amber-500'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    <span>{isOver ? 'Acima' : 'Atenção'}</span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2 tabular-financial">
                  <span className="text-[var(--text-muted)]">
                    Gasto: <strong className="text-[var(--text-primary)]">{formatCurrencyInline(spent)}</strong>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Teto: <strong className="text-[var(--text-primary)]">{formatCurrencyInline(b.limit)}</strong>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: isOver
                        ? '#F43F5E'
                        : isWarn
                        ? '#F59E0B'
                        : meta.color,
                    }}
                  />
                </div>
              </div>

              {/* Interactive Limit Adjuster */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <label
                  htmlFor={`budget-${b.category}`}
                  className="text-xs text-[var(--text-muted)] whitespace-nowrap"
                >
                  Ajustar teto (R$)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`budget-${b.category}`}
                    type="range"
                    min={100}
                    max={4000}
                    step={50}
                    value={b.limit}
                    onChange={(e) =>
                      onUpdateLimit(b.category, Number(e.target.value))
                    }
                    className="w-24 sm:w-28 accent-indigo-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={b.limit}
                    aria-label={`Valor do teto de ${meta.label}`}
                    onChange={(e) =>
                      onUpdateLimit(
                        b.category,
                        Math.max(50, Number(e.target.value) || 50)
                      )
                    }
                    className="w-20 h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-right tabular-financial text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
