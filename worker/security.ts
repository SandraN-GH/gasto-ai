import type { MiddlewareHandler } from 'hono';
import { errorResponse } from './errors';
import type { Env, Variables } from './types';

export const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
export const RATE_LIMIT_MAX_REQUESTS = 120;
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function extractSupabaseOrigin(supabaseUrl: string | undefined): string {
  if (!supabaseUrl || supabaseUrl.includes('COLE_AQUI')) {
    return '';
  }
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {
    return '';
  }
  return '';
}

export function buildContentSecurityPolicy(supabaseUrl: string | undefined): string {
  const supabaseOrigin = extractSupabaseOrigin(supabaseUrl);
  const connectSrc = supabaseOrigin ? `'self' ${supabaseOrigin}` : `'self'`;

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

// Aplica cabeçalhos de segurança em TODAS as respostas do Worker (API e Static Assets)
export const securityHeadersMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  await next();

  const csp = buildContentSecurityPolicy(c.env.SUPABASE_URL);

  // Garante Response com headers mutáveis (ex.: respostas vindas de env.ASSETS.fetch)
  const secured = new Response(c.res.body, c.res);
  secured.headers.set('Content-Security-Policy', csp);
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  secured.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), payment=(), usb=()'
  );

  c.res = secured;
};

// Rejeita requisições acima de 5 MB antes de processar os handlers
export const bodySizeLimitMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const contentLengthHeader = c.req.header('Content-Length');
  if (contentLengthHeader !== undefined) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength > MAX_REQUEST_BODY_BYTES) {
      return errorResponse(
        c,
        413,
        'PAYLOAD_TOO_LARGE',
        'O tamanho da requisição excede o limite máximo de 5 MB.'
      );
    }
  } else if (
    c.req.method === 'POST' ||
    c.req.method === 'PUT' ||
    c.req.method === 'PATCH'
  ) {
    try {
      const clone = c.req.raw.clone();
      const buf = await clone.arrayBuffer();
      if (buf.byteLength > MAX_REQUEST_BODY_BYTES) {
        return errorResponse(
          c,
          413,
          'PAYLOAD_TOO_LARGE',
          'O tamanho da requisição excede o limite máximo de 5 MB.'
        );
      }
    } catch {
      return errorResponse(
        c,
        400,
        'INVALID_BODY',
        'Não foi possível ler o corpo da requisição.'
      );
    }
  }

  await next();
};

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Limpeza preventiva para evitar crescimento ilimitado de chaves expiradas
  if (rateBuckets.size > 2000) {
    for (const [k, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) {
        rateBuckets.delete(k);
      }
    }
  }

  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// Limite simples de 120 requisições/minuto por usuário autenticado (ou IP em /api/config)
export const rateLimitMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const userId = c.get('userId');
  const key = userId
    ? `u:${userId}`
    : `ip:${c.req.header('CF-Connecting-IP') ?? 'unknown'}`;

  const result = checkRateLimit(key);
  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSec));
    return errorResponse(
      c,
      429,
      'RATE_LIMITED',
      'Muitas requisições em sequência. Aguarde alguns segundos e tente novamente.'
    );
  }

  await next();
};
