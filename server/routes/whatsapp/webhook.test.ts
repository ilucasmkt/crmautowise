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
    expect(updateStoreEqMock).toHaveBeenCalledWith('id', STORE_ID);
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
