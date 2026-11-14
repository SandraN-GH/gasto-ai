import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { ReportsData } from '../types';

export function useReports(
  period: 'week' | 'month' | 'year',
  from?: string,
  to?: string
) {
  const [data, setData] = useState<ReportsData | null>(null);
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
        const result = await api.getReports(
          period,
          from || undefined,
          to || undefined,
          controller.signal
        );
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.code === 'ABORTED') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os relatórios.'
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
  }, [period, from, to, reloadKey]);

  return { data, loading, error, refetch };
}
