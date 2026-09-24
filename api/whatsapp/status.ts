import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../_shared/whatsapp.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
