# Captura de Leads de Anúncio (Clique para WhatsApp) + Rodízio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda mensagem de WhatsApp que chegar de um anúncio "Clique para WhatsApp" do Meta cria um Lead sozinha no Pipeline, sem ação manual, com o responsável escolhido em rodízio entre os vendedores marcados em Ajustes.

**Architecture:** A Evolution API passa a avisar o servidor Express (webhook) toda vez que uma instância de WhatsApp recebe mensagem. O handler do webhook detecta o carimbo de anúncio (`externalAdReply`), verifica duplicidade por telefone, escolhe o responsável em rodízio (ou cai no dono do WhatsApp se ninguém estiver no rodízio) e insere o Lead via Supabase (service role). Duas colunas novas no banco guardam o estado do rodízio. O Pipeline passa a se atualizar sozinho a cada 60s.

**Tech Stack:** Express (rota nova no servidor já existente), Supabase (2 colunas novas), Vitest + Supertest.

## Global Constraints

- Endpoint do webhook é `POST /api/whatsapp/webhook/:secret`, validado contra `process.env.WHATSAPP_WEBHOOK_SECRET`
- Confirmado empiricamente contra a Evolution API real (v2.3.7): `POST {evolutionUrl}/webhook/set/{instance}` espera `{"webhook":{"enabled":true,"url":"...","events":["MESSAGES_UPSERT"]}}`
- Confirmado empiricamente contra dados reais: o payload do webhook de mensagem tem a forma `{event, instance, data: {key: {remoteJid, remoteJidAlt, fromMe, id}, pushName, message, contextInfo, messageType, ...}, ...}`; o campo `externalAdReply` (com `title`/`body`) pode estar aninhado em profundidades diferentes dependendo do tipo de mensagem — a extração deve buscar recursivamente, não assumir um caminho fixo
- Rodízio só se aplica a leads automáticos de anúncio, nunca a leads criados manualmente
- Zero mudança em `api/*.ts` (arquivos usados pela Vercel/backup) — só no `server/`
- Instância interna da URL do webhook: `http://crmautowise_app:3000` (nome do serviço no Swarm, confirmado em `docker service ls`)

---

## Task 1: Migração de banco + coluna de rodízio no time

**Files:**
- Create: `supabase/migrations/0004_ad_lead_rotation.sql`
- Modify: `types.ts:76-93` (interface `TeamMember`)
- Modify: `hooks/useTeam.ts`

**Interfaces:**
- Produces: `TeamMember.inLeadRotation: boolean`, persistido em `profiles.in_lead_rotation`
- Produces: coluna `stores.last_rotation_profile_id` (usada só pela Task 4, sem tipo TS correspondente — é estado interno do servidor)

- [ ] **Step 1: Criar a migração**

```sql
-- supabase/migrations/0004_ad_lead_rotation.sql
alter table profiles add column in_lead_rotation boolean not null default true;
alter table stores add column last_rotation_profile_id uuid references profiles(id) on delete set null;
```

- [ ] **Step 2: Adicionar o campo em `TeamMember` (`types.ts`)**

Localizar a interface `TeamMember` (linha ~76) e adicionar o campo depois de `whatsappConnectedAt`:

```ts
  whatsappConnectedAt?: string;
  inLeadRotation: boolean;
```

- [ ] **Step 3: Mapear o campo em `hooks/useTeam.ts`**

Na interface `TeamRow`, adicionar:

```ts
  in_lead_rotation: boolean;
```

Em `fromRow`, adicionar:

```ts
    whatsappConnectedAt: row.whatsapp_connected_at ?? undefined,
    inLeadRotation: row.in_lead_rotation,
```

Em `updateMember`, adicionar `in_lead_rotation` ao objeto passado pro `.update(...)`:

```ts
  const updateMember = useCallback(async (updated: TeamMember) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        status: updated.status,
        target_sales: updated.targetSales,
        in_lead_rotation: updated.inLeadRotation,
      })
      .eq('id', updated.id);
    if (!error) setTeam((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);
```

- [ ] **Step 4: Rodar o typecheck**

Run: `npm run lint`
Expected: sem erros (nenhum outro lugar cria um `TeamMember` sem `inLeadRotation` — se der erro de campo faltando em algum objeto literal, é porque outro arquivo mock/fixture precisa do campo também; adicionar `inLeadRotation: true` lá)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_ad_lead_rotation.sql types.ts hooks/useTeam.ts
git commit -m "feat: add lead rotation opt-in column to team members"
```

---

## Task 2: Seção de rodízio em Ajustes

**Files:**
- Modify: `components/AjustesView.tsx`
- Modify: `App.tsx:348-352` (uso de `<AjustesView>`)

**Interfaces:**
- Consumes: `TeamMember.inLeadRotation` (Task 1)

- [ ] **Step 1: Adicionar as props em `AjustesView.tsx`**

No import de tipos (linha 26), adicionar `TeamMember`:

```ts
import { StoreSettings, WorkingDayHours, TeamMember } from '../types';
```

Na interface `AjustesViewProps` e na desestruturação de props:

```ts
interface AjustesViewProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  team: TeamMember[];
  onUpdateMember: (member: TeamMember) => void;
  readOnly?: boolean;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  settings,
  onSaveSettings,
  team,
  onUpdateMember,
  readOnly = false,
}) => {
```

- [ ] **Step 2: Adicionar a seção de rodízio na aba "meta"**

Localizar o bloco `{activeTab === 'meta' && ( <div className="bg-white ..."> <fieldset disabled={readOnly} className="contents"> ... </fieldset> </div> )}` (por volta da linha 627). Envolver em fragment e adicionar um segundo card logo depois do primeiro `</div>` que fecha o card do Pixel, mas ainda dentro do `{activeTab === 'meta' && (...)}`:

```tsx
      {activeTab === 'meta' && (
        <>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
        <fieldset disabled={readOnly} className="contents">
          {/* ... todo o conteúdo existente do card do Pixel, sem nenhuma mudança ... */}
        </fieldset>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <fieldset disabled={readOnly} className="contents">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Rodízio de Leads de Anúncio</h2>
            <p className="text-xs text-slate-500">
              Quando um lead chegar automaticamente via anúncio "Clique para WhatsApp", o responsável roda entre os vendedores marcados abaixo, um de cada vez.
            </p>
          </div>

          <div className="space-y-2">
            {team.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum vendedor cadastrado ainda.</p>
            ) : (
              team.map((member) => (
                <div
                  key={member.id}
                  id={`rotation-toggle-${member.id}`}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{member.name}</span>
                    <span className="text-[11px] text-slate-500">{member.role}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={member.inLeadRotation}
                    onChange={(e) => onUpdateMember({ ...member, inLeadRotation: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                </div>
              ))
            )}
          </div>
        </fieldset>
        </div>
        </>
      )}
```

Importante: o card do Pixel existente **não muda nada por dentro** — só ganha um `<>`/`</>` em volta dos dois cards e o card novo é adicionado depois dele.

- [ ] **Step 3: Passar as novas props em `App.tsx`**

```tsx
          {activeSection === 'ajustes' && (
            <AjustesView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              team={team}
              onUpdateMember={handleUpdateTeamMember}
              readOnly={!canEditStoreSettings(profile.role)}
            />
          )}
```

- [ ] **Step 4: Rodar o typecheck**

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 5: Testar manualmente em local**

Run: `npm run dev`, abrir Ajustes > aba "Meta", conferir que a lista de vendedores aparece com os interruptores, e que clicar num interruptor não dá erro no console (mesmo sem backend rodando localmente, a chamada ao Supabase real deve funcionar já que usa as credenciais reais do `.env.local`)

- [ ] **Step 6: Commit**

```bash
git add components/AjustesView.tsx App.tsx
git commit -m "feat: add per-seller lead rotation toggle to Ajustes"
```

---

## Task 3: Helpers puros (detecção de anúncio + nome de instância)

**Files:**
- Create: `server/lib/adReply.ts`
- Create: `server/lib/adReply.test.ts`
- Modify: `api/_shared/whatsapp.ts`
- Create: `api/_shared/whatsapp.test.ts`

**Interfaces:**
- Produces: `findExternalAdReply(value: unknown): { title?: string; body?: string } | null` — usado pela Task 4
- Produces: `parseInstanceName(instanceName: string): { storeId: string; teamMemberId: string } | null` — usado pela Task 4

- [ ] **Step 1: Escrever o teste de `findExternalAdReply`**

```ts
// server/lib/adReply.test.ts
import { describe, it, expect } from 'vitest';
import { findExternalAdReply } from './adReply';

describe('findExternalAdReply', () => {
  it('returns null when there is no ad reply anywhere in the object', () => {
    expect(findExternalAdReply({ message: { conversation: 'Oi, tudo bem?' } })).toBeNull();
  });

  it('returns null for primitives and null input', () => {
    expect(findExternalAdReply(null)).toBeNull();
    expect(findExternalAdReply('texto')).toBeNull();
    expect(findExternalAdReply(42)).toBeNull();
  });

  it('finds externalAdReply nested inside imageMessage.contextInfo (real Evolution API shape)', () => {
    const realExample = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
      message: {
        imageMessage: {
          url: 'https://mmg.whatsapp.net/...',
          contextInfo: {
            ctwaPayload: 'abc123',
            isForwarded: true,
            externalAdReply: {
              body: 'Volkswagen Nivus Highline 2022 - R$ 111.990,00',
              title: 'APENAS 59.000km',
              ctwaClid: 'AfgIKdvvos5RsMLMihPFyLVyPaOrpXnlSWtX51BDRyTM',
            },
          },
        },
      },
      messageType: 'imageMessage',
    };

    expect(findExternalAdReply(realExample)).toEqual({
      title: 'APENAS 59.000km',
      body: 'Volkswagen Nivus Highline 2022 - R$ 111.990,00',
    });
  });

  it('finds externalAdReply at the top level of data.contextInfo', () => {
    const example = {
      contextInfo: {
        externalAdReply: { title: 'Promo', body: 'Descrição do anúncio' },
      },
    };
    expect(findExternalAdReply(example)).toEqual({ title: 'Promo', body: 'Descrição do anúncio' });
  });

  it('handles a title-only or body-only ad reply', () => {
    expect(findExternalAdReply({ contextInfo: { externalAdReply: { title: 'Só título' } } })).toEqual({
      title: 'Só título',
      body: undefined,
    });
  });
});
```

- [ ] **Step 2: Rodar o teste pra confirmar que falha**

Run: `npx vitest run server/lib/adReply.test.ts`
Expected: FAIL — `Cannot find module './adReply'`

- [ ] **Step 3: Implementar `findExternalAdReply`**

```ts
// server/lib/adReply.ts
export interface ExternalAdReply {
  title?: string;
  body?: string;
}

export function findExternalAdReply(value: unknown, depth = 0): ExternalAdReply | null {
  if (depth > 6 || value === null || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;

  if (obj.externalAdReply && typeof obj.externalAdReply === 'object') {
    const reply = obj.externalAdReply as Record<string, unknown>;
    return {
      title: typeof reply.title === 'string' ? reply.title : undefined,
      body: typeof reply.body === 'string' ? reply.body : undefined,
    };
  }

  for (const key of Object.keys(obj)) {
    const found = findExternalAdReply(obj[key], depth + 1);
    if (found) return found;
  }

  return null;
}
```

- [ ] **Step 4: Rodar o teste de novo**

Run: `npx vitest run server/lib/adReply.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Escrever o teste de `parseInstanceName`**

```ts
// api/_shared/whatsapp.test.ts
import { describe, it, expect } from 'vitest';
import { instanceNameFor, parseInstanceName } from './whatsapp';

describe('parseInstanceName', () => {
  it('roundtrips with instanceNameFor', () => {
    const storeId = '2f3677e9-23a4-44da-9305-76a34a636512';
    const teamMemberId = '29e511e5-96d9-4a8e-8adc-3d88a7c414f4';
    const name = instanceNameFor(storeId, teamMemberId);
    expect(parseInstanceName(name)).toEqual({ storeId, teamMemberId });
  });

  it('returns null for an instance name that does not start with crm_', () => {
    expect(parseInstanceName('mrveiculoscasabranca')).toBeNull();
  });

  it('returns null for a malformed instance name', () => {
    expect(parseInstanceName('crm_apenas-uma-parte')).toBeNull();
    expect(parseInstanceName('crm_a_b_c')).toBeNull();
  });
});
```

- [ ] **Step 6: Rodar o teste pra confirmar que falha**

Run: `npx vitest run api/_shared/whatsapp.test.ts`
Expected: FAIL — `parseInstanceName` não existe

- [ ] **Step 7: Implementar `parseInstanceName` em `api/_shared/whatsapp.ts`**

Adicionar, logo depois de `instanceNameFor`:

```ts
export function parseInstanceName(instanceName: string): { storeId: string; teamMemberId: string } | null {
  const parts = instanceName.split('_');
  if (parts.length !== 3 || parts[0] !== 'crm') return null;
  const [, storeId, teamMemberId] = parts;
  return { storeId, teamMemberId };
}
```

- [ ] **Step 8: Rodar os dois testes**

Run: `npx vitest run server/lib/adReply.test.ts api/_shared/whatsapp.test.ts`
Expected: 8 passed (5 + 3)

- [ ] **Step 9: Commit**

```bash
git add server/lib/adReply.ts server/lib/adReply.test.ts api/_shared/whatsapp.ts api/_shared/whatsapp.test.ts
git commit -m "feat: add ad-reply detection and instance-name parsing helpers"
```

---

## Task 4: Rota do webhook (`/api/whatsapp/webhook/:secret`)

**Files:**
- Create: `server/routes/whatsapp/webhook.ts`
- Create: `server/routes/whatsapp/webhook.test.ts`
- Modify: `server/app.ts`

**Interfaces:**
- Consumes: `findExternalAdReply` e `parseInstanceName` (Task 3); `jidToNumber` de `api/_shared/jid.ts` (já existe)
- Produces: `export default async function handler(req: ExpressRequest, res: ExpressResponse)`, montado em `POST /api/whatsapp/webhook/:secret`

- [ ] **Step 1: Criar `server/routes/whatsapp/webhook.ts`**

```ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { parseInstanceName } from '../../../api/_shared/whatsapp.js';
import { jidToNumber } from '../../../api/_shared/jid.js';
import { findExternalAdReply } from '../../lib/adReply.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expectedSecret || req.params.secret !== expectedSecret) {
    res.status(404).end();
    return;
  }

  try {
    const { event, instance, data } = req.body ?? {};

    if (event !== 'messages.upsert' || !data || typeof instance !== 'string') {
      res.status(200).json({ ok: true });
      return;
    }

    if (data.key?.fromMe) {
      res.status(200).json({ ok: true });
      return;
    }

    const remoteJid: string | undefined = data.key?.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us')) {
      res.status(200).json({ ok: true });
      return;
    }

    const adReply = findExternalAdReply(data);
    if (!adReply) {
      res.status(200).json({ ok: true });
      return;
    }

    const parsedInstance = parseInstanceName(instance);
    if (!parsedInstance) {
      res.status(200).json({ ok: true });
      return;
    }
    const { storeId, teamMemberId } = parsedInstance;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(200).json({ ok: true });
      return;
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const phone = jidToNumber(data.key.remoteJidAlt ?? remoteJid);

    const { data: existingLeads } = await admin
      .from('leads')
      .select('id')
      .eq('store_id', storeId)
      .eq('phone', phone)
      .limit(1);

    if (existingLeads && existingLeads.length > 0) {
      res.status(200).json({ ok: true });
      return;
    }

    const { data: storeRow } = await admin
      .from('stores')
      .select('last_rotation_profile_id')
      .eq('id', storeId)
      .single();

    const { data: rotationPool } = await admin
      .from('profiles')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('status', 'ativo')
      .eq('in_lead_rotation', true)
      .order('id', { ascending: true });

    let assignedProfile: { id: string; name: string } | null = null;
    let advancedRotation = false;

    if (rotationPool && rotationPool.length > 0) {
      const lastId = storeRow?.last_rotation_profile_id ?? null;
      const lastIndex = lastId ? rotationPool.findIndex((p) => p.id === lastId) : -1;
      const nextIndex = (lastIndex + 1) % rotationPool.length;
      assignedProfile = rotationPool[nextIndex];
      advancedRotation = true;
    } else {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('id, name')
        .eq('id', teamMemberId)
        .single();
      assignedProfile = ownerProfile ?? null;
    }

    if (!assignedProfile) {
      res.status(200).json({ ok: true });
      return;
    }

    const adText = [adReply.title, adReply.body].filter(Boolean).join('\n\n');

    await admin.from('leads').insert({
      store_id: storeId,
      name: data.pushName || phone,
      phone,
      source: 'Meta Ads',
      stage: 'novo',
      temperature: 'quente',
      assigned_to: assignedProfile.name,
      notes: adText || 'Lead recebido via anúncio Clique para WhatsApp.',
    });

    if (advancedRotation) {
      await admin.from('stores').update({ last_rotation_profile_id: assignedProfile.id }).eq('id', storeId);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao processar webhook de WhatsApp:', err);
    res.status(200).json({ ok: true });
  }
}
```

- [ ] **Step 2: Montar a rota em `server/app.ts`**

Adicionar o import:

```ts
import whatsappWebhookHandler from './routes/whatsapp/webhook.js';
```

E a rota (junto das outras rotas de whatsapp, antes do bloco de servir estático):

```ts
  app.post('/api/whatsapp/webhook/:secret', asyncHandler(whatsappWebhookHandler));
```

- [ ] **Step 3: Escrever os testes em `server/routes/whatsapp/webhook.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';

let leadsListResult: { data: any[] | null; error: any };
let storeSingleResult: { data: any; error: any };
let profilesListResult: { data: any[] | null; error: any };
let profilesSingleResult: { data: any; error: any };
const insertLeadMock = vi.fn();
const updateStoreEqMock = vi.fn();

function chainable(listResult: any, singleResult: any) {
  const handler: any = {
    select: () => handler,
    eq: () => handler,
    order: () => handler,
    limit: () => handler,
    single: () => Promise.resolve(singleResult),
    then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject),
  };
  return handler;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'leads') {
        return {
          select: () => chainable(leadsListResult, leadsListResult),
          insert: insertLeadMock,
        };
      }
      if (table === 'stores') {
        return {
          select: () => chainable(storeSingleResult, storeSingleResult),
          update: () => ({ eq: updateStoreEqMock }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => chainable(profilesListResult, profilesSingleResult),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const STORE_ID = '2f3677e9-23a4-44da-9305-76a34a636512';
const OWNER_ID = '29e511e5-96d9-4a8e-8adc-3d88a7c414f4';
const INSTANCE = `crm_${STORE_ID}_${OWNER_ID}`;

function adMessage(overrides: Record<string, any> = {}) {
  return {
    event: 'messages.upsert',
    instance: INSTANCE,
    data: {
      key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
      pushName: 'Cliente Teste',
      message: {
        imageMessage: {
          contextInfo: {
            externalAdReply: { title: 'Anúncio Teste', body: 'Descrição do carro' },
          },
        },
      },
      messageType: 'imageMessage',
      ...overrides,
    },
  };
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.WHATSAPP_WEBHOOK_SECRET = 'test-secret';
  leadsListResult = { data: [], error: null };
  storeSingleResult = { data: { last_rotation_profile_id: null }, error: null };
  profilesListResult = { data: [], error: null };
  profilesSingleResult = { data: { id: OWNER_ID, name: 'Dona do WhatsApp' }, error: null };
  insertLeadMock.mockReset().mockResolvedValue({ data: null, error: null });
  updateStoreEqMock.mockReset().mockResolvedValue({ data: null, error: null });
});

describe('POST /api/whatsapp/webhook/:secret', () => {
  it('returns 404 with the wrong secret', async () => {
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/senha-errada').send(adMessage());
    expect(res.status).toBe(404);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('does nothing for events other than messages.upsert', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/whatsapp/webhook/test-secret')
      .send({ event: 'connection.update', instance: INSTANCE, data: {} });
    expect(res.status).toBe(200);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('ignores messages sent by the seller (fromMe)', async () => {
    const app = createApp();
    const payload = adMessage();
    payload.data.key.fromMe = true;
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(payload);
    expect(res.status).toBe(200);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('ignores group messages', async () => {
    const app = createApp();
    const payload = adMessage();
    payload.data.key.remoteJid = '120363393006435084@g.us';
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(payload);
    expect(res.status).toBe(200);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('ignores messages without an ad reply', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/whatsapp/webhook/test-secret')
      .send({
        event: 'messages.upsert',
        instance: INSTANCE,
        data: {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
          pushName: 'Cliente Teste',
          message: { conversation: 'Oi, tudo bem?' },
        },
      });
    expect(res.status).toBe(200);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('skips creating a lead when the phone already exists', async () => {
    leadsListResult = { data: [{ id: 'lead-existente' }], error: null };
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(adMessage());
    expect(res.status).toBe(200);
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it('assigns the WhatsApp owner when nobody is in the rotation pool', async () => {
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(adMessage());

    expect(res.status).toBe(200);
    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: STORE_ID,
        phone: '5511999999999',
        source: 'Meta Ads',
        stage: 'novo',
        assigned_to: 'Dona do WhatsApp',
        notes: 'Anúncio Teste\n\nDescrição do carro',
      })
    );
    expect(updateStoreEqMock).not.toHaveBeenCalled();
  });

  it('assigns the first rotation-pool member when there is no previous turn', async () => {
    profilesListResult = {
      data: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Bruno' },
      ],
      error: null,
    };
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(adMessage());

    expect(res.status).toBe(200);
    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: 'Ana' }));
    expect(updateStoreEqMock).toHaveBeenCalledWith(STORE_ID);
  });

  it('rotates to the next member after the last one assigned', async () => {
    profilesListResult = {
      data: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Bruno' },
      ],
      error: null,
    };
    storeSingleResult = { data: { last_rotation_profile_id: 'p1' }, error: null };
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(adMessage());

    expect(res.status).toBe(200);
    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: 'Bruno' }));
  });

  it('wraps around to the first member after the last one in the pool', async () => {
    profilesListResult = {
      data: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Bruno' },
      ],
      error: null,
    };
    storeSingleResult = { data: { last_rotation_profile_id: 'p2' }, error: null };
    const app = createApp();
    const res = await request(app).post('/api/whatsapp/webhook/test-secret').send(adMessage());

    expect(res.status).toBe(200);
    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: 'Ana' }));
  });
});
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run server/routes/whatsapp/webhook.test.ts`
Expected: 10 passed

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: todos os testes passam (Tasks 1-4 combinadas)

- [ ] **Step 6: Commit**

```bash
git add server/routes/whatsapp/webhook.ts server/routes/whatsapp/webhook.test.ts server/app.ts
git commit -m "feat: capture leads from Click-to-WhatsApp ads via Evolution API webhook"
```

---

## Task 5: Registrar o webhook automaticamente ao conectar o WhatsApp

**Files:**
- Modify: `server/routes/whatsapp/connect.ts`

**Interfaces:**
- Consumes: `process.env.WHATSAPP_WEBHOOK_SECRET` (mesma variável da Task 4)

- [ ] **Step 1: Adicionar a função de registro do webhook**

No topo de `server/routes/whatsapp/connect.ts`, depois dos imports existentes, adicionar:

```ts
async function registerWebhook(evolutionUrl: string, evolutionKey: string, instanceName: string): Promise<void> {
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!webhookSecret) return;

  try {
    // Endereço interno do Swarm — mais rápido e não depende de internet
    // pública entre a Evolution API e o CRM, já que os dois containers
    // estão na mesma rede.
    await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: `http://crmautowise_app:3000/api/whatsapp/webhook/${webhookSecret}`,
          events: ['MESSAGES_UPSERT'],
        },
      }),
    });
  } catch (err) {
    console.error('Erro ao configurar webhook da Evolution API:', err);
  }
}
```

- [ ] **Step 2: Chamar a função nos dois caminhos de sucesso**

No bloco de reconexão (dentro do `if (createResponse.status === 403) { ... }`), logo antes do `res.status(200).json({ qrCodeBase64: connectBody.base64, instanceName });` existente, adicionar:

```ts
    await registerWebhook(evolutionUrl, evolutionKey, instanceName);
    res.status(200).json({ qrCodeBase64: connectBody.base64, instanceName });
```

E no caminho normal de criação, logo antes do `res.status(200).json({ qrCodeBase64: createBody.qrcode.base64, instanceName });` final, adicionar:

```ts
  await registerWebhook(evolutionUrl, evolutionKey, instanceName);
  res.status(200).json({ qrCodeBase64: createBody.qrcode.base64, instanceName });
```

- [ ] **Step 3: Rodar os testes existentes de `connect`**

Run: `npx vitest run server/routes/whatsapp.test.ts`
Expected: passa (o teste de `connect` mocka `fetch` genericamente com `mockResolvedValue`, que passa a responder tanto pra chamada de criação quanto pra chamada de `registerWebhook` com o mesmo resultado — como `registerWebhook` ignora o corpo da resposta, isso não quebra nada)

- [ ] **Step 4: Commit**

```bash
git add server/routes/whatsapp/connect.ts
git commit -m "feat: auto-register the ad-capture webhook when a WhatsApp connects"
```

---

## Task 6: Pipeline atualiza sozinho

**Files:**
- Modify: `hooks/useLeads.ts`

- [ ] **Step 1: Trocar o `useEffect` de carga única por um com atualização periódica**

```ts
  useEffect(() => {
    reload();
    const interval = setInterval(reload, 60000);
    return () => clearInterval(interval);
  }, [reload]);
```

(substitui o `useEffect(() => { reload(); }, [reload]);` existente)

- [ ] **Step 2: Rodar o typecheck**

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add hooks/useLeads.ts
git commit -m "feat: auto-refresh leads every 60s so ad-captured cards appear without a reload"
```

---

## Task 7 (ops): Aplicar em produção

- [ ] **Step 1: Gerar o segredo do webhook**

```bash
openssl rand -hex 16
```

- [ ] **Step 2: Aplicar a migração no Supabase**

Copiar o conteúdo de `supabase/migrations/0004_ad_lead_rotation.sql` e colar no **SQL Editor** do painel do Supabase (dashboard do projeto → SQL Editor → New query → Run).

- [ ] **Step 3: Adicionar o segredo no `stack.env` e no `docker-stack.yml`, e redeploy**

`stack.env` sozinho não basta — o `environment:` do `docker-stack.yml` só repassa pro container as variáveis que ele lista explicitamente. Adicionar a linha `WHATSAPP_WEBHOOK_SECRET: "${WHATSAPP_WEBHOOK_SECRET}"` no bloco `environment:` de `deploy/docker-stack.yml` (commitado no repositório, ao lado das outras), e só então:

```bash
ssh -p 22022 -i ~/.ssh/crmautowise_vps root@129.121.36.63
echo 'WHATSAPP_WEBHOOK_SECRET=<valor gerado no Step 1>' >> /root/apps/crmautowise/deploy/stack.env
cd /root/apps/crmautowise/deploy
export $(grep -v '^#' stack.env | xargs) && docker stack deploy -c docker-stack.yml crmautowise
```

Confirmar que chegou no container antes de seguir:

```bash
docker exec $(docker ps -q -f name=crmautowise_app) sh -c 'echo $WHATSAPP_WEBHOOK_SECRET'
```

Expected: imprime o valor gerado no Step 1 (não vazio)

- [ ] **Step 4: Registrar o webhook na instância que já existe (Avenida Motors)**

Não passa pelo fluxo de `connect` (já está conectada), então precisa de uma chamada manual uma única vez:

```bash
curl -sk -X POST -H "apikey: <valor de EVOLUTION_API_KEY em deploy/stack.env>" -H "Content-Type: application/json" \
  https://api.autowisebrasil.com.br/webhook/set/crm_2f3677e9-23a4-44da-9305-76a34a636512_29e511e5-96d9-4a8e-8adc-3d88a7c414f4 \
  -d '{"webhook":{"enabled":true,"url":"http://crmautowise_app:3000/api/whatsapp/webhook/<valor gerado no Step 1>","events":["MESSAGES_UPSERT"]}}'
```

(Isso sobrescreve o webhook de teste com URL `.../testsecret` que foi configurado nessa mesma instância durante o levantamento técnico da spec — sem efeito, já que a rota só passou a existir na Task 4.)

- [ ] **Step 5: Verificar que o endpoint responde**

```bash
curl -sk -o /dev/null -w "status: %{http_code}\n" -X POST https://autowisebrasil.com.br/api/whatsapp/webhook/senha-errada -d '{}'
```

Expected: `status: 404` (segredo errado rejeitado)

- [ ] **Step 6: Teste de ponta a ponta**

Pedir pro usuário clicar em um anúncio "Clique para WhatsApp" real da loja (ou simular mandando uma mensagem qualquer pro número conectado) e conferir, em até 1 minuto, se:
- Mensagens **sem** vir de anúncio não criam lead (comportamento esperado, não é bug)
- Uma conversa iniciada por um anúncio real cria o card na coluna "Novos Leads" do Pipeline, com Origem "Meta Ads" e o texto do anúncio em Observações
