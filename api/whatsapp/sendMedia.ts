import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../_shared/whatsapp.js';

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

  const { teamMemberId, number, mediaType, base64, mimetype, fileName } = req.body ?? {};
  if (!teamMemberId || !number || !base64 || (mediaType !== 'image' && mediaType !== 'audio')) {
    res.status(400).json({ error: 'teamMemberId, number, mediaType (image|audio) e base64 são obrigatórios' });
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

  const path = mediaType === 'image' ? 'sendMedia' : 'sendWhatsAppAudio';
  const body =
    mediaType === 'image'
      ? { number, mediatype: 'image', media: base64, mimetype, fileName }
      : { number, audio: base64 };

  let sendResponse: Response;
  try {
    sendResponse = await fetch(`${evolutionUrl}/message/${path}/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao enviar o arquivo' });
    return;
  }

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text().catch(() => '');
    console.error('Evolution API rejeitou o envio:', sendResponse.status, errorBody);
    res.status(502).json({ error: 'Não foi possível enviar o arquivo' });
    return;
  }

  res.status(200).json({ ok: true });
}
