import {
  CalendarClock,
  LayoutDashboard,
  ListOrdered,
  Moon,
  PieChart,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { BudgetsScreen } from './components/BudgetsScreen';
import { LedgerScreen } from './components/LedgerScreen';
import { NewTransactionModal } from './components/NewTransactionModal';
import { OverviewScreen } from './components/OverviewScreen';
import { ScheduledScreen } from './components/ScheduledScreen';
import {
  CATEGORY_MAP,
  INITIAL_BUDGETS,
  INITIAL_CHAT,
  INITIAL_SCHEDULED,
  INITIAL_TRANSACTIONS,
} from './data/initialData';
import type {
  BudgetLimit,
  CategoryId,
  ChatMessage,
  PaymentMethod,
  ScheduledTransfer,
  ScreenId,
  Transaction,
} from './types/finance';
import { formatCurrencyInline } from './utils/format';

const BASE_STARTING_BALANCE = 6172.3;

function getCurrentTimeLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gastoia_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const [screen, setScreen] = useState<ScreenId>('overview');

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('gastoia_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => {
    try {
      const saved = localStorage.getItem('gastoia_budgets');
      return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
    } catch {
      return INITIAL_BUDGETS;
    }
  });

  const [scheduled, setScheduled] = useState<ScheduledTransfer[]>(() => {
    try {
      const saved = localStorage.getItem('gastoia_scheduled');
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULED;
    } catch {
      return INITIAL_SCHEDULED;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [aiLoading, setAiLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('gastoia_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('gastoia_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('gastoia_transactions', JSON.stringify(transactions));
    } catch {
      // ignore storage quota errors
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('gastoia_budgets', JSON.stringify(budgets));
    } catch {
      // ignore
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem('gastoia_scheduled', JSON.stringify(scheduled));
    } catch {
      // ignore
    }
  }, [scheduled]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const { monthlyIncome, monthlyExpenses, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      balance: BASE_STARTING_BALANCE + income - expenses,
    };
  }, [transactions]);

  const buildAIContext = () => ({
    balance,
    monthlyIncome,
    monthlyExpenses,
    categories: budgets.map((b) => ({
      name: CATEGORY_MAP[b.category].label,
      spent: transactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((acc, t) => acc + t.amount, 0),
      limit: b.limit,
    })),
    recentTransactions: transactions.slice(0, 12).map((t) => ({
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: CATEGORY_MAP[t.category].label,
      date: t.date,
    })),
  });

  const handleCreateTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(
      `${tx.type === 'income' ? 'Receita' : 'Gasto'} registrado: ${tx.title}`
    );
  };

  const handleRecategorize = (id: string, category: CategoryId) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category } : t))
    );
    setSelectedTx((curr) => (curr && curr.id === id ? { ...curr, category } : curr));
    showToast(`Categoria atualizada para ${CATEGORY_MAP[category].label}`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast('Lançamento removido.');
  };

  const handleUpdateBudgetLimit = (
    category: Exclude<CategoryId, 'income'>,
    limit: number
  ) => {
    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit } : b))
    );
  };

  const handlePayScheduled = (id: string) => {
    const target = scheduled.find((s) => s.id === id);
    if (!target || target.status === 'paid') return;

    setScheduled((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'paid' } : s))
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: target.title,
      amount: target.amount,
      type: 'expense',
      category: target.category,
      paymentMethod: 'Pix',
      date: `2026-11-14T${getCurrentTimeLabel()}`,
      notes: `Pagamento agendado · ${target.recipient}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Pago: ${target.title} (${formatCurrencyInline(target.amount)})`);
  };

  const handleToggleAutoPay = (id: string) => {
    setScheduled((prev) =>
      prev.map((s) => (s.id === id ? { ...s, autoPay: !s.autoPay } : s))
    );
  };

  const handleAddScheduled = (item: Omit<ScheduledTransfer, 'id' | 'status'>) => {
    const created: ScheduledTransfer = {
      ...item,
      id: `sch-${Date.now()}`,
      status: 'scheduled',
    };
    setScheduled((prev) => [created, ...prev]);
    showToast(`Agendamento salvo: ${item.title}`);
  };

  const handleSendAIPrompt = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: getCurrentTimeLabel(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: buildAIContext(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao consultar GastoIA.');
      }

      let createdId: string | undefined;
      if (data.intent === 'create_transaction' && data.transaction?.amount > 0) {
        const validCategory = (
          ['food', 'transport', 'education', 'leisure', 'other', 'income'].includes(
            data.transaction.category
          )
            ? data.transaction.category
            : data.transaction.type === 'income'
            ? 'income'
            : 'other'
        ) as CategoryId;

        const validMethod = (
          ['Pix', 'Crédito', 'Débito', 'Transferência', 'Dinheiro'].includes(
            data.transaction.paymentMethod
          )
            ? data.transaction.paymentMethod
            : 'Pix'
        ) as PaymentMethod;

        const newTx: Transaction = {
          id: `tx-ai-${Date.now()}`,
          title: data.transaction.title || 'Lançamento GastoIA',
          amount: Number(data.transaction.amount),
          type: data.transaction.type === 'income' ? 'income' : 'expense',
          category: validCategory,
          paymentMethod: validMethod,
          date: `2026-11-14T${getCurrentTimeLabel()}`,
          notes: data.transaction.notes,
          aiParsed: true,
        };
        createdId = newTx.id;
        setTransactions((prev) => [newTx, ...prev]);
        showToast(
          `Registrado via IA: ${newTx.title} (${formatCurrencyInline(newTx.amount)})`
        );
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Pronto!',
          timestamp: getCurrentTimeLabel(),
          createdTransactionId: createdId,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Não foi possível completar a solicitação.',
          timestamp: getCurrentTimeLabel(),
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
      timestamp: getCurrentTimeLabel(),
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

      const res = await fetch('/api/ai/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao analisar comprovante.');
      }

      let createdId: string | undefined;
      if (data.readable && data.transaction?.amount > 0) {
        const validCategory = (
          ['food', 'transport', 'education', 'leisure', 'other', 'income'].includes(
            data.transaction.category
          )
            ? data.transaction.category
            : 'other'
        ) as CategoryId;

        const validMethod = (
          ['Pix', 'Crédito', 'Débito', 'Transferência', 'Dinheiro'].includes(
            data.transaction.paymentMethod
          )
            ? data.transaction.paymentMethod
            : 'Pix'
        ) as PaymentMethod;

        const newTx: Transaction = {
          id: `tx-ocr-${Date.now()}`,
          title: data.transaction.title || 'Recibo Digitalizado',
          amount: Number(data.transaction.amount),
          type: data.transaction.type === 'income' ? 'income' : 'expense',
          category: validCategory,
          paymentMethod: validMethod,
          date: `2026-11-14T${getCurrentTimeLabel()}`,
          notes: data.transaction.notes,
          aiParsed: true,
        };
        createdId = newTx.id;
        setTransactions((prev) => [newTx, ...prev]);
        showToast(
          `Recibo lançado: ${newTx.title} (${formatCurrencyInline(newTx.amount)})`
        );
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-ocr-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Comprovante processado.',
          timestamp: getCurrentTimeLabel(),
          createdTransactionId: createdId,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-ocr-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Erro ao processar imagem do recibo.',
          timestamp: getCurrentTimeLabel(),
          error: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplainTransactionInline = async (tx: Transaction): Promise<string> => {
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'explain_transaction',
          transaction: {
            title: tx.title,
            amount: tx.amount,
            type: tx.type,
            category: CATEGORY_MAP[tx.category].label,
            date: tx.date,
            paymentMethod: tx.paymentMethod,
          },
          context: buildAIContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.explanation || 'Sem análise disponível.';
    } catch (err: unknown) {
      return err instanceof Error
        ? err.message
        : 'Não foi possível gerar explicação.';
    }
  };

  const handleExplainFromRow = async (tx: Transaction) => {
    setSelectedTx(tx);
    setModalOpen(true);
  };

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
            balance={balance}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            transactions={transactions}
            budgets={budgets}
            scheduled={scheduled}
            onNavigate={setScreen}
            onOpenNewModal={() => {
              setSelectedTx(null);
              setModalOpen(true);
            }}
            onExplainTransaction={handleExplainFromRow}
            onRecategorize={handleRecategorize}
            onDeleteTransaction={handleDeleteTransaction}
            onSelectTransaction={(tx) => {
              setSelectedTx(tx);
              setModalOpen(true);
            }}
            onPayScheduled={handlePayScheduled}
          />
        );
      case 'ledger':
        return (
          <LedgerScreen
            transactions={transactions}
            onOpenNewModal={() => {
              setSelectedTx(null);
              setModalOpen(true);
            }}
            onExplainTransaction={handleExplainFromRow}
            onRecategorize={handleRecategorize}
            onDeleteTransaction={handleDeleteTransaction}
            onSelectTransaction={(tx) => {
              setSelectedTx(tx);
              setModalOpen(true);
            }}
          />
        );
      case 'budgets':
        return (
          <BudgetsScreen
            budgets={budgets}
            transactions={transactions}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            onUpdateLimit={handleUpdateBudgetLimit}
          />
        );
      case 'scheduled':
        return (
          <ScheduledScreen
            scheduled={scheduled}
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
              onUndoTransaction={handleDeleteTransaction}
              transactions={transactions}
              className="h-[calc(100vh-220px)] min-h-[460px]"
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] transition-colors">
      {/* Mobile / Tablet Compact Sticky Header (<= 56px) */}
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Desktop 1440px Multi-Panel Command Center + Responsive Reflow */}
      <div className="max-w-[1440px] mx-auto flex">
        {/* Fixed 260px Left Sidebar (Desktop) */}
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

          <div className="space-y-3 pt-6 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 h-10 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <span>{darkMode ? 'Tema escuro' : 'Tema claro'}</span>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </aside>

        {/* Primary Content + Desktop 4-Col AI Rail */}
        <main className="flex-1 min-w-0 px-5 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Primary Analytical Workspace (8 cols on xl) */}
            <div className={screen === 'assistant' ? 'xl:col-span-12' : 'xl:col-span-8'}>
              {renderMainScreen()}
            </div>

            {/* Persistent AI Assistant Rail on Desktop (4 cols on xl) */}
            {screen !== 'assistant' && (
              <div className="hidden lg:block xl:col-span-4 lg:sticky lg:top-6">
                <AIAssistantPanel
                  messages={chatMessages}
                  isLoading={aiLoading}
                  onSendPrompt={handleSendAIPrompt}
                  onUploadReceipt={handleUploadReceipt}
                  onUndoTransaction={handleDeleteTransaction}
                  transactions={transactions}
                  className="h-[calc(100vh-48px)] max-h-[780px]"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Persistent Bottom Tab Bar (Compact 58px height) */}
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
              setSelectedTx(null);
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

      {/* Dynamic Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl glass-surface shadow-xl text-xs font-semibold text-[var(--text-primary)] border border-indigo-500/30"
        >
          {toast}
        </div>
      )}

      {/* Transaction Create / Inspect Modal */}
      <NewTransactionModal
        open={modalOpen}
        selectedTransaction={selectedTx}
        onClose={() => {
          setModalOpen(false);
          setSelectedTx(null);
        }}
        onCreate={handleCreateTransaction}
        onUpdateCategory={handleRecategorize}
        onDelete={handleDeleteTransaction}
        onExplain={handleExplainTransactionInline}
      />
    </div>
  );
}
