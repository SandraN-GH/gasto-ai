import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env, Variables } from './types';

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

// Resposta de erro padronizada em português sem vazar detalhes internos
export function errorResponse(
  c: AppContext,
  status: ContentfulStatusCode,
  code: string,
  message: string
) {
  return c.json(
    {
      error: {
        code,
        message,
      },
    },
    status
  );
}
