import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { requireAuth } from './auth';
import { errorResponse } from './errors';
import { aiRoute } from './routes/ai';
import { bootstrapRoute } from './routes/bootstrap';
import { budgetsRoute } from './routes/budgets';
import { categoriesRoute } from './routes/categories';
import { configRoute } from './routes/config';
import { dashboardRoute } from './routes/dashboard';
import { expensesRoute } from './routes/expenses';
import { exportRoute } from './routes/export';
import { reportsRoute } from './routes/reports';
import {
  bodySizeLimitMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
} from './security';
import type { Env, Variables } from './types';

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Cabeçalhos de segurança em TODAS as respostas (API e Static Assets)
app.use('*', securityHeadersMiddleware);

// Limite de corpo (5 MB) para toda a API
app.use('/api/*', bodySizeLimitMiddleware);

// Tratamento global de erros: loga apenas código e rota (nunca tokens, e-mails ou notas)
app.onError((err, c) => {
  const code = err instanceof SyntaxError ? 'INVALID_JSON' : 'INTERNAL_ERROR';
  console.error(JSON.stringify({ level: 'error', code, route: `${c.req.method} ${c.req.path}` }));
  return errorResponse(
    c,
    500,
    code,
    'Ocorreu um erro interno ao processar sua solicitação. Tente novamente.'
  );
});

// Rota pública de configuração (com rate limit por IP)
app.use('/api/config', rateLimitMiddleware);
app.route('/api', configRoute);

// Todas as demais rotas /api/* exigem autenticação via Supabase + rate limit por usuário (120/min)
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/config') {
    return next();
  }
  return requireAuth(c, next);
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/config') {
    return next();
  }
  return rateLimitMiddleware(c, next);
});

app.route('/api', bootstrapRoute);
app.route('/api', categoriesRoute);
app.route('/api', expensesRoute);
app.route('/api', dashboardRoute);
app.route('/api', reportsRoute);
app.route('/api', budgetsRoute);
app.route('/api', exportRoute);
app.route('/api', aiRoute);

// 404 padronizado para rotas inexistentes da API
app.all('/api/*', (c) => {
  return errorResponse(c, 404, 'NOT_FOUND', 'Rota da API não encontrada.');
});

// Demais rotas são atendidas pelos Static Assets (SPA)
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return errorResponse(c, 404, 'NOT_FOUND', 'Recurso não encontrado.');
});

async function pingSupabaseHealth(env: Env): Promise<void> {
  const supabaseUrl = (env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY ?? '';

  if (
    !supabaseUrl ||
    supabaseUrl.includes('COLE_AQUI') ||
    !supabaseUrl.startsWith('http')
  ) {
    return;
  }

  try {
    const headers: Record<string, string> = {};
    if (supabaseKey && !supabaseKey.includes('COLE_AQUI')) {
      headers.apikey = supabaseKey;
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      console.error(
        JSON.stringify({
          level: 'warn',
          code: `SUPABASE_HEALTH_${res.status}`,
          route: 'CRON /auth/v1/health',
        })
      );
    }
  } catch {
    console.error(
      JSON.stringify({
        level: 'error',
        code: 'SUPABASE_HEALTH_FAILED',
        route: 'CRON /auth/v1/health',
      })
    );
  }
}

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(pingSupabaseHealth(env));
  },
};
