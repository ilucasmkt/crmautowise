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
