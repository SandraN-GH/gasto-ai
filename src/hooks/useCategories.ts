import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Category } from '../types';

export function useCategories() {
  const [data, setData] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getCategories(controller.signal);
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
            : 'Não foi possível carregar as categorias.'
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
  }, [reloadKey]);

  return { data, loading, error, refetch };
}
