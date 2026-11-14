export type PaymentMethod =
  | 'Pix'
  | 'Crédito'
  | 'Débito'
  | 'Transferência'
  | 'Dinheiro';

export type ScreenId =
  | 'overview'
  | 'ledger'
  | 'budgets'
  | 'scheduled'
  | 'assistant';

// Categoria persistida no D1 (por usuário)
export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  type: 'expense' | 'income';
}

// Lançamento financeiro com valores em centavos (inteiro)
export interface Expense {
  id: string;
  title: string;
  amount_cents: number;
  type: 'expense' | 'income';
  category_id: string;
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  payment_method: PaymentMethod;
  occurred_at: string; // ISO 8601
  notes?: string | null;
  ai_parsed?: boolean;
}

// Valor extraído pela IA com nível de confiança individual (0 a 1)
export interface FieldConfidence<T> {
  value: T;
  confidence: number;
}

// Rascunho de lançamento gerado pela IA com confiança por campo
export interface ExpenseDraft {
  title: FieldConfidence<string>;
  amount_cents: FieldConfidence<number>;
  type: FieldConfidence<'expense' | 'income'>;
  category_id: FieldConfidence<string>;
  category_name?: string;
  payment_method: FieldConfidence<PaymentMethod>;
  occurred_at: FieldConfidence<string>;
  notes?: string;
}

// Orçamento mensal por categoria (centavos inteiros)
export interface Budget {
  id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_color: string;
  month: string; // YYYY-MM
  limit_cents: number;
  spent_cents: number;
}

export interface CashflowSeriesPoint {
  label: string;
  date_key: string;
  income_cents: number;
  expense_cents: number;
}

export interface ScheduledTransfer {
  id: string;
  title: string;
  recipient: string;
  amount_cents: number;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  due_date: string; // YYYY-MM-DD
  recurrence: 'Mensal' | 'Única' | 'Anual';
  auto_pay: boolean;
  status: 'scheduled' | 'paid' | 'due_soon';
}

// Dados agregados da tela Visão Geral
export interface DashboardData {
  month: string; // YYYY-MM
  balance_cents: number;
  monthly_income_cents: number;
  monthly_expense_cents: number;
  savings_rate: number;
  cashflow_7d: CashflowSeriesPoint[];
  cashflow_30d: CashflowSeriesPoint[];
  cashflow_6m: CashflowSeriesPoint[];
  budgets: Budget[];
  recent_expenses: Expense[];
  upcoming_scheduled: ScheduledTransfer[];
}

export interface ExpenseFilters {
  month?: string;
  search?: string;
  type?: 'all' | 'expense' | 'income';
  category_id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_expense_id?: string;
  draft?: ExpenseDraft;
  error?: boolean;
}

export interface BudgetRecommendation {
  category_id?: string;
  category_name: string;
  suggested_limit_cents: number;
  reason: string;
}
