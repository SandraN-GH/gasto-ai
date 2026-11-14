import type { MiddlewareHandler } from 'hono';
import { errorResponse } from './errors';
import { createUserSupabase } from './supabase';
import type { Env, Variables } from './types';

interface SupabaseUserResponse {
  id?: string;
  email?: string;
}

// Middleware que exige Bearer token e valida no Supabase (/auth/v1/user)
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(
      c,
      401,
      'UNAUTHORIZED',
      'Autenticação necessária. Faça login para continuar.'
    );
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return errorResponse(
      c,
      401,
      'UNAUTHORIZED',
      'Token de acesso ausente.'
    );
  }

  const supabaseUrl = (c.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const supabaseKey = c.env.SUPABASE_PUBLISHABLE_KEY ?? '';

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('COLE_AQUI') ||
    supabaseKey.includes('COLE_AQUI')
  ) {
    return errorResponse(
      c,
      500,
      'CONFIG_ERROR',
      'Configuração de autenticação do servidor incompleta.'
    );
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    });

    if (!res.ok) {
      return errorResponse(
        c,
        401,
        'UNAUTHORIZED',
        'Sua sessão expirou ou é inválida. Faça login novamente.'
      );
    }

    const user = (await res.json()) as SupabaseUserResponse;
    if (!user?.id) {
      return errorResponse(
        c,
        401,
        'UNAUTHORIZED',
        'Não foi possível identificar o usuário autenticado.'
      );
    }

    c.set('userId', user.id);
    c.set('userEmail', user.email ?? null);
    c.set('accessToken', token);
    c.set('supabase', createUserSupabase(c.env, token));
    await next();
  } catch {
    return errorResponse(
      c,
      503,
      'AUTH_UNAVAILABLE',
      'Serviço de autenticação temporariamente indisponível.'
    );
  }
};
