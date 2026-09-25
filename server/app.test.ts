import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
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
