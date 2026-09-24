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
