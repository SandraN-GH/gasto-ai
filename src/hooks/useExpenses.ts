import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Expense, ExpenseFilters } from '../types';

export function useExpenses(filters: ExpenseFilters = {}) {
  const [data, setData] = useState<Expense[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const from = filters.from ?? '';
  const to = filters.to ?? '';
  const category = filters.category ?? '';
  const min = filters.min;
  const max = filters.max;
  const q = filters.q ?? '';
  const limit = filters.limit ?? 25;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getExpenses(
          {
            from: from || undefined,
            to: to || undefined,
            category: category || undefined,
            min,
            max,
            q: q || undefined,
            limit,
          },
          controller.signal
        );
        if (active) {
          setData(result.items);
          setNextCursor(result.next_cursor);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.code === 'ABORTED') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar as despesas.'
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
  }, [from, to, category, min, max, q, limit, reloadKey]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.getExpenses({
        from: from || undefined,
        to: to || undefined,
        category: category || undefined,
        min,
        max,
        q: q || undefined,
        limit,
        cursor: nextCursor,
      });
      setData((prev) => [...(prev ?? []), ...result.items]);
      setNextCursor(result.next_cursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar mais despesas.'
      );
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, from, to, category, min, max, q, limit]);

  return { data, nextCursor, loading, loadingMore, error, refetch, loadMore };
}
