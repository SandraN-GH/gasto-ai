import { Hono } from 'hono';
import { errorResponse } from '../errors';
import type { CategoryRow, Env, Variables } from '../types';

export const bootstrapRoute = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'utensils', color: '#F97316' },
  { name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { name: 'Educação', icon: 'graduation-cap', color: '#8B5CF6' },
  { name: 'Lazer', icon: 'sparkles', color: '#EC4899' },
  { name: 'Outros', icon: 'home', color: '#64748B' },
] as const;

// Cria categorias padrão de forma idempotente no Supabase se o usuário ainda não possuir nenhuma
bootstrapRoute.post('/bootstrap', async (c) => {
  const userId = c.get('userId');
  const supabase = c.get('supabase');

  const { count, error: countError } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível consultar suas categorias.'
    );
  }

  let created = false;
  if (!count || count === 0) {
    const rows = DEFAULT_CATEGORIES.map((cat) => ({
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget_cents: 0,
      is_default: 1,
    }));

    const { error: insertError } = await supabase
      .from('categories')
      .upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: true });

    if (insertError) {
      return errorResponse(
        c,
        500,
        'DATABASE_ERROR',
        'Não foi possível inicializar as categorias padrão.'
      );
    }
    created = true;
  }

  const { data: categories, error: listError } = await supabase
    .from('categories')
    .select('id, user_id, name, icon, color, budget_cents, is_default, created_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (listError) {
    return errorResponse(
      c,
      500,
      'DATABASE_ERROR',
      'Não foi possível carregar suas categorias.'
    );
  }

  return c.json({
    created,
    categories: (categories ?? []) as CategoryRow[],
  });
});
