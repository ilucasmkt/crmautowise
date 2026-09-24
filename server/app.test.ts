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
