# GastoIA — Guia de Publicação Passo a Passo

O **GastoIA** é um aplicativo web (PWA) de controle financeiro pessoal hospedado na **Cloudflare** (Workers + Static Assets + Workers AI) utilizando o **Supabase** (PostgreSQL com Row Level Security e Supabase Auth).

Este guia foi escrito para quem nunca configurou servidores ou bancos de dados antes. Basta seguir os passos na ordem.

---

## 1. O que você precisa ter antes de começar

1. Uma conta gratuita no **GitHub** (com este projeto salvo em um repositório).
2. Uma conta gratuita na **Cloudflare** ([dash.cloudflare.com](https://dash.cloudflare.com)).
3. Seu projeto no **Supabase** (`https://sybafbtgvuihysasoluh.supabase.co`).

---

## 2. Criar as tabelas no banco do Supabase (`schema.sql`)

O `wrangler.jsonc` já está configurado com a URL e a chave pública do seu projeto Supabase. Falta apenas criar as tabelas e políticas de segurança no banco PostgreSQL:

1. Acesse o painel do seu projeto no **Supabase**.
2. No menu lateral esquerdo, clique em **SQL Editor**.
3. Clique em **New query** (Nova consulta).
4. Abra o arquivo `schema.sql` deste projeto, copie **todo** o conteúdo dele e cole no editor do Supabase.
5. Clique no botão **Run** (Executar).
   - Se aparecer `Success. No rows returned`, as tabelas `categories`, `expenses`, `ai_usage`, as políticas **RLS** e a função `increment_ai_usage` foram criadas com segurança.

---

## 3. Conferir o `wrangler.jsonc`

No arquivo `wrangler.jsonc`, os valores públicos do Supabase já estão preenchidos em `"vars"`:

- `SUPABASE_URL`: URL pública do seu projeto Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: chave pública (`sb_publishable_...`) do Supabase.

> **Importante**: **NUNCA** coloque senhas de banco (`postgres`), tokens da API da Cloudflare (`cfut_...`), `service_role` ou arquivos `.env`/`.dev.vars` no repositório. O `.gitignore` protege automaticamente esses arquivos.

---

## 4. Conectar o GitHub na Cloudflare (Deploy automático)

1. No painel da Cloudflare, vá em **Compute (Workers)** > **Workers & Pages**.
2. Clique em **Create** > **Import a repository** (conectar ao GitHub).
3. Escolha o repositório do **GastoIA** e autorize o acesso.
4. Na tela **Build settings**, preencha:
   - **Build command** (comando de build): `npm run build`
   - **Deploy command** (comando de deploy): `npx wrangler deploy`
5. Clique em **Save and Deploy**.
6. Aguarde a publicação terminar. A Cloudflare exibirá o endereço final do app (por exemplo: `https://gastoia.seu-usuario.workers.dev`).

---

## 5. Configurar as URLs de redirecionamento no Supabase

Para que o link de **"Esqueci minha senha"** e a confirmação de e-mail funcionem corretamente:

1. Abra o painel do seu projeto no **Supabase**.
2. No menu lateral, clique em **Authentication** > **URL Configuration**.
3. Em **Site URL**, coloque o endereço final do seu app na Cloudflare (sem barra no final), por exemplo:
   ```text
   https://gastoia.seu-usuario.workers.dev
   ```
4. Na seção **Redirect URLs**, clique em **Add URL** e adicione:
   ```text
   https://gastoia.seu-usuario.workers.dev/redefinir-senha
   https://gastoia.seu-usuario.workers.dev/**
   ```
5. Clique em **Save changes**.

---

## 6. Instalar no celular (PWA) e usar o atalho da câmera

- **Android (Chrome)**: abra o endereço do GastoIA, toque no menu do navegador (ou em **Instalar aplicativo** dentro de **Configurações**) e confirme.
- **iPhone / iPad (Safari)**: toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.
- Depois de instalado, segure o ícone do **GastoIA** na tela inicial para usar o atalho **Adicionar despesa**, que abre diretamente a câmera para fotografar recibos.
