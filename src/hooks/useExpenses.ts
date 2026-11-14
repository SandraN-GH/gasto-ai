import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Expense, ExpenseFilters } from '../types';

export function useExpenses(filters: ExpenseFilters = {}) {
  const [data, setData] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const month = filters.month ?? '';
  const search = filters.search ?? '';
  const type = filters.type ?? 'all';
  const categoryId = filters.category_id ?? 'all';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getExpenses(
          {
            month: month || undefined,
            search: search || undefined,
            type,
            category_id: categoryId,
          },
          controller.signal
        );
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof ApiError && err.message === 'A solicitação foi cancelada.') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar o extrato.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [month, search, type, categoryId, reloadKey]);

  return { data, loading, error, refetch };
}
