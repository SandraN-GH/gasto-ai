import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Budget } from '../types';
import { getCurrentSaoPauloMonth } from '../utils/format';

// Carrega orçamentos por categoria com base no resumo mensal do dashboard
export function useBudgets(month: string = getCurrentSaoPauloMonth()) {
  const [data, setData] = useState<Budget[] | null>(null);
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
        const dash = await api.getDashboard(month, controller.signal);
        if (active) {
          setData(dash.by_category);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.code === 'ABORTED') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os orçamentos.'
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
  }, [month, reloadKey]);

  return { data, loading, error, refetch };
}
