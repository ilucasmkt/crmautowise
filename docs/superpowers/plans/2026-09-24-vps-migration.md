# Migração Vercel → VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sair da Vercel e servir o CRM (frontend + API) a partir de um novo serviço Docker na VPS existente (HostGator, Docker Swarm + Traefik + Portainer), sem tocar em Supabase (continua cloud) nem no Evolution API (já está na VPS, sem mudanças).

**Architecture:** As rotas hoje em `api/*.ts` (funções serverless da Vercel, runtime `@vercel/node`) são portadas, sem mudança de lógica, para um servidor Express (`server/`) que também serve o build estático do Vite. Os arquivos `api/*.ts` originais **não são tocados** até o corte de DNS estar confirmado — a Vercel continua no ar normalmente enquanto testamos. O novo serviço entra no Docker Swarm existente, na mesma rede `adminautowise` que o Evolution API já usa, roteado pelo Traefik já configurado (mesmo `certresolver=letsencryptresolver` usado por n8n/Evolution).

**Tech Stack:** Node 20, Express 4, TypeScript executado via `tsx` (sem etapa de compilação separada, mesma ferramenta já usada em `scripts/create-store.ts`), Vite (build do frontend, inalterado), Vitest + Supertest (testes do servidor), Docker (multi-stage build), Docker Swarm + Traefik (deploy/roteamento).

## Global Constraints

- Node: `20-alpine` (mesma versão já instalada na VPS: `v20.20.2`)
- Express: `^4.19.2` (fixar major 4 — evita ambiguidade de sintaxe de rota wildcard entre Express 4 e 5)
- `@types/express`: `^4.17.21`
- `supertest`: `^7.0.0`, `@types/supertest`: `^6.0.2`
- Zero mudanças em `api/*.ts`, `vercel.json`, ou qualquer arquivo usado pelo deploy atual da Vercel, até a Task 11 (limpeza pós-corte)
- Zero mudanças no client Supabase (`lib/supabaseClient.ts`), RLS ou migrations
- Todas as rotas HTTP e comportamento de cada endpoint devem ser idênticos aos das funções Vercel atuais (mesmos status codes, mesmo formato de resposta JSON)
- Segredos de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_KEY`) nunca em arquivo commitado — só em variável de ambiente injetada no deploy

---

## Task 1: Esqueleto do servidor Express + health check

**Files:**
- Create: `server/asyncHandler.ts`
- Create: `server/app.ts`
- Create: `server/index.ts`
- Create: `server/app.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler` — usado por todas as tasks seguintes para envolver os handlers convertidos.
- Produces: `createApp(): Express` — fábrica do app Express, usada por `server/index.ts` (produção) e por `server/app.test.ts` (testes, via supertest).

- [ ] **Step 1: Instalar dependências**

```bash
npm install express@^4.19.2
npm install -D @types/express@^4.17.21 supertest@^7.0.0 @types/supertest@^6.0.2
```

- [ ] **Step 2: Criar `server/asyncHandler.ts`**

```ts
import type { NextFunction, Request, Response } from 'express';

export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
```

- [ ] **Step 3: Criar `server/app.ts` (só health check por enquanto)**

```ts
import express, { type Express, type NextFunction, type Request, type Response } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Não encontrado' });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  });

  return app;
}
```

- [ ] **Step 4: Criar `server/index.ts`**

```ts
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`CRM server listening on port ${port}`);
});
```

- [ ] **Step 5: Escrever o teste em `server/app.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('health check', () => {
  it('GET /api/health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown route returns 404 json', async () => {
    const app = createApp();
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Não encontrado' });
  });
});
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test -- server/app.test.ts`
Expected: 2 passed

- [ ] **Step 7: Adicionar script `start` no `package.json`**

Em `package.json`, dentro de `"scripts"`, adicionar (mantendo os scripts existentes):

```json
    "start": "tsx server/index.ts",
```

- [ ] **Step 8: Commit**

```bash
git add server/asyncHandler.ts server/app.ts server/index.ts server/app.test.ts package.json package-lock.json
git commit -m "feat: add Express server skeleton with health check"
```

---

## Task 2: Rota FIPE (`/api/fipe/*`)

**Files:**
- Create: `server/routes/fipe.ts`
- Modify: `server/app.ts`
- Create: `server/routes/fipe.test.ts`

**Interfaces:**
- Consumes: `asyncHandler` de `server/asyncHandler.ts` (Task 1)
- Produces: `export default async function handler(req: ExpressRequest, res: ExpressResponse)` em `server/routes/fipe.ts`, montado em `GET /api/fipe/*`

- [ ] **Step 1: Criar `server/routes/fipe.ts`**

Cópia de `api/fipe.ts` com o import de tipos trocado de `@vercel/node` para `express` (com alias, para não conflitar com o `Response` global do `fetch`, usado mais abaixo no arquivo):

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_PREFIXES = ['cars', 'references'];
const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  const accessToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sessão inválida' });
    return;
  }

  const pathParam = req.query.path;
  const rawPath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam as string) ?? '';
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length === 0 || !ALLOWED_PREFIXES.includes(segments[0])) {
    res.status(404).json({ error: 'Recurso não encontrado' });
    return;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v as string));
    } else if (value !== undefined) {
      query.append(key, value as string);
    }
  }
  const queryString = query.toString();
  const targetUrl = `${FIPE_BASE_URL}/${segments.join('/')}${queryString ? `?${queryString}` : ''}`;

  const fipeToken = process.env.FIPE_API_TOKEN;
  const headers: Record<string, string> = {};
  if (fipeToken) headers['X-Subscription-Token'] = fipeToken;

  let fipeResponse: Response;
  try {
    fipeResponse = await fetch(targetUrl, { headers });
  } catch (err) {
    console.error('Erro ao contatar a API da FIPE:', err);
    res.status(502).json({ error: 'Falha ao consultar a FIPE' });
    return;
  }

  const body = await fipeResponse.json().catch(() => null);
  res.status(fipeResponse.status).json(body);
}
```

- [ ] **Step 2: Montar a rota em `server/app.ts`**

Adicionar o import no topo do arquivo:

```ts
import fipeHandler from './routes/fipe.js';
import { asyncHandler } from './asyncHandler.js';
```

E adicionar, **antes** do `app.use((_req, res) => { ... 404 ... })`:

```ts
  app.get('/api/fipe/*', (req: Request, _res: Response, next: NextFunction) => {
    req.query.path = req.params[0];
    next();
  }, asyncHandler(fipeHandler));
```

- [ ] **Step 3: Escrever os testes em `server/routes/fipe.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const getUserMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  getUserMock.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

describe('GET /api/fipe/*', () => {
  it('returns 401 without Authorization header', async () => {
    const app = createApp();
    const res = await request(app).get('/api/fipe/cars/brands');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the session is invalid', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    const app = createApp();
    const res = await request(app)
      .get('/api/fipe/cars/brands')
      .set('Authorization', 'Bearer token123');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a prefix outside the allow-list', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const app = createApp();
    const res = await request(app)
      .get('/api/fipe/nao-permitido')
      .set('Authorization', 'Bearer token123');
    expect(res.status).toBe(404);
  });

  it('proxies to the FIPE API and returns its response', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => [{ nome: 'Toyota' }],
    });
    const app = createApp();
    const res = await request(app)
      .get('/api/fipe/cars/brands')
      .set('Authorization', 'Bearer token123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ nome: 'Toyota' }]);
    expect(fetch).toHaveBeenCalledWith(
      'https://fipe.parallelum.com.br/api/v2/cars/brands',
      { headers: {} }
    );
  });
});
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- server/routes/fipe.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add server/routes/fipe.ts server/routes/fipe.test.ts server/app.ts
git commit -m "feat: port FIPE proxy route to the Express server"
```

---

## Task 3: Rota de convite de equipe (`/api/team/invite`)

**Files:**
- Create: `server/routes/teamInvite.ts`
- Modify: `server/app.ts`
- Create: `server/routes/teamInvite.test.ts`

**Interfaces:**
- Consumes: `asyncHandler` (Task 1)
- Produces: `export default async function handler(req: ExpressRequest, res: ExpressResponse)` montado em `POST /api/team/invite`

- [ ] **Step 1: Criar `server/routes/teamInvite.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';

const VALID_ROLES = [
  'Administrador',
  'Gerente de Vendas',
  'Consultor de Vendas',
  'Atendimento / BDC',
];

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { name, email, phone, role } = req.body ?? {};
  if (!name || !email || !role || !VALID_ROLES.includes(role)) {
    res.status(400).json({ error: 'Dados inválidos: nome, email e cargo são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sessão inválida' });
    return;
  }

  const { data: callerProfile, error: callerError } = await admin
    .from('profiles')
    .select('store_id, role')
    .eq('id', userData.user.id)
    .single();

  if (callerError || !callerProfile) {
    res.status(403).json({ error: 'Perfil não encontrado' });
    return;
  }

  if (!['Administrador', 'Gerente de Vendas'].includes(callerProfile.role)) {
    res.status(403).json({ error: 'Sem permissão para convidar novos usuários' });
    return;
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user) {
    console.error('Erro ao enviar convite via Supabase Auth:', inviteError);
    res.status(500).json({ error: 'Erro ao enviar convite. Tente novamente.' });
    return;
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: invited.user.id,
    store_id: callerProfile.store_id,
    name,
    email,
    phone: phone ?? null,
    role,
    status: 'ativo',
    avatar_color: 'bg-brand-500',
  });

  if (profileError) {
    console.error('Erro ao criar perfil do usuário convidado:', profileError);
    await admin.auth.admin.deleteUser(invited.user.id);
    res.status(500).json({ error: 'Erro ao criar perfil do usuário. Tente novamente.' });
    return;
  }

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Montar a rota em `server/app.ts`**

Adicionar o import:

```ts
import teamInviteHandler from './routes/teamInvite.js';
```

E adicionar a rota (antes do handler 404):

```ts
  app.post('/api/team/invite', asyncHandler(teamInviteHandler));
```

- [ ] **Step 3: Escrever os testes em `server/routes/teamInvite.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const getUserMock = vi.fn();
const singleMock = vi.fn();
const insertMock = vi.fn();
const inviteUserByEmailMock = vi.fn();
const deleteUserMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: getUserMock,
      admin: {
        inviteUserByEmail: inviteUserByEmailMock,
        deleteUser: deleteUserMock,
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
      insert: insertMock,
    }),
  }),
}));

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  getUserMock.mockReset();
  singleMock.mockReset();
  insertMock.mockReset();
  inviteUserByEmailMock.mockReset();
  deleteUserMock.mockReset();
});

const validBody = { name: 'Ana', email: 'ana@example.com', role: 'Consultor de Vendas' };

describe('POST /api/team/invite', () => {
  it('returns 401 without Authorization header', async () => {
    const app = createApp();
    const res = await request(app).post('/api/team/invite').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid role', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', 'Bearer token123')
      .send({ ...validBody, role: 'Cargo Inexistente' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when the caller is not admin or sales manager', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    singleMock.mockResolvedValue({ data: { store_id: 's1', role: 'Consultor de Vendas' }, error: null });
    const app = createApp();
    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', 'Bearer token123')
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('invites the user and creates the profile on success', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    singleMock.mockResolvedValue({ data: { store_id: 's1', role: 'Administrador' }, error: null });
    inviteUserByEmailMock.mockResolvedValue({ data: { user: { id: 'novo-id' } }, error: null });
    insertMock.mockResolvedValue({ error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/team/invite')
      .set('Authorization', 'Bearer token123')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'novo-id', store_id: 's1', email: 'ana@example.com' })
    );
  });
});
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- server/routes/teamInvite.test.ts`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add server/routes/teamInvite.ts server/routes/teamInvite.test.ts server/app.ts
git commit -m "feat: port team invite route to the Express server"
```

---

## Task 4: Rotas de WhatsApp (Evolution API)

**Files:**
- Create: `server/routes/whatsapp/connect.ts`
- Create: `server/routes/whatsapp/disconnect.ts`
- Create: `server/routes/whatsapp/status.ts`
- Create: `server/routes/whatsapp/chats.ts`
- Create: `server/routes/whatsapp/messages.ts`
- Create: `server/routes/whatsapp/send.ts`
- Create: `server/routes/whatsapp/sendMedia.ts`
- Create: `server/routes/whatsapp/media.ts`
- Modify: `server/app.ts`
- Create: `server/routes/whatsapp.test.ts`

**Interfaces:**
- Consumes: `asyncHandler` (Task 1); `extractBearerToken`, `authorizeTeamMemberAccess`, `AuthorizationError` de `api/_shared/whatsapp.ts` (já existe, reaproveitado sem mudanças); `jidToNumber` de `api/_shared/jid.ts` (já existe, reaproveitado sem mudanças)
- Produces: 8 handlers `export default async function handler(req: ExpressRequest, res: ExpressResponse)`, montados em `POST /api/whatsapp/connect`, `POST /api/whatsapp/disconnect`, `GET /api/whatsapp/status`, `GET /api/whatsapp/chats`, `GET /api/whatsapp/messages`, `POST /api/whatsapp/send`, `POST /api/whatsapp/sendMedia`, `GET /api/whatsapp/media`

**Nota de escopo:** os 8 handlers são cópias exatas da lógica já em produção na Vercel (só o import de tipos muda). Os testes cobrem: rejeição sem token (as 8 rotas) e um caminho de sucesso detalhado para as rotas com lógica de transformação de dados mais relevante (`connect`, `status`, `chats`, `messages`, `send`) — `disconnect`, `sendMedia` e `media` são passagens diretas (fetch → repassa resposta) já exercitadas pelo mesmo padrão testado em `send`/`chats`.

- [ ] **Step 1: Criar `server/routes/whatsapp/connect.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { teamMemberId } = req.body ?? {};
  if (!teamMemberId) {
    res.status(400).json({ error: 'teamMemberId é obrigatório' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  const evolutionHeaders = { apikey: evolutionKey, 'Content-Type': 'application/json' };

  let createResponse: Response;
  try {
    createResponse = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: evolutionHeaders,
      body: JSON.stringify({ instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true }),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao conectar com o servidor do WhatsApp' });
    return;
  }

  if (createResponse.status === 403) {
    let connectResponse: Response;
    try {
      connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        headers: evolutionHeaders,
      });
    } catch (err) {
      console.error('Erro ao contatar a Evolution API:', err);
      res.status(502).json({ error: 'Falha ao conectar com o servidor do WhatsApp' });
      return;
    }
    const connectBody = await connectResponse.json().catch(() => null);
    if (!connectResponse.ok || !connectBody?.base64) {
      res.status(502).json({ error: 'Não foi possível gerar o QR Code' });
      return;
    }
    res.status(200).json({ qrCodeBase64: connectBody.base64, instanceName });
    return;
  }

  const createBody = await createResponse.json().catch(() => null);
  if (!createResponse.ok || !createBody?.qrcode?.base64) {
    res.status(502).json({ error: 'Não foi possível gerar o QR Code' });
    return;
  }
  res.status(200).json({ qrCodeBase64: createBody.qrcode.base64, instanceName });
}
```

- [ ] **Step 2: Criar `server/routes/whatsapp/disconnect.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { teamMemberId } = req.body ?? {};
  if (!teamMemberId) {
    res.status(400).json({ error: 'teamMemberId é obrigatório' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  try {
    await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: evolutionKey },
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao desconectar o WhatsApp' });
    return;
  }

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 3: Criar `server/routes/whatsapp/status.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const teamMemberId = typeof req.query.teamMemberId === 'string' ? req.query.teamMemberId : null;
  if (!teamMemberId) {
    res.status(400).json({ error: 'teamMemberId é obrigatório' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(
      `${evolutionUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { headers: { apikey: evolutionKey } }
    );
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao consultar o status do WhatsApp' });
    return;
  }

  const body = await fetchResponse.json().catch(() => null);
  const instance = Array.isArray(body) ? body[0] : null;
  if (!instance) {
    res.status(200).json({ state: 'close' });
    return;
  }

  const phoneNumber = typeof instance.ownerJid === 'string' ? instance.ownerJid.split('@')[0] : undefined;

  res.status(200).json({ state: instance.connectionStatus ?? 'close', phoneNumber });
}
```

- [ ] **Step 4: Criar `server/routes/whatsapp/chats.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';
import { jidToNumber } from '../../../api/_shared/jid.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const teamMemberId = typeof req.query.teamMemberId === 'string' ? req.query.teamMemberId : null;
  if (!teamMemberId) {
    res.status(400).json({ error: 'teamMemberId é obrigatório' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  let chatsResponse: Response;
  try {
    chatsResponse = await fetch(`${evolutionUrl}/chat/findChats/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao consultar as conversas' });
    return;
  }

  const body = await chatsResponse.json().catch(() => null);
  if (!chatsResponse.ok || !Array.isArray(body)) {
    res.status(200).json({ chats: [] });
    return;
  }

  const chats = body
    .filter((chat: any) => typeof chat.remoteJid === 'string' && !chat.remoteJid.endsWith('@g.us'))
    .map((chat: any) => {
      const sendTo = jidToNumber(chat.lastMessage?.key?.remoteJidAlt ?? chat.remoteJid);
      const lastMessage = chat.lastMessage?.message?.conversation ?? null;
      return {
        remoteJid: chat.remoteJid as string,
        sendTo,
        name: (chat.pushName as string | null) || sendTo,
        profilePicUrl: (chat.profilePicUrl as string | null) ?? undefined,
        lastMessage,
        lastMessageAt: chat.lastMessage?.messageTimestamp ?? null,
        lastMessageFromMe: chat.lastMessage?.key?.fromMe ?? false,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

  res.status(200).json({ chats });
}
```

- [ ] **Step 5: Criar `server/routes/whatsapp/messages.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const teamMemberId = typeof req.query.teamMemberId === 'string' ? req.query.teamMemberId : null;
  const remoteJid = typeof req.query.remoteJid === 'string' ? req.query.remoteJid : null;
  if (!teamMemberId || !remoteJid) {
    res.status(400).json({ error: 'teamMemberId e remoteJid são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  let messagesResponse: Response;
  try {
    messagesResponse = await fetch(`${evolutionUrl}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ where: { key: { remoteJid } } }),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao consultar as mensagens' });
    return;
  }

  const body = await messagesResponse.json().catch(() => null);
  const records = Array.isArray(body?.messages?.records) ? body.messages.records : [];

  const messages = records
    .map((record: any) => {
      const id = record.key?.id as string;
      const fromMe = Boolean(record.key?.fromMe);
      const timestamp = record.messageTimestamp ?? 0;
      const message = record.message ?? {};

      if (typeof message.conversation === 'string') {
        return { id, fromMe, timestamp, type: 'text' as const, text: message.conversation };
      }
      if (message.imageMessage) {
        return { id, fromMe, timestamp, type: 'image' as const, caption: message.imageMessage.caption };
      }
      if (message.audioMessage) {
        return { id, fromMe, timestamp, type: 'audio' as const };
      }
      return { id, fromMe, timestamp, type: 'unsupported' as const };
    })
    .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);

  res.status(200).json({ messages });
}
```

- [ ] **Step 6: Criar `server/routes/whatsapp/send.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { teamMemberId, number, text } = req.body ?? {};
  if (!teamMemberId || !number || !text) {
    res.status(400).json({ error: 'teamMemberId, number e text são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  let sendResponse: Response;
  try {
    sendResponse = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, text }),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao enviar a mensagem' });
    return;
  }

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text().catch(() => '');
    console.error('Evolution API rejeitou o envio:', sendResponse.status, errorBody);
    res.status(502).json({ error: 'Não foi possível enviar a mensagem' });
    return;
  }

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 7: Criar `server/routes/whatsapp/sendMedia.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { teamMemberId, number, mediaType, base64, mimetype, fileName } = req.body ?? {};
  if (!teamMemberId || !number || !base64 || (mediaType !== 'image' && mediaType !== 'audio')) {
    res.status(400).json({ error: 'teamMemberId, number, mediaType (image|audio) e base64 são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  const path = mediaType === 'image' ? 'sendMedia' : 'sendWhatsAppAudio';
  const body =
    mediaType === 'image'
      ? { number, mediatype: 'image', media: base64, mimetype, fileName }
      : { number, audio: base64 };

  let sendResponse: Response;
  try {
    sendResponse = await fetch(`${evolutionUrl}/message/${path}/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao enviar o arquivo' });
    return;
  }

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text().catch(() => '');
    console.error('Evolution API rejeitou o envio:', sendResponse.status, errorBody);
    res.status(502).json({ error: 'Não foi possível enviar o arquivo' });
    return;
  }

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 8: Criar `server/routes/whatsapp/media.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !evolutionUrl || !evolutionKey) {
    res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    return;
  }

  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const teamMemberId = typeof req.query.teamMemberId === 'string' ? req.query.teamMemberId : null;
  const messageId = typeof req.query.messageId === 'string' ? req.query.messageId : null;
  if (!teamMemberId || !messageId) {
    res.status(400).json({ error: 'teamMemberId e messageId são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let instanceName: string;
  try {
    ({ instanceName } = await authorizeTeamMemberAccess(admin, accessToken, teamMemberId));
  } catch (err) {
    if (err instanceof AuthorizationError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
    return;
  }

  let mediaResponse: Response;
  try {
    mediaResponse = await fetch(`${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao carregar a mídia' });
    return;
  }

  const body = await mediaResponse.json().catch(() => null);
  if (!mediaResponse.ok || !body?.base64) {
    res.status(502).json({ error: 'Não foi possível carregar a mídia' });
    return;
  }

  res.status(200).json({ mimetype: body.mimetype, base64: body.base64 });
}
```

- [ ] **Step 9: Montar as 8 rotas em `server/app.ts`**

Adicionar os imports:

```ts
import whatsappConnectHandler from './routes/whatsapp/connect.js';
import whatsappDisconnectHandler from './routes/whatsapp/disconnect.js';
import whatsappStatusHandler from './routes/whatsapp/status.js';
import whatsappChatsHandler from './routes/whatsapp/chats.js';
import whatsappMessagesHandler from './routes/whatsapp/messages.js';
import whatsappSendHandler from './routes/whatsapp/send.js';
import whatsappSendMediaHandler from './routes/whatsapp/sendMedia.js';
import whatsappMediaHandler from './routes/whatsapp/media.js';
```

E as rotas (antes do handler 404):

```ts
  app.post('/api/whatsapp/connect', asyncHandler(whatsappConnectHandler));
  app.post('/api/whatsapp/disconnect', asyncHandler(whatsappDisconnectHandler));
  app.get('/api/whatsapp/status', asyncHandler(whatsappStatusHandler));
  app.get('/api/whatsapp/chats', asyncHandler(whatsappChatsHandler));
  app.get('/api/whatsapp/messages', asyncHandler(whatsappMessagesHandler));
  app.post('/api/whatsapp/send', asyncHandler(whatsappSendHandler));
  app.post('/api/whatsapp/sendMedia', asyncHandler(whatsappSendMediaHandler));
  app.get('/api/whatsapp/media', asyncHandler(whatsappMediaHandler));
```

- [ ] **Step 10: Escrever os testes em `server/routes/whatsapp.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const getUserMock = vi.fn();
const singleMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: () => ({ select: () => ({ eq: () => ({ single: singleMock }) }) }),
  }),
}));

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.EVOLUTION_API_URL = 'https://evolution.example.com';
  process.env.EVOLUTION_API_KEY = 'evolution-key';
  getUserMock.mockReset();
  singleMock.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

function authorizeAs(storeId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: 'caller-id' } }, error: null });
  singleMock
    .mockResolvedValueOnce({ data: { store_id: storeId }, error: null })
    .mockResolvedValueOnce({ data: { store_id: storeId }, error: null });
}

describe('rotas de WhatsApp exigem Authorization', () => {
  const routes: Array<[string, 'get' | 'post', string]> = [
    ['/api/whatsapp/connect', 'post', 'teamMemberId=x'],
    ['/api/whatsapp/disconnect', 'post', 'teamMemberId=x'],
    ['/api/whatsapp/status?teamMemberId=x', 'get', ''],
    ['/api/whatsapp/chats?teamMemberId=x', 'get', ''],
    ['/api/whatsapp/messages?teamMemberId=x&remoteJid=y', 'get', ''],
    ['/api/whatsapp/send', 'post', ''],
    ['/api/whatsapp/sendMedia', 'post', ''],
    ['/api/whatsapp/media?teamMemberId=x&messageId=y', 'get', ''],
  ];

  it.each(routes)('%s retorna 401 sem token', async (path, method) => {
    const app = createApp();
    const res = await (request(app) as any)[method](path);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/whatsapp/connect', () => {
  it('cria a instância e devolve o QR code', async () => {
    authorizeAs('store-1');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ qrcode: { base64: 'data:image/png;base64,abc' } }),
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/whatsapp/connect')
      .set('Authorization', 'Bearer token123')
      .send({ teamMemberId: 'member-1' });

    expect(res.status).toBe(200);
    expect(res.body.qrCodeBase64).toBe('data:image/png;base64,abc');
  });
});

describe('GET /api/whatsapp/status', () => {
  it('retorna o estado da instância', async () => {
    authorizeAs('store-1');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => [{ connectionStatus: 'open', ownerJid: '5511999999999@s.whatsapp.net' }],
    });

    const app = createApp();
    const res = await request(app)
      .get('/api/whatsapp/status?teamMemberId=member-1')
      .set('Authorization', 'Bearer token123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: 'open', phoneNumber: '5511999999999' });
  });
});

describe('GET /api/whatsapp/chats', () => {
  it('filtra grupos e ordena por última mensagem', async () => {
    authorizeAs('store-1');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [
        { remoteJid: '111@g.us', pushName: 'Grupo' },
        {
          remoteJid: '5511999999999@s.whatsapp.net',
          pushName: 'Cliente',
          lastMessage: { messageTimestamp: 100, message: { conversation: 'Oi' }, key: { fromMe: false } },
        },
        {
          remoteJid: '5511888888888@s.whatsapp.net',
          pushName: 'Outro',
          lastMessage: { messageTimestamp: 200, message: { conversation: 'Olá' }, key: { fromMe: true } },
        },
      ],
    });

    const app = createApp();
    const res = await request(app)
      .get('/api/whatsapp/chats?teamMemberId=member-1')
      .set('Authorization', 'Bearer token123');

    expect(res.status).toBe(200);
    expect(res.body.chats).toHaveLength(2);
    expect(res.body.chats[0].remoteJid).toBe('5511888888888@s.whatsapp.net');
    expect(res.body.chats[0].lastMessageAt).toBe(200);
  });
});

describe('GET /api/whatsapp/messages', () => {
  it('classifica o tipo de cada mensagem', async () => {
    authorizeAs('store-1');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        messages: {
          records: [
            { key: { id: '1', fromMe: false }, messageTimestamp: 1, message: { conversation: 'Oi' } },
            { key: { id: '2', fromMe: true }, messageTimestamp: 2, message: { imageMessage: { caption: 'foto' } } },
            { key: { id: '3', fromMe: false }, messageTimestamp: 3, message: { audioMessage: {} } },
          ],
        },
      }),
    });

    const app = createApp();
    const res = await request(app)
      .get('/api/whatsapp/messages?teamMemberId=member-1&remoteJid=5511999999999@s.whatsapp.net')
      .set('Authorization', 'Bearer token123');

    expect(res.status).toBe(200);
    expect(res.body.messages.map((m: { type: string }) => m.type)).toEqual(['text', 'image', 'audio']);
  });
});

describe('POST /api/whatsapp/send', () => {
  it('envia a mensagem de texto pela Evolution API', async () => {
    authorizeAs('store-1');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const app = createApp();
    const res = await request(app)
      .post('/api/whatsapp/send')
      .set('Authorization', 'Bearer token123')
      .send({ teamMemberId: 'member-1', number: '5511999999999', text: 'Olá' });

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/message/sendText/'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

Nota: o helper `authorizeAs` empilha dois retornos consecutivos de `singleMock` porque `authorizeTeamMemberAccess` (em `api/_shared/whatsapp.ts`) consulta `profiles` duas vezes — uma para o perfil de quem chama, outra para o perfil do membro alvo.

- [ ] **Step 11: Rodar os testes**

Run: `npm test -- server/routes/whatsapp.test.ts`
Expected: 13 passed (8 de autorização + 5 de comportamento)

- [ ] **Step 12: Commit**

```bash
git add server/routes/whatsapp server/routes/whatsapp.test.ts server/app.ts
git commit -m "feat: port WhatsApp (Evolution API) routes to the Express server"
```

---

## Task 5: Servir o frontend estático + scripts de build

**Files:**
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `dist/` gerado por `npm run build` (Vite, inalterado)

- [ ] **Step 1: Adicionar o servir estático e o fallback SPA em `server/app.ts`**

Adicionar os imports no topo:

```ts
import path from 'path';
import { fileURLToPath } from 'url';
```

Adicionar, logo após a declaração de `createApp` (antes do `app.use(express.json(...))` não precisa mudar; adicionar as linhas abaixo **depois** das 8 rotas de whatsapp e **antes** do handler 404 existente):

```ts
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, '..', 'dist');

  app.use(express.static(distDir));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
```

- [ ] **Step 2: Adicionar teste de arquivo estático em `server/app.test.ts`**

Adicionar no topo do arquivo:

```ts
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
```

Adicionar um novo bloco `describe` no final do arquivo. `__dirname` não existe em módulo ESM (o projeto usa `"type": "module"`), então o caminho do `dist/` é resolvido a partir de `process.cwd()` — o Vitest sempre roda com o diretório de trabalho na raiz do repositório:

```ts
describe('static frontend', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const alreadyExisted = existsSync(distDir);

  beforeAll(() => {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>CRM</title>');
  });

  afterAll(() => {
    if (!alreadyExisted) rmSync(distDir, { recursive: true, force: true });
  });

  it('serves index.html on the root path', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>CRM</title>');
  });

  it('falls through to JSON 404 for unmatched /api/ paths', async () => {
    const app = createApp();
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Não encontrado' });
  });
});
```

Adicionar `beforeAll, afterAll` ao import existente do `vitest` no topo do arquivo (linha 1 já tem `describe, it, expect` — trocar para `describe, it, expect, beforeAll, afterAll`).

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Expected: todos os testes (Tasks 1-5) passam — total 21 passed

- [ ] **Step 4: Adicionar script de conveniência no `package.json`**

Dentro de `"scripts"`, adicionar (mantendo os demais):

```json
    "build:full": "npm run build && npm run start",
```

(script auxiliar só para teste manual local: builda o frontend e sobe o servidor de produção)

- [ ] **Step 5: Testar manualmente em local**

Run: `npm run build && npm run start`
Expected: log `CRM server listening on port 3000`; abrir `http://localhost:3000` no navegador mostra o CRM carregando normalmente

- [ ] **Step 6: Commit**

```bash
git add server/app.ts server/app.test.ts package.json
git commit -m "feat: serve the built frontend from the Express server"
```

---

## Task 6: Dockerfile e definição do stack

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `deploy/docker-stack.yml`

- [ ] **Step 1: Criar `.dockerignore`**

```
node_modules
dist
dist-ssr
.git
.env
*.log
docs
```

Nota: `.env.local` **não** entra nessa lista de propósito — ele só contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave pública, segura para expor no bundle do cliente) e precisa estar presente durante `npm run build` para o Vite conseguir montar o cliente Supabase. Já `.env` (que tem `SUPABASE_SERVICE_ROLE_KEY`, segredo de servidor) fica de fora e os segredos de servidor são injetados só em tempo de execução via variáveis de ambiente do stack (Task 8).

- [ ] **Step 2: Criar `Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
COPY server ./server
COPY api/_shared ./api/_shared
COPY tsconfig.json ./
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
```

Nota: o estágio final roda `npm ci` completo (com devDependencies) porque `tsx` — usado para rodar o TypeScript do servidor sem etapa de compilação separada — hoje é uma devDependency. Para o tamanho/tráfego deste CRM interno isso é aceitável; simplifica o build e reaproveita a mesma ferramenta que `scripts/create-store.ts` já usa.

- [ ] **Step 3: Criar `deploy/docker-stack.yml`**

```yaml
version: "3.8"

services:
  app:
    image: crmautowise:latest
    networks:
      - adminautowise
    environment:
      PORT: "3000"
      SUPABASE_URL: "${SUPABASE_URL}"
      SUPABASE_SERVICE_ROLE_KEY: "${SUPABASE_SERVICE_ROLE_KEY}"
      EVOLUTION_API_URL: "${EVOLUTION_API_URL}"
      EVOLUTION_API_KEY: "${EVOLUTION_API_KEY}"
      FIPE_API_TOKEN: "${FIPE_API_TOKEN}"
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.crmautowise.rule=Host(`${CRM_HOST}`)"
        - "traefik.http.routers.crmautowise.entrypoints=websecure"
        - "traefik.http.routers.crmautowise.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.crmautowise.loadbalancer.server.port=3000"

networks:
  adminautowise:
    external: true
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore deploy/docker-stack.yml
git commit -m "feat: add Docker build and Swarm stack definition for the VPS deploy"
```

---

## Task 7 (ops): Build da imagem na VPS

Executado via SSH (`ssh -p 22022 -i ~/.ssh/crmautowise_vps root@129.121.36.63`).

- [ ] **Step 1: Clonar o repositório na VPS**

```bash
mkdir -p /root/apps && cd /root/apps
git clone https://github.com/ilucasmkt/crmautowise.git
cd crmautowise
```

- [ ] **Step 2: Criar o `.env.local` (variáveis públicas de build do Vite)**

```bash
cat > .env.local <<'EOF'
VITE_SUPABASE_URL=https://bykdihnpzpxyjeveztcx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rtUYBx5OHtujRPVBpYKAOw_1zBT0U8l
EOF
```

- [ ] **Step 3: Buildar a imagem Docker**

```bash
docker build -t crmautowise:latest .
```

Expected: build termina sem erro, `docker images | grep crmautowise` mostra a imagem criada.

---

## Task 8 (ops): Deploy no Swarm com o Traefik existente

- [ ] **Step 1: Criar o arquivo de segredos de runtime (fora do git)**

```bash
cd /root/apps/crmautowise/deploy
cat > stack.env <<'EOF'
SUPABASE_URL=https://bykdihnpzpxyjeveztcx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<valor de SUPABASE_SERVICE_ROLE_KEY do .env local do usuário>
EVOLUTION_API_URL=http://evolution_evolution_api:8080
EVOLUTION_API_KEY=<valor de AUTHENTICATION_API_KEY do serviço evolution_evolution_api>
FIPE_API_TOKEN=
CRM_HOST=autowisebrasil.com.br
EOF
```

- [ ] **Step 2: Deploy do stack**

```bash
cd /root/apps/crmautowise/deploy
export $(grep -v '^#' stack.env | xargs) && docker stack deploy -c docker-stack.yml crmautowise
```

- [ ] **Step 3: Confirmar que o serviço subiu**

Run: `docker service ls | grep crmautowise`
Expected: `1/1` réplicas rodando

- [ ] **Step 4: Testar o endpoint de saúde publicamente**

Run (da própria VPS ou de fora): `curl -s https://autowisebrasil.com.br/api/health`
Expected: `{"ok":true}` com certificado HTTPS válido (Let's Encrypt) — como o domínio raiz já resolve para essa VPS e hoje não tem nenhuma outra rota usando esse host no Traefik, isso entra no ar imediatamente sem afetar mais nada.

- [ ] **Step 5: Testar a conectividade interna com o Evolution API**

Run: `docker service logs crmautowise_app --tail 50`
Expected: nenhum erro de `ECONNREFUSED`/`ENOTFOUND` relacionado a `evolution_evolution_api`. Se aparecer erro de DNS, trocar `EVOLUTION_API_URL` em `stack.env` para `https://api.autowisebrasil.com.br` (valor já validado, hoje em uso pela Vercel) e rodar `docker stack deploy` de novo.

---

## Task 9 (ops, com o usuário): Checklist de validação manual

Com `https://autowisebrasil.com.br` já servindo a versão nova (Vercel continua intacta em `www` e no domínio da própria Vercel — nada foi desligado):

- [ ] Login funciona em `https://autowisebrasil.com.br`
- [ ] Kanban de leads carrega e permite editar um lead
- [ ] Conversas (WhatsApp): abrir uma conversa existente, ver mensagens, enviar uma mensagem de teste
- [ ] Cadastro de veículo: busca FIPE preenche marca/modelo/preço
- [ ] Equipe: convite de novo membro (ou pelo menos a tela carrega e o botão está habilitado para quem tem permissão)

Qualquer item que falhar, reportar o erro exato (print ou mensagem) antes de seguir para o corte de DNS.

---

## Task 10 (ops, com o usuário): Corte de DNS do `www`

Só depois da Task 9 confirmada pelo usuário.

- [ ] **Step 1: Adicionar `www` ao roteador do Traefik**

Editar `deploy/docker-stack.yml`, trocar a regra do router:

```yaml
        - "traefik.http.routers.crmautowise.rule=Host(`autowisebrasil.com.br`) || Host(`www.autowisebrasil.com.br`)"
```

Redeploy: `docker stack deploy -c docker-stack.yml crmautowise` (a partir de `deploy/`, com as env vars exportadas como na Task 8).

- [ ] **Step 2: Trocar o CNAME do `www` na Cloudflare**

No painel da Cloudflare, registro `www.autowisebrasil.com.br`: trocar o destino do CNAME da Vercel (`*.vercel-dns-*.com`) para apontar para o mesmo IP da VPS (`129.121.36.63`, tipo A) ou para `autowisebrasil.com.br` (tipo CNAME).

- [ ] **Step 3: Validar**

Run: `curl -s https://www.autowisebrasil.com.br/api/health`
Expected: `{"ok":true}`, certificado válido

---

## Task 11 (ops): Limpeza pós-corte e rotação de segredos

Só depois que o usuário confirmar que está tudo estável em produção há pelo menos alguns dias.

- [ ] **Step 1: Remover os artefatos só-da-Vercel do repositório**

```bash
git rm -r api vercel.json
```

Remover também `@vercel/node` do `package.json` (`devDependencies`) e rodar `npm install` para atualizar o `package-lock.json`.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove Vercel serverless functions after VPS cutover"
```

- [ ] **Step 3: Rotacionar segredos que passaram pelo chat durante a migração**

- `SUPABASE_SERVICE_ROLE_KEY`: gerar uma nova em Supabase Dashboard → Settings → API, atualizar `deploy/stack.env` na VPS e fazer novo `docker stack deploy`.
- Confirmar que a senha root da VPS já foi trocada (feito durante o levantamento inicial).

- [ ] **Step 4: Desligar o projeto na Vercel (opcional, a critério do usuário)**

Vercel Dashboard → projeto `crmautowise` → Settings → Delete Project (ou apenas deixar inativo, sem remover, como backup por mais alguns dias).
