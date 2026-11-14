import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const monthRegex = /^\d{4}-\d{2}$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

function isValidCalendarDate(value: string): boolean {
  if (!dateRegex.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

function isValidYearMonth(value: string): boolean {
  if (!monthRegex.test(value)) return false;
  const [, m] = value.split('-').map(Number);
  return m >= 1 && m <= 12;
}

const validDateSchema = z
  .string()
  .refine(isValidCalendarDate, 'Data inválida. Use uma data real no formato YYYY-MM-DD.');

export const createCategorySchema = z.object({
  name: z
    .string({ message: 'Nome da categoria é obrigatório.' })
    .trim()
    .min(1, 'Informe o nome da categoria.')
    .max(40, 'O nome da categoria deve ter no máximo 40 caracteres.'),
  icon: z.string().trim().max(32).optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(hexColorRegex, 'Cor inválida. Use formato hexadecimal (#RRGGBB).')
    .optional()
    .nullable(),
  budget_cents: z
    .number()
    .int('O orçamento deve ser um valor inteiro em centavos.')
    .min(0, 'O orçamento não pode ser negativo.')
    .max(1_000_000_000, 'Valor de orçamento muito alto.')
    .optional()
    .default(0),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Envie pelo menos um campo para atualizar.'
);

export const deleteCategoryBodySchema = z
  .object({
    reassign_to: z.string().trim().min(1).optional(),
  })
  .optional();

export const expenseFiltersSchema = z.object({
  from: validDateSchema.optional(),
  to: validDateSchema.optional(),
  category: z.string().trim().min(1).optional(),
  min: z.coerce
    .number()
    .int()
    .min(0, 'Valor mínimo não pode ser negativo.')
    .optional(),
  max: z.coerce
    .number()
    .int()
    .min(0, 'Valor máximo não pode ser negativo.')
    .optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const createExpenseSchema = z.object({
  amount_cents: z
    .number({ message: 'Valor em centavos é obrigatório.' })
    .int('O valor deve ser um número inteiro em centavos.')
    .positive('O valor da despesa deve ser maior que zero.')
    .max(1_000_000_000, 'Valor excede o limite permitido.'),
  expense_date: z
    .string({ message: 'Data da despesa é obrigatória.' })
    .refine(isValidCalendarDate, 'Data inválida. Use uma data real no formato YYYY-MM-DD.'),
  merchant: z
    .string()
    .trim()
    .max(120, 'Estabelecimento deve ter no máximo 120 caracteres.')
    .optional()
    .nullable(),
  category_id: z
    .string({ message: 'Categoria é obrigatória.' })
    .trim()
    .min(1, 'Selecione uma categoria válida.'),
  payment_method: z
    .string()
    .trim()
    .max(40, 'Forma de pagamento deve ter no máximo 40 caracteres.')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(500, 'Observação deve ter no máximo 500 caracteres.')
    .optional()
    .nullable(),
  source: z.enum(['image', 'text', 'manual']).optional().default('manual'),
  ai_confidence: z.number().min(0).max(1).optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Envie pelo menos um campo para atualizar.'
);

export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .refine(isValidYearMonth, 'Mês inválido. Use o formato YYYY-MM (ex.: 2026-11).')
    .optional(),
});

export const reportsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).optional().default('month'),
  from: validDateSchema.optional(),
  to: validDateSchema.optional(),
});

export const upsertBudgetSchema = z.object({
  category_id: z
    .string({ message: 'Categoria é obrigatória.' })
    .trim()
    .min(1, 'Categoria inválida.'),
  budget_cents: z
    .number({ message: 'Valor do orçamento é obrigatório.' })
    .int('O orçamento deve ser inteiro em centavos.')
    .min(0, 'O orçamento não pode ser negativo.')
    .max(1_000_000_000, 'Valor de orçamento muito alto.'),
});

export const aiParseTextSchema = z.object({
  text: z
    .string({ message: 'Descreva a despesa em texto.' })
    .trim()
    .min(2, 'Digite pelo menos 2 caracteres para análise.')
    .max(1500, 'O texto deve ter no máximo 1500 caracteres.'),
});
