import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function createAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ContextSummary {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  categories: Array<{ name: string; spent: number; limit: number }>;
  recentTransactions: Array<{
    title: string;
    amount: number;
    type: string;
    category: string;
    date: string;
  }>;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// Natural language assistant: parses expense/income entries OR answers financial questions
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { prompt, context } = req.body as {
      prompt?: string;
      context?: ContextSummary;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt vazio.' });
    }

    const ai = createAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave da API Gemini não configurada no servidor.',
      });
    }

    const systemInstruction = `Você é o GastoIA, um assistente financeiro pessoal brasileiro direto, preciso e prestativo.
Analise a mensagem do usuário e determine a intenção:
1. "create_transaction": Quando o usuário está informando um gasto ou receita (ex: "Gastei 45 no almoço", "Uber 28,90", "Recebi 1500 de freela", "Pix de 80 para farmácia").
2. "answer_question": Quando o usuário está fazendo uma pergunta, pedindo análise, conselho ou previsão financeira.

Categorias válidas exclusivamente:
- "food" (Alimentação: almoço, jantar, mercado, padaria, café, iFood, restaurante)
- "transport" (Transporte: Uber, 99, gasolina, metrô, ônibus, estacionamento, pedágio)
- "education" (Educação: cursos, livros, faculdade, Alura, idiomas)
- "leisure" (Lazer: cinema, streaming, Spotify, Netflix, viagem, bar, jogos)
- "other" (Outros/Moradia: aluguel, luz, internet, farmácia, compras gerais, serviços)
- "income" (Receitas: salário, freelance, reembolso, dividendos, venda, rendimento)

Métodos de pagamento válidos: "Pix", "Crédito", "Débito", "Transferência", "Dinheiro". Se não informado, use "Pix" para gastos rápidos/transferências ou "Crédito" para compras/aplicativos.

Responda sempre em Português do Brasil de forma concisa (máximo 2-3 frases no campo reply). Use os valores reais do contexto financeiro do usuário ao responder perguntas.`;

    const contextText = context
      ? `Contexto atual do usuário (Moeda BRL - R$):
Saldo disponível: R$ ${context.balance.toFixed(2)}
Receitas do mês: R$ ${context.monthlyIncome.toFixed(2)}
Despesas do mês: R$ ${context.monthlyExpenses.toFixed(2)}
Orçamentos por categoria: ${context.categories
          .map((c) => `${c.name}: gasto R$ ${c.spent.toFixed(2)} de R$ ${c.limit.toFixed(2)}`)
          .join(' | ')}
Lançamentos recentes: ${context.recentTransactions
          .slice(0, 12)
          .map((t) => `${t.title} (${t.type === 'income' ? '+' : '-'}R$ ${t.amount.toFixed(2)}, ${t.category}, ${t.date})`)
          .join('; ')}`
      : 'Sem contexto adicional.';

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `${contextText}\n\nMensagem do usuário: "${prompt.trim()}"`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: '"create_transaction" ou "answer_question"',
            },
            reply: {
              type: Type.STRING,
              description: 'Resposta curta e amigável em português para exibir ao usuário.',
            },
            transaction: {
              type: Type.OBJECT,
              description: 'Preencher apenas quando intent for create_transaction.',
              properties: {
                title: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, description: '"expense" ou "income"' },
                category: {
                  type: Type.STRING,
                  description: '"food" | "transport" | "education" | "leisure" | "other" | "income"',
                },
                paymentMethod: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
            },
          },
          required: ['intent', 'reply'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('Erro em /api/ai/assistant:', err);
    const message = err instanceof Error ? err.message : 'Erro ao processar solicitação com IA.';
    return res.status(500).json({ error: message });
  }
});

// Multimodal receipt OCR parsing
app.post('/api/ai/receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Imagem do comprovante não fornecida.' });
    }

    const ai = createAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave da API Gemini não configurada no servidor.',
      });
    }

    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Extraia os dados deste recibo, nota fiscal ou comprovante Pix.
Retorne o nome do estabelecimento ou recebedor em "title", o valor total numérico em "amount", o tipo ("expense" ou "income"), a categoria ("food", "transport", "education", "leisure", "other", "income"), o método de pagamento ("Pix", "Crédito", "Débito", "Dinheiro") e um resumo curto dos itens em "notes".
Se não for um comprovante legível, retorne readable: false e explique em "reply".`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readable: { type: Type.BOOLEAN },
            reply: { type: Type.STRING },
            transaction: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING },
                category: { type: Type.STRING },
                paymentMethod: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
            },
          },
          required: ['readable', 'reply'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('Erro em /api/ai/receipt:', err);
    const message = err instanceof Error ? err.message : 'Erro ao ler comprovante.';
    return res.status(500).json({ error: message });
  }
});

// Explain a single transaction or optimize monthly budgets
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { mode, transaction, context } = req.body as {
      mode?: 'explain_transaction' | 'optimize_budgets';
      transaction?: {
        title: string;
        amount: number;
        type: string;
        category: string;
        date: string;
        paymentMethod: string;
      };
      context?: ContextSummary;
    };

    const ai = createAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave da API Gemini não configurada no servidor.',
      });
    }

    if (mode === 'explain_transaction' && transaction) {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Explique brevemente o impacto deste lançamento no orçamento mensal do usuário e dê uma dica prática de economia ou gestão se aplicável.
Lançamento: ${transaction.title} | Valor: R$ ${transaction.amount.toFixed(2)} | Tipo: ${transaction.type} | Categoria: ${transaction.category} | Pagamento: ${transaction.paymentMethod} | Data: ${transaction.date}.
Resumo do mês: Receitas R$ ${context?.monthlyIncome.toFixed(2) ?? '0'}, Despesas R$ ${context?.monthlyExpenses.toFixed(2) ?? '0'}.
Responda em Português do Brasil em no máximo 2 frases objetivas.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      return res.json({ explanation: response.text?.trim() ?? '' });
    }

    if (mode === 'optimize_budgets' && context) {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Analise os gastos e limites atuais por categoria e sugira recomendações objetivas de ajuste de orçamento em Português do Brasil.
Receita mensal: R$ ${context.monthlyIncome.toFixed(2)}
Despesa mensal atual: R$ ${context.monthlyExpenses.toFixed(2)}
Categorias: ${context.categories
          .map((c) => `${c.name}: gasto R$ ${c.spent.toFixed(2)} / limite R$ ${c.limit.toFixed(2)}`)
          .join('\n')}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    categoryName: { type: Type.STRING },
                    suggestedLimit: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                  },
                  required: ['categoryName', 'suggestedLimit', 'reason'],
                },
              },
            },
            required: ['summary', 'recommendations'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    }

    return res.status(400).json({ error: 'Modo de análise inválido.' });
  } catch (err: unknown) {
    console.error('Erro em /api/ai/analyze:', err);
    const message = err instanceof Error ? err.message : 'Erro ao gerar análise.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GastoIA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
