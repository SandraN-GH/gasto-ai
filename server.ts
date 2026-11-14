import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Env } from './worker/types.ts';
import { app as workerApp } from './worker/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function loadWranglerPublicVars(): {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
} {
  let fileUrl = '';
  let fileKey = '';

  try {
    const wranglerPath = path.resolve(__dirname, 'wrangler.jsonc');
    const raw = fs.readFileSync(wranglerPath, 'utf8');
    // Remove comentários // ou /* */ simples caso existam em JSONC
    const stripped = raw
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(stripped) as {
      vars?: { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string };
    };
    fileUrl = parsed.vars?.SUPABASE_URL ?? '';
    fileKey = parsed.vars?.SUPABASE_PUBLISHABLE_KEY ?? '';
  } catch {
    // Fallback para process.env
  }

  return {
    SUPABASE_URL: process.env.SUPABASE_URL ?? fileUrl,
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ?? fileKey,
  };
}

async function startServer() {
  const app = express();
  const publicVars = loadWranglerPublicVars();

  // Encaminha todas as rotas /api/* para o Worker Hono (mesma lógica do Cloudflare Worker)
  app.use(
    '/api',
    express.raw({ type: '*/*', limit: '6mb' }),
    async (req, res, next) => {
      try {
        const host = req.headers.host ?? `localhost:${PORT}`;
        const protoHeader = req.headers['x-forwarded-proto'];
        const proto =
          typeof protoHeader === 'string' && protoHeader.length > 0
            ? protoHeader.split(',')[0].trim()
            : 'http';
        const url = new URL(req.originalUrl, `${proto}://${host}`);

        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (const item of value) headers.append(key, item);
          } else {
            headers.set(key, value);
          }
        }

        // Repassa IP para o rate limiter por IP em /api/config
        if (!headers.has('cf-connecting-ip') && req.ip) {
          headers.set('cf-connecting-ip', req.ip);
        }

        const hasBody =
          req.method !== 'GET' &&
          req.method !== 'HEAD' &&
          Buffer.isBuffer(req.body) &&
          req.body.length > 0;

        const webRequest = new Request(url.toString(), {
          method: req.method,
          headers,
          body: hasBody ? new Uint8Array(req.body) : undefined,
        });

        const workerEnv = {
          SUPABASE_URL: publicVars.SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY: publicVars.SUPABASE_PUBLISHABLE_KEY,
        } as Env;

        const workerResponse = await workerApp.fetch(webRequest, workerEnv);

        res.status(workerResponse.status);
        workerResponse.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower === 'transfer-encoding' || lower === 'content-encoding') {
            return;
          }
          res.setHeader(key, value);
        });

        const responseBuffer = Buffer.from(await workerResponse.arrayBuffer());
        res.send(responseBuffer);
      } catch (err) {
        next(err);
      }
    }
  );

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
    console.log(`GastoIA dev preview listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
