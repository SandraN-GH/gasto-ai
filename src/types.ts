export type PaymentMethod =
  | 'Pix'
  | 'Crédito'
  | 'Débito'
  | 'Transferência'
  | 'Dinheiro';

export type ExpenseSource = 'image' | 'text' | 'manual';

export type ScreenId =
  | 'overview'
  | 'ledger'
  | 'budgets'
  | 'reports'
  | 'assistant'
  | 'settings';

// Categoria persistida no Supabase (por usuário)
export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budget_cents: number;
  is_default: number;
  created_at: string;
}

// Despesa persistida no Supabase (valores em centavos inteiros)
export interface Expense {
  id: string;
  user_id: string;
  amount_cents: number;
  expense_date: string; // YYYY-MM-DD
  merchant: string | null;
  category_id: string;
  payment_method: string | null;
  notes: string | null;
  source: ExpenseSource | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
}

// Campo extraído pela IA com nível de confiança individual (0 a 1)
export interface FieldConfidence<T> {
  value: T;
  confidence: number;
}

// Rascunho devolvido por POST /api/ai/parse para revisão do usuário
export interface ExpenseDraft {
  amount_cents: FieldConfidence<number>;
  expense_date: FieldConfidence<string>;
  merchant: FieldConfidence<string>;
  category_id: FieldConfidence<string>;
  category_name: string;
  payment_method: FieldConfidence<string>;
  notes: string | null;
  source: 'image' | 'text';
  overall_confidence: number;
  fallback_used: boolean;
}

export interface Budget {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  budget_cents: number;
  spent_cents: number;
  used_pct: number;
}

export interface DailySeriesPoint {
  date: string; // YYYY-MM-DD
  total_cents: number;
}

export interface MerchantSummary {
  merchant: string;
  count: number;
  total_cents: number;
}

export interface DashboardInsight {
  id: string;
  kind: 'budget_alert' | 'category_variation' | 'largest_expense';
  severity: 'info' | 'warning' | 'alert' | 'positive';
  title: string;
  description: string;
}

export interface DashboardData {
  month: string; // YYYY-MM
  total_cents: number;
  previous_month_cents: number;
  variation_pct: number | null;
  by_category: Budget[];
  daily_series: DailySeriesPoint[];
  recent_expenses: Expense[];
  top_merchants: MerchantSummary[];
  insights: DashboardInsight[];
}

export interface ReportsData {
  period: 'week' | 'month' | 'year';
  from: string;
  to: string;
  summary: {
    total_cents: number;
    count: number;
    average_cents: number;
  };
  by_category: Array<{
    category_id: string;
    category_name: string;
    category_color: string | null;
    category_icon: string | null;
    total_cents: number;
    count: number;
  }>;
  series: Array<{
    bucket: string;
    total_cents: number;
    count: number;
  }>;
  top_merchants: MerchantSummary[];
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: string;
  min?: number;
  max?: number;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface ExpensesPage {
  items: Expense[];
  next_cursor: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  draft?: ExpenseDraft;
  error?: boolean;
  errorCode?: string;
}
