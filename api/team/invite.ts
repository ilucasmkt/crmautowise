import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VALID_ROLES = [
  'Administrador',
  'Gerente de Vendas',
  'Consultor de Vendas',
  'Atendimento / BDC',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    res.status(500).json({ error: inviteError?.message ?? 'Erro ao enviar convite' });
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
    res.status(500).json({ error: profileError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
