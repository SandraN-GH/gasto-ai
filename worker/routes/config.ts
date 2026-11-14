import { Hono } from 'hono';
import { errorResponse } from '../errors';
import type { Env, Variables } from '../types';

export const configRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// Rota pública para o frontend inicializar o cliente Supabase
configRoute.get('/config', (c) => {
  const supabaseUrl = c.env.SUPABASE_URL ?? '';
  const supabasePublishableKey = c.env.SUPABASE_PUBLISHABLE_KEY ?? '';

  if (
    !supabaseUrl ||
    !supabasePublishableKey ||
    supabaseUrl.includes('COLE_AQUI') ||
    supabaseKeyLooksUnconfigured(supabasePublishableKey)
  ) {
    return errorResponse(
      c,
      503,
      'CONFIG_NOT_READY',
      'Configuração pública do servidor ainda não foi preenchida.'
    );
  }

  return c.json({
    supabaseUrl,
    supabasePublishableKey,
  });
});

function supabaseKeyLooksUnconfigured(key: string): boolean {
  return key.includes('COLE_AQUI');
}
