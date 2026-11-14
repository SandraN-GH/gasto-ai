export type CategoryId =
  | 'food'
  | 'transport'
  | 'education'
  | 'leisure'
  | 'other'
  | 'income';

export type ScreenId =
  | 'overview'
  | 'ledger'
  | 'budgets'
  | 'scheduled'
  | 'assistant';

export type PaymentMethod =
  | 'Pix'
  | 'Crédito'
  | 'Débito'
  | 'Transferência'
  | 'Dinheiro';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  bgTint: string;
  textColor: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: CategoryId;
  paymentMethod: PaymentMethod;
  date: string; // ISO string YYYY-MM-DDTHH:mm
  notes?: string;
  aiParsed?: boolean;
}

export interface BudgetLimit {
  category: Exclude<CategoryId, 'income'>;
  limit: number;
}

export interface ScheduledTransfer {
  id: string;
  title: string;
  recipient: string;
  amount: number;
  category: Exclude<CategoryId, 'income'>;
  dueDate: string; // YYYY-MM-DD
  recurrence: 'Mensal' | 'Única' | 'Anual';
  autoPay: boolean;
  status: 'scheduled' | 'paid' | 'due_soon';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  createdTransactionId?: string;
  error?: boolean;
}

export interface BudgetRecommendation {
  categoryName: string;
  suggestedLimit: number;
  reason: string;
}
