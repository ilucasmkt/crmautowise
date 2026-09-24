import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
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
  const remoteJid = typeof req.query.remoteJid === 'string' ? req.query.remoteJid : null;
  if (!teamMemberId || !remoteJid) {
    res.status(400).json({ error: 'teamMemberId e remoteJid são obrigatórios' });
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

  let messagesResponse: Response;
  try {
    messagesResponse = await fetch(`${evolutionUrl}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ where: { key: { remoteJid } } }),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao consultar as mensagens' });
    return;
  }

  const body = await messagesResponse.json().catch(() => null);
  const records = Array.isArray(body?.messages?.records) ? body.messages.records : [];

  const messages = records
    .map((record: any) => {
      const id = record.key?.id as string;
      const fromMe = Boolean(record.key?.fromMe);
      const timestamp = record.messageTimestamp ?? 0;
      const message = record.message ?? {};

      if (typeof message.conversation === 'string') {
        return { id, fromMe, timestamp, type: 'text' as const, text: message.conversation };
      }
      if (message.imageMessage) {
        return { id, fromMe, timestamp, type: 'image' as const, caption: message.imageMessage.caption };
      }
      if (message.audioMessage) {
        return { id, fromMe, timestamp, type: 'audio' as const };
      }
      return { id, fromMe, timestamp, type: 'unsupported' as const };
    })
    .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);

  res.status(200).json({ messages });
}
