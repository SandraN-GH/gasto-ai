import type { SupabaseClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import {
  getSaoPauloToday,
  MAX_DAILY_AI_CALLS,
  parseExpenseFromImage,
  parseExpenseFromText,
  regexFallbackTextParser,
  type UserCategoryOption,
} from '../ai';
import { errorResponse } from '../errors';
import { aiParseTextSchema } from '../schemas';
import type { Env, Variables } from '../types';

export const aiRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function incrementDailyAiUsage(
  supabase: SupabaseClient,
  userId: string,
  day: string,
  currentCount: number
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('increment_ai_usage', {
    p_day: day,
  });

  if (!rpcError) return;

  await supabase.from('ai_usage').upsert(
    {
      user_id: userId,
      day,
      count: currentCount + 1,
    },
    { onConflict: 'user_id,day' }
  );
}

// Rota autenticada: devolve apenas um rascunho ExpenseDraft sem salvar no banco
aiRoute.post('/ai/parse', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');
  const today = getSaoPauloToday();

  const { data: usageRow, error: usageError } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();

  if (usageError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível verificar a cota diária de IA.'
    );
  }

  const currentCount = (usageRow as { count?: number } | null)?.count ?? 0;
  if (currentCount >= MAX_DAILY_AI_CALLS) {
    return errorResponse(
      c,
      429,
      'AI_DAILY_LIMIT',
      'Você atingiu o limite diário de 40 análises por IA. Preencha manualmente ou tente novamente amanhã.'
    );
  }

  const contentType = (c.req.header('Content-Type') ?? '').toLowerCase();

  // Busca categorias do usuário no Supabase para guiar a IA
  const { data: userCategories, error: catError } = await supabase
    .from('categories')
    .select('id, name, icon, color')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (catError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível carregar suas categorias.'
    );
  }

  const categories = (userCategories ?? []) as UserCategoryOption[];
  if (categories.length === 0) {
    return errorResponse(
      c,
      400,
      'NO_CATEGORIES',
      'Nenhuma categoria encontrada. Recarregue a página para inicializar suas categorias.'
    );
  }

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData().catch(() => null);
    if (!formData) {
      return errorResponse(
        c,
        400,
        'VALIDATION_ERROR',
        'Não foi possível ler os dados enviados.'
      );
    }

    const imageEntry = formData.get('image');
    if (!imageEntry || typeof imageEntry === 'string') {
      return errorResponse(
        c,
        400,
        'VALIDATION_ERROR',
        'Envie uma imagem no campo "image".'
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(imageEntry.type)) {
      return errorResponse(
        c,
        400,
        'INVALID_IMAGE_TYPE',
        'Formato não suportado. Use JPEG, PNG ou WebP.'
      );
    }

    if (imageEntry.size === 0 || imageEntry.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        c,
        400,
        'IMAGE_TOO_LARGE',
        'A imagem deve ter no máximo 4 MB.'
      );
    }

    if (!c.env.AI) {
      return errorResponse(
        c,
        503,
        'AI_UNAVAILABLE',
        'O reconhecimento de imagem via Workers AI está disponível apenas após publicar no Cloudflare Workers.'
      );
    }

    await incrementDailyAiUsage(supabase, userId, today, currentCount);

    try {
      const arrayBuffer = await imageEntry.arrayBuffer();
      const draft = await parseExpenseFromImage(
        c.env.AI,
        new Uint8Array(arrayBuffer),
        categories
      );

      return c.json({
        draft,
        remaining_daily_quota: Math.max(0, MAX_DAILY_AI_CALLS - (currentCount + 1)),
      });
    } catch {
      return errorResponse(
        c,
        503,
        'AI_UNAVAILABLE',
        'Não consegui ler esta nota agora. Tente outra foto ou digite manualmente.'
      );
    }
  }

  // Entrada JSON { text }
  const rawBody = await c.req.json().catch(() => null);
  const parsedBody = aiParseTextSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      400,
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message ?? 'Informe um texto válido.'
    );
  }

  await incrementDailyAiUsage(supabase, userId, today, currentCount);

  try {
    const draft = await parseExpenseFromText(
      c.env.AI,
      parsedBody.data.text,
      categories
    );
    return c.json({
      draft,
      remaining_daily_quota: Math.max(0, MAX_DAILY_AI_CALLS - (currentCount + 1)),
    });
  } catch {
    const fallbackDraft = regexFallbackTextParser(
      parsedBody.data.text,
      categories,
      today
    );
    return c.json({
      draft: fallbackDraft,
      remaining_daily_quota: Math.max(0, MAX_DAILY_AI_CALLS - (currentCount + 1)),
    });
  }
});
