import type {
  Budget,
  BudgetRecommendation,
  Category,
  DashboardData,
  Expense,
  ExpenseDraft,
  ExpenseFilters,
  PaymentMethod,
  ScheduledTransfer,
} from '../types';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type TokenGetter = () => Promise<string | null> | string | null;
type UnauthorizedHandler = () => Promise<void> | void;

let getAccessTokenFn: TokenGetter = () => null;
let onUnauthorizedFn: UnauthorizedHandler = () => {};

// Registra os callbacks de autenticação do Supabase quando o login for conectado
export function configureApiAuth(handlers: {
  getAccessToken: TokenGetter;
  onUnauthorized: UnauthorizedHandler;
}) {
  getAccessTokenFn = handlers.getAccessToken;
  onUnauthorizedFn = handlers.onUnauthorized;
}

function mapStatusToPortuguese(status: number, serverMessage?: string): string {
  if (serverMessage && serverMessage.trim().length > 0) {
    return serverMessage;
  }
  switch (status) {
    case 400:
      return 'Os dados enviados são inválidos. Verifique e tente novamente.';
    case 401:
      return 'Sua sessão expirou. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para realizar esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 429:
      return 'Muitas solicitações em sequência. Aguarde alguns instantes.';
    case 500:
    case 502:
    case 503:
      return 'O servidor está temporariamente indisponível. Tente novamente em instantes.';
    default:
      return 'Não foi possível concluir a solicitação. Tente novamente.';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessTokenFn();

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('A solicitação foi cancelada.', 0);
    }
    throw new ApiError(
      'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      0
    );
  }

  if (response.status === 401) {
    await onUnauthorizedFn();
    throw new ApiError('Sua sessão expirou. Faça login novamente.', 401);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let parsedBody: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    const serverMessage =
      parsedBody &&
      typeof parsedBody === 'object' &&
      'error' in parsedBody &&
      typeof (parsedBody as { error?: unknown }).error === 'string'
        ? (parsedBody as { error: string }).error
        : undefined;
    throw new ApiError(
      mapStatusToPortuguese(response.status, serverMessage),
      response.status
    );
  }

  if (response.status === 204 || parsedBody === null) {
    return undefined as T;
  }

  return parsedBody as T;
}

export interface CreateExpensePayload {
  title: string;
  amount_cents: number;
  type: 'expense' | 'income';
  category_id: string;
  payment_method: PaymentMethod;
  occurred_at: string;
  notes?: string;
  ai_parsed?: boolean;
}

export interface AIAssistantResponse {
  intent: 'create_transaction' | 'answer_question';
  reply: string;
  draft?: ExpenseDraft;
  created_expense?: Expense;
}

export interface AIReceiptResponse {
  readable: boolean;
  reply: string;
  draft?: ExpenseDraft;
  created_expense?: Expense;
}

export const api = {
  getDashboard(month: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ month });
    return apiFetch<DashboardData>(`/api/dashboard?${params.toString()}`, {
      signal,
    });
  },

  getExpenses(filters: ExpenseFilters = {}, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (filters.month) params.set('month', filters.month);
    if (filters.search) params.set('search', filters.search);
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.category_id && filters.category_id !== 'all') {
      params.set('category_id', filters.category_id);
    }
    const qs = params.toString();
    return apiFetch<Expense[]>(`/api/expenses${qs ? `?${qs}` : ''}`, { signal });
  },

  createExpense(payload: CreateExpensePayload) {
    return apiFetch<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateExpense(id: string, payload: Partial<CreateExpensePayload>) {
    return apiFetch<Expense>(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteExpense(id: string) {
    return apiFetch<void>(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getCategories(signal?: AbortSignal) {
    return apiFetch<Category[]>('/api/categories', { signal });
  },

  getBudgets(month: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ month });
    return apiFetch<Budget[]>(`/api/budgets?${params.toString()}`, { signal });
  },

  upsertBudget(payload: {
    category_id: string;
    month: string;
    limit_cents: number;
  }) {
    return apiFetch<Budget>('/api/budgets', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getScheduled(signal?: AbortSignal) {
    return apiFetch<ScheduledTransfer[]>('/api/scheduled', { signal });
  },

  createScheduled(payload: {
    title: string;
    recipient: string;
    amount_cents: number;
    category_id: string;
    due_date: string;
    recurrence: 'Mensal' | 'Única' | 'Anual';
    auto_pay: boolean;
  }) {
    return apiFetch<ScheduledTransfer>('/api/scheduled', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  payScheduled(id: string) {
    return apiFetch<{ scheduled: ScheduledTransfer; expense: Expense }>(
      `/api/scheduled/${encodeURIComponent(id)}/pay`,
      { method: 'POST' }
    );
  },

  toggleScheduledAutoPay(id: string, auto_pay: boolean) {
    return apiFetch<ScheduledTransfer>(
      `/api/scheduled/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ auto_pay }),
      }
    );
  },

  askAssistant(prompt: string, month: string) {
    return apiFetch<AIAssistantResponse>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt, month }),
    });
  },

  parseReceipt(imageBase64: string, mimeType: string) {
    return apiFetch<AIReceiptResponse>('/api/ai/receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  },

  explainExpense(expenseId: string) {
    return apiFetch<{ explanation: string }>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ mode: 'explain_transaction', expense_id: expenseId }),
    });
  },

  optimizeBudgets(month: string) {
    return apiFetch<{
      summary: string;
      recommendations: BudgetRecommendation[];
    }>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ mode: 'optimize_budgets', month }),
    });
  },
};
