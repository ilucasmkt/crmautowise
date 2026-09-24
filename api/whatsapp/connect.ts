import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../_shared/whatsapp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    // Instance already exists (e.g. reconnecting after a disconnect) — fetch a fresh QR instead.
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
