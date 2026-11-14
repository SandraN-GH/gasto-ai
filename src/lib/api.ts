import type {
  Category,
  DashboardData,
  Expense,
  ExpenseDraft,
  ExpenseFilters,
  ExpenseSource,
  ExpensesPage,
  ReportsData,
} from '../types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type TokenGetter = () => Promise<string | null> | string | null;
type UnauthorizedHandler = () => Promise<void> | void;

let getAccessTokenFn: TokenGetter = () => null;
let onUnauthorizedFn: UnauthorizedHandler = () => {};

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
      throw new ApiError('A solicitação foi cancelada.', 0, 'ABORTED');
    }
    throw new ApiError(
      'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (response.status === 401) {
    await onUnauthorizedFn();
    throw new ApiError(
      'Sua sessão expirou. Faça login novamente.',
      401,
      'UNAUTHORIZED'
    );
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
    let serverMessage: string | undefined;
    let serverCode: string | undefined;

    if (parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody) {
      const errVal = (parsedBody as { error?: unknown }).error;
      if (typeof errVal === 'string') {
        serverMessage = errVal;
      } else if (errVal && typeof errVal === 'object') {
        const obj = errVal as { code?: unknown; message?: unknown };
        if (typeof obj.message === 'string') serverMessage = obj.message;
        if (typeof obj.code === 'string') serverCode = obj.code;
      }
    }

    throw new ApiError(
      mapStatusToPortuguese(response.status, serverMessage),
      response.status,
      serverCode
    );
  }

  if (response.status === 204 || parsedBody === null) {
    return undefined as T;
  }

  return parsedBody as T;
}

export interface CreateExpensePayload {
  amount_cents: number;
  expense_date: string;
  merchant?: string | null;
  category_id: string;
  payment_method?: string | null;
  notes?: string | null;
  source?: ExpenseSource;
  ai_confidence?: number | null;
}

export interface AIParseResponse {
  draft: ExpenseDraft;
  remaining_daily_quota: number;
}

export const api = {
  bootstrap() {
    return apiFetch<{ created: boolean; categories: Category[] }>(
      '/api/bootstrap',
      { method: 'POST' }
    );
  },

  getDashboard(month: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ month });
    return apiFetch<DashboardData>(`/api/dashboard?${params.toString()}`, {
      signal,
    });
  },

  getExpenses(filters: ExpenseFilters = {}, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category && filters.category !== 'all') {
      params.set('category', filters.category);
    }
    if (filters.min !== undefined) params.set('min', String(filters.min));
    if (filters.max !== undefined) params.set('max', String(filters.max));
    if (filters.q) params.set('q', filters.q);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.cursor) params.set('cursor', filters.cursor);

    const qs = params.toString();
    return apiFetch<ExpensesPage>(`/api/expenses${qs ? `?${qs}` : ''}`, {
      signal,
    });
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
    return apiFetch<{ deleted: boolean }>(
      `/api/expenses/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  getCategories(signal?: AbortSignal) {
    return apiFetch<Category[]>('/api/categories', { signal });
  },

  createCategory(payload: {
    name: string;
    icon?: string;
    color?: string;
    budget_cents?: number;
  }) {
    return apiFetch<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCategory(
    id: string,
    payload: {
      name?: string;
      icon?: string;
      color?: string;
      budget_cents?: number;
    }
  ) {
    return apiFetch<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteCategory(id: string, reassignTo?: string) {
    const qs = reassignTo
      ? `?reassign_to=${encodeURIComponent(reassignTo)}`
      : '';
    return apiFetch<{ deleted: boolean; reassigned_expenses: number }>(
      `/api/categories/${encodeURIComponent(id)}${qs}`,
      { method: 'DELETE' }
    );
  },

  upsertBudget(payload: { category_id: string; budget_cents: number }) {
    return apiFetch<Category>('/api/budgets', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getReports(
    period: 'week' | 'month' | 'year',
    from?: string,
    to?: string,
    signal?: AbortSignal
  ) {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiFetch<ReportsData>(`/api/reports?${params.toString()}`, {
      signal,
    });
  },

  parseExpenseText(text: string, signal?: AbortSignal) {
    return apiFetch<AIParseResponse>('/api/ai/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
      signal,
    });
  },

  parseExpenseImage(file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append('image', file);
    return apiFetch<AIParseResponse>('/api/ai/parse', {
      method: 'POST',
      body: formData,
      signal,
    });
  },

  async downloadExportCsv() {
    const token = await getAccessTokenFn();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let res: Response;
    try {
      res = await fetch('/api/export.csv', { headers });
    } catch {
      throw new ApiError(
        'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
        0,
        'NETWORK_ERROR'
      );
    }

    if (res.status === 401) {
      await onUnauthorizedFn();
      throw new ApiError(
        'Sua sessão expirou. Faça login novamente.',
        401,
        'UNAUTHORIZED'
      );
    }

    if (!res.ok) {
      let msg = 'Não foi possível exportar o CSV agora.';
      try {
        const body = (await res.json()) as {
          error?: { message?: string } | string;
        };
        if (typeof body?.error === 'string') msg = body.error;
        else if (body?.error && typeof body.error.message === 'string') {
          msg = body.error.message;
        }
      } catch {
        msg = mapStatusToPortuguese(res.status);
      }
      throw new ApiError(msg, res.status);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gastoia-despesas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
