import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, configureApiAuth } from '../lib/api';
import { initSupabaseClient } from '../lib/supabase';

export type AuthStatus =
  | 'loading'
  | 'config_error'
  | 'authenticated'
  | 'unauthenticated'
  | 'recovery';

interface AuthContextValue {
  status: AuthStatus;
  configError: string | null;
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  displayName: string;
  cacheEpoch: number;
  retryInit: () => void;
  signOut: () => Promise<void>;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [configError, setConfigError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [initAttempt, setInitAttempt] = useState(0);

  const retryInit = useCallback(() => {
    setInitAttempt((a) => a + 1);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // segue com limpeza local mesmo se rede falhar
      }
    }
    bootstrapInFlightRef.current = null;
    setBootstrappedUserId(null);
    setSession(null);
    setCacheEpoch((e) => e + 1);
    setStatus('unauthenticated');
    if (window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
  }, [supabase]);

  const clearRecoveryMode = useCallback(() => {
    if (session) {
      setStatus('authenticated');
      window.history.replaceState(null, '', '/');
    } else {
      setStatus('unauthenticated');
      window.history.replaceState(null, '', '/login');
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function bootstrap() {
      setStatus('loading');
      setConfigError(null);

      try {
        const client = await initSupabaseClient();
        if (!active) return;

        setSupabase(client);

        configureApiAuth({
          getAccessToken: async () => {
            const { data } = await client.auth.getSession();
            return data.session?.access_token ?? null;
          },
          onUnauthorized: async () => {
            try {
              await client.auth.signOut();
            } catch {
              // ignore
            }
            if (active) {
              setSession(null);
              setCacheEpoch((e) => e + 1);
              setStatus('unauthenticated');
              if (window.location.pathname !== '/login') {
                window.history.replaceState(null, '', '/login');
              }
            }
          },
        });

        const {
          data: { subscription: authSub },
        } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          setSession(nextSession);

          if (event === 'PASSWORD_RECOVERY') {
            setStatus('recovery');
            if (window.location.pathname !== '/redefinir-senha') {
              window.history.replaceState(null, '', '/redefinir-senha');
            }
            return;
          }

          if (event === 'SIGNED_OUT') {
            setCacheEpoch((e) => e + 1);
            setStatus('unauthenticated');
            if (window.location.pathname !== '/login') {
              window.history.replaceState(null, '', '/login');
            }
            return;
          }

          if (nextSession) {
            if (window.location.pathname === '/redefinir-senha') {
              setStatus('recovery');
            } else {
              setStatus('authenticated');
              if (window.location.pathname === '/login') {
                window.history.replaceState(null, '', '/');
              }
            }
          } else {
            setStatus(
              window.location.pathname === '/redefinir-senha'
                ? 'recovery'
                : 'unauthenticated'
            );
          }
        });
        subscription = authSub;

        const { data } = await client.auth.getSession();
        if (!active) return;

        const currentSession = data.session;
        setSession(currentSession);

        const isResetPath = window.location.pathname === '/redefinir-senha';
        const hasRecoveryHash = window.location.hash.includes('type=recovery');

        if (isResetPath || hasRecoveryHash) {
          setStatus('recovery');
        } else if (currentSession) {
          setStatus('authenticated');
          if (window.location.pathname === '/login') {
            window.history.replaceState(null, '', '/');
          }
        } else {
          setStatus('unauthenticated');
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
        }
      } catch (err) {
        if (!active) return;
        setConfigError(
          err instanceof Error
            ? err.message
            : 'Erro ao iniciar autenticação.'
        );
        setStatus('config_error');
      }
    }

    bootstrap();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [initAttempt]);

  const [bootstrappedUserId, setBootstrappedUserId] = useState<string | null>(
    null
  );
  const bootstrapInFlightRef = useRef<string | null>(null);

  // Garante categorias padrão no Supabase imediatamente após o login (idempotente)
  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== 'authenticated' || !userId) {
      if (status === 'unauthenticated') {
        setBootstrappedUserId(null);
      }
      return;
    }

    if (
      bootstrappedUserId === userId ||
      bootstrapInFlightRef.current === userId
    ) {
      return;
    }

    let active = true;
    bootstrapInFlightRef.current = userId;
    api
      .bootstrap()
      .catch(() => {
        // Se falhar momentaneamente, permite o carregamento normal do workspace
      })
      .finally(() => {
        if (bootstrapInFlightRef.current === userId) {
          bootstrapInFlightRef.current = null;
        }
        if (active) {
          setBootstrappedUserId(userId);
        }
      });

    return () => {
      active = false;
    };
  }, [status, session, bootstrappedUserId]);

  const effectiveStatus: AuthStatus =
    status === 'authenticated' &&
    session?.user?.id &&
    bootstrappedUserId !== session.user.id
      ? 'loading'
      : status;

  const user = session?.user ?? null;
  const displayName = useMemo(() => {
    if (!user) return '';
    const meta = user.user_metadata as
      | { full_name?: string; name?: string }
      | undefined;
    const rawName = meta?.full_name || meta?.name;
    if (rawName && rawName.trim()) return rawName.trim();
    if (user.email) return user.email.split('@')[0];
    return 'Usuário';
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: effectiveStatus,
      configError,
      supabase,
      session,
      user,
      displayName,
      cacheEpoch,
      retryInit,
      signOut,
      clearRecoveryMode,
    }),
    [
      effectiveStatus,
      configError,
      supabase,
      session,
      user,
      displayName,
      cacheEpoch,
      retryInit,
      signOut,
      clearRecoveryMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
