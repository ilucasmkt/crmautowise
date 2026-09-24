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
  const routes: Array<[string, 'get' | 'post']> = [
    ['/api/whatsapp/connect', 'post'],
    ['/api/whatsapp/disconnect', 'post'],
    ['/api/whatsapp/status?teamMemberId=x', 'get'],
    ['/api/whatsapp/chats?teamMemberId=x', 'get'],
    ['/api/whatsapp/messages?teamMemberId=x&remoteJid=y', 'get'],
    ['/api/whatsapp/send', 'post'],
    ['/api/whatsapp/sendMedia', 'post'],
    ['/api/whatsapp/media?teamMemberId=x&messageId=y', 'get'],
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
