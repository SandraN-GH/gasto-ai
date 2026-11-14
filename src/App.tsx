import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Moon,
  PieChart,
  Plus,
  Sparkles,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { BudgetsScreen } from './components/BudgetsScreen';
import { LedgerScreen } from './components/LedgerScreen';
import { NewTransactionModal } from './components/NewTransactionModal';
import { OverviewScreen } from './components/OverviewScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { ScheduledScreen } from './components/ScheduledScreen';
import { useAuth } from './contexts/AuthContext';
import { useBudgets } from './hooks/useBudgets';
import { useCategories } from './hooks/useCategories';
import { useDashboard } from './hooks/useDashboard';
import { useExpenses } from './hooks/useExpenses';
import { useScheduled } from './hooks/useScheduled';
import { useTheme } from './hooks/useTheme';
import { api } from './lib/api';
import type {
  ChatMessage,
  Expense,
  ExpenseFilters,
  PaymentMethod,
  ScreenId,
} from './types';
import {
  formatCurrencyInline,
  formatMonthLabel,
  getCurrentSaoPauloMonth,
  getCurrentSaoPauloTimeLabel,
} from './utils/format';

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1 + delta, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

interface WorkspaceProps {
  displayName: string;
  userEmail: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onSignOut: () => Promise<void>;
}

function AuthenticatedWorkspace({
  displayName,
  userEmail,
  darkMode,
  onToggleTheme,
  onSignOut,
}: WorkspaceProps) {
  const [screen, setScreen] = useState<ScreenId>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    getCurrentSaoPauloMonth
  );

  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({
    month: selectedMonth,
    search: '',
    type: 'all',
    category_id: 'all',
  });

  useEffect(() => {
    setExpenseFilters((prev) => ({ ...prev, month: selectedMonth }));
  }, [selectedMonth]);

  const dashboardState = useDashboard(selectedMonth);
  const expensesState = useExpenses(expenseFilters);
  const categoriesState = useCategories();
  const budgetsState = useBudgets(selectedMonth);
  const scheduledState = useScheduled();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  const refetchFinanceViews = () => {
    dashboardState.refetch();
    expensesState.refetch();
    budgetsState.refetch();
    scheduledState.refetch();
  };

  const handleCreateExpense = async (payload: {
    title: string;
    amount_cents: number;
    type: 'expense' | 'income';
    category_id: string;
    payment_method: PaymentMethod;
    occurred_at: string;
    notes?: string;
  }) => {
    try {
      const created = await api.createExpense(payload);
      refetchFinanceViews();
      showToast(
        `${created.type === 'income' ? 'Receita' : 'Gasto'} registrado: ${
          created.title
        }`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao salvar lançamento.'
      );
      throw err;
    }
  };

  const handleRecategorize = async (id: string, categoryId: string) => {
    try {
      const updated = await api.updateExpense(id, { category_id: categoryId });
      setSelectedExpense((curr) => (curr && curr.id === id ? updated : curr));
      refetchFinanceViews();
      showToast('Categoria atualizada.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao atualizar categoria.'
      );
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      refetchFinanceViews();
      showToast('Lançamento removido.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao remover lançamento.'
      );
    }
  };

  const handleUpdateBudgetLimit = async (
    categoryId: string,
    limitCents: number
  ) => {
    try {
      await api.upsertBudget({
        category_id: categoryId,
        month: selectedMonth,
        limit_cents: limitCents,
      });
      budgetsState.refetch();
      dashboardState.refetch();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao atualizar orçamento.'
      );
    }
  };

  const handlePayScheduled = async (id: string) => {
    try {
      const result = await api.payScheduled(id);
      refetchFinanceViews();
      showToast(
        `Pago: ${result.scheduled.title} (${formatCurrencyInline(
          result.scheduled.amount_cents
        )})`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao liquidar pagamento.'
      );
    }
  };

  const handleToggleAutoPay = async (id: string, nextAutoPay: boolean) => {
    try {
      await api.toggleScheduledAutoPay(id, nextAutoPay);
      scheduledState.refetch();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao atualizar agendamento.'
      );
    }
  };

  const handleAddScheduled = async (item: {
    title: string;
    recipient: string;
    amount_cents: number;
    category_id: string;
    due_date: string;
    recurrence: 'Mensal' | 'Única' | 'Anual';
    auto_pay: boolean;
  }) => {
    try {
      await api.createScheduled(item);
      scheduledState.refetch();
      dashboardState.refetch();
      showToast(`Agendamento salvo: ${item.title}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao salvar agendamento.'
      );
      throw err;
    }
  };

  const handleSendAIPrompt = async (text: string) => {
    setLastPrompt(text);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: getCurrentSaoPauloTimeLabel(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);

    try {
      const data = await api.askAssistant(text, selectedMonth);

      if (data.created_expense) {
        refetchFinanceViews();
        showToast(
          `Registrado via IA: ${data.created_expense.title} (${formatCurrencyInline(
            data.created_expense.amount_cents
          )})`
        );
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: getCurrentSaoPauloTimeLabel(),
          created_expense_id: data.created_expense?.id,
          draft: data.draft,
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Não foi possível completar a solicitação.',
          timestamp: getCurrentSaoPauloTimeLabel(),
          error: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUploadReceipt = async (file: File) => {
    const userMsg: ChatMessage = {
      id: `u-img-${Date.now()}`,
      role: 'user',
      content: `Comprovante enviado: ${file.name}`,
      timestamp: getCurrentSaoPauloTimeLabel(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.readAsDataURL(file);
      });

      const data = await api.parseReceipt(base64, file.type || 'image/jpeg');

      if (data.created_expense) {
        refetchFinanceViews();
        showToast(
          `Recibo lançado: ${data.created_expense.title} (${formatCurrencyInline(
            data.created_expense.amount_cents
          )})`
        );
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-ocr-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: getCurrentSaoPauloTimeLabel(),
          created_expense_id: data.created_expense?.id,
          draft: data.draft,
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-ocr-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Erro ao processar imagem do recibo.',
          timestamp: getCurrentSaoPauloTimeLabel(),
          error: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplainExpenseInline = async (
    expense: Expense
  ): Promise<string> => {
    try {
      const res = await api.explainExpense(expense.id);
      return res.explanation || 'Sem análise disponível.';
    } catch (err) {
      return err instanceof Error
        ? err.message
        : 'Não foi possível gerar explicação.';
    }
  };

  const handleExplainFromRow = (expense: Expense) => {
    setSelectedExpense(expense);
    setModalOpen(true);
  };

  const categories = categoriesState.data ?? [];
  const expensesList =
    expensesState.data ?? dashboardState.data?.recent_expenses ?? [];
  const userInitial = (displayName || userEmail || 'U')
    .charAt(0)
    .toUpperCase();

  const navItems: Array<{
    id: ScreenId;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'ledger', label: 'Extrato', icon: ListOrdered },
    { id: 'budgets', label: 'Orçamentos', icon: PieChart },
    { id: 'scheduled', label: 'Agendados', icon: CalendarClock },
  ];

  const renderMainScreen = () => {
    switch (screen) {
      case 'overview':
        return (
          <OverviewScreen
            month={selectedMonth}
            dashboard={dashboardState.data}
            categories={categories}
            loading={dashboardState.loading}
            error={dashboardState.error}
            onRetry={dashboardState.refetch}
            onNavigate={setScreen}
            onOpenNewModal={() => {
              setSelectedExpense(null);
              setModalOpen(true);
            }}
            onExplainExpense={handleExplainFromRow}
            onRecategorize={handleRecategorize}
            onDeleteExpense={handleDeleteExpense}
            onSelectExpense={(exp) => {
              setSelectedExpense(exp);
              setModalOpen(true);
            }}
            onPayScheduled={handlePayScheduled}
          />
        );
      case 'ledger':
        return (
          <LedgerScreen
            month={selectedMonth}
            expenses={expensesState.data}
            categories={categories}
            filters={expenseFilters}
            loading={expensesState.loading}
            error={expensesState.error}
            onFiltersChange={setExpenseFilters}
            onRetry={expensesState.refetch}
            onOpenNewModal={() => {
              setSelectedExpense(null);
              setModalOpen(true);
            }}
            onExplainExpense={handleExplainFromRow}
            onRecategorize={handleRecategorize}
            onDeleteExpense={handleDeleteExpense}
            onSelectExpense={(exp) => {
              setSelectedExpense(exp);
              setModalOpen(true);
            }}
          />
        );
      case 'budgets':
        return (
          <BudgetsScreen
            month={selectedMonth}
            budgets={budgetsState.data}
            categories={categories}
            loading={budgetsState.loading}
            error={budgetsState.error}
            onRetry={budgetsState.refetch}
            onUpdateLimit={handleUpdateBudgetLimit}
          />
        );
      case 'scheduled':
        return (
          <ScheduledScreen
            scheduled={scheduledState.data}
            categories={categories}
            loading={scheduledState.loading}
            error={scheduledState.error}
            onRetry={scheduledState.refetch}
            onPayScheduled={handlePayScheduled}
            onToggleAutoPay={handleToggleAutoPay}
            onAddScheduled={handleAddScheduled}
          />
        );
      case 'assistant':
        return (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Assistente GastoIA
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Registre gastos em linguagem natural ou envie fotos de recibos
              </p>
            </div>
            <AIAssistantPanel
              messages={chatMessages}
              isLoading={aiLoading}
              onSendPrompt={handleSendAIPrompt}
              onUploadReceipt={handleUploadReceipt}
              onUndoExpense={handleDeleteExpense}
              onRetryLast={
                lastPrompt ? () => handleSendAIPrompt(lastPrompt) : undefined
              }
              expenses={expensesList}
              className="h-[calc(100vh-220px)] min-h-[460px]"
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] transition-colors">
      {/* Cabeçalho compacto mobile com usuário e sair */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-5 glass-surface border-x-0 border-t-0 flex items-center justify-between gap-4">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setScreen('overview');
          }}
          className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
        >
          GastoIA
        </a>

        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            aria-label="Perfil do usuário"
            className="h-9 px-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-bold">
              {userInitial}
            </span>
            <span className="max-w-[90px] truncate">{displayName}</span>
          </button>

          {profileMenuOpen && (
            <div
              className="absolute right-0 top-12 w-64 p-3 rounded-2xl glass-surface shadow-xl space-y-3 z-40"
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {displayName}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-rose-500/12 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sair da conta</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex">
        {/* Barra lateral fixa 260px (Desktop) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-[var(--border-subtle)] bg-[var(--surface-lowest)]/60 p-6 justify-between">
          <div className="space-y-8">
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setScreen('overview');
              }}
              className="block font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap"
            >
              GastoIA
            </a>

            <nav aria-label="Navegação principal" className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScreen(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 h-11 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-indigo-500/15 text-indigo-500 dark:text-[#c0c1ff] font-semibold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Perfil real e tema na barra lateral */}
          <div className="space-y-3 pt-5 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                {userInitial || <UserIcon size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {userEmail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3.5 h-10 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <span>{darkMode ? 'Tema escuro' : 'Tema claro'}</span>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-between px-3.5 h-10 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <span>Sair</span>
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* Área principal */}
        <main className="flex-1 min-w-0 px-5 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          {/* Topo desktop com seletor de mês e identificação do usuário */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-1">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs sm:text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">
                {displayName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{userEmail}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div
              className={
                screen === 'assistant' ? 'xl:col-span-12' : 'xl:col-span-8'
              }
            >
              {renderMainScreen()}
            </div>

            {screen !== 'assistant' && (
              <div className="hidden lg:block xl:col-span-4 lg:sticky lg:top-6">
                <AIAssistantPanel
                  messages={chatMessages}
                  isLoading={aiLoading}
                  onSendPrompt={handleSendAIPrompt}
                  onUploadReceipt={handleUploadReceipt}
                  onUndoExpense={handleDeleteExpense}
                  onRetryLast={
                    lastPrompt ? () => handleSendAIPrompt(lastPrompt) : undefined
                  }
                  expenses={expensesList}
                  className="h-[calc(100vh-48px)] max-h-[780px]"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Navegação mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[58px] glass-surface border-x-0 border-b-0 px-2 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => setScreen('overview')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            screen === 'overview'
              ? 'text-indigo-500 dark:text-[#c0c1ff]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <LayoutDashboard size={19} />
          <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
            Início
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScreen('ledger')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            screen === 'ledger'
              ? 'text-indigo-500 dark:text-[#c0c1ff]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <ListOrdered size={19} />
          <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
            Extrato
          </span>
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setSelectedExpense(null);
              setModalOpen(true);
            }}
            aria-label="Novo lançamento"
            className="w-11 h-11 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform cursor-pointer"
          >
            <Plus size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setScreen('budgets')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            screen === 'budgets'
              ? 'text-indigo-500 dark:text-[#c0c1ff]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <PieChart size={19} />
          <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
            Limites
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScreen('assistant')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            screen === 'assistant'
              ? 'text-indigo-500 dark:text-[#c0c1ff]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <Sparkles size={19} />
          <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
            GastoIA
          </span>
        </button>
      </nav>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl glass-surface shadow-xl text-xs font-semibold text-[var(--text-primary)] border border-indigo-500/30"
        >
          {toast}
        </div>
      )}

      <NewTransactionModal
        open={modalOpen}
        categories={categories}
        selectedExpense={selectedExpense}
        onClose={() => {
          setModalOpen(false);
          setSelectedExpense(null);
        }}
        onCreate={handleCreateExpense}
        onUpdateCategory={handleRecategorize}
        onDelete={handleDeleteExpense}
        onExplain={handleExplainExpenseInline}
      />
    </div>
  );
}

export default function App() {
  const { darkMode, toggleTheme } = useTheme();
  const {
    status,
    configError,
    supabase,
    session,
    user,
    displayName,
    cacheEpoch,
    retryInit,
    signOut,
    clearRecoveryMode,
  } = useAuth();

  if (status === 'loading' || status === 'config_error') {
    return <AuthLoadingScreen error={configError} onRetry={retryInit} />;
  }

  if (status === 'recovery' && supabase) {
    return (
      <ResetPasswordScreen
        supabase={supabase}
        hasSession={Boolean(session)}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onDone={clearRecoveryMode}
      />
    );
  }

  if (status === 'unauthenticated' || !session || !supabase) {
    if (!supabase) {
      return <AuthLoadingScreen error={configError} onRetry={retryInit} />;
    }
    return (
      <AuthScreen
        supabase={supabase}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <AuthenticatedWorkspace
      key={cacheEpoch}
      displayName={displayName}
      userEmail={user?.email ?? ''}
      darkMode={darkMode}
      onToggleTheme={toggleTheme}
      onSignOut={signOut}
    />
  );
}
