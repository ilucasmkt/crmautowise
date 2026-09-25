import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken, authorizeTeamMemberAccess, AuthorizationError } from '../../../api/_shared/whatsapp.js';
import { jidToNumber } from '../../../api/_shared/jid.js';

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

  let chatsResponse: Response;
  try {
    chatsResponse = await fetch(`${evolutionUrl}/chat/findChats/${instanceName}`, {
      method: 'POST',
      headers: { apikey: evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.error('Erro ao contatar a Evolution API:', err);
    res.status(502).json({ error: 'Falha ao consultar as conversas' });
    return;
  }

  const body = await chatsResponse.json().catch(() => null);
  if (!chatsResponse.ok || !Array.isArray(body)) {
    res.status(200).json({ chats: [] });
    return;
  }

  const chats = body
    .filter((chat: any) => typeof chat.remoteJid === 'string' && !chat.remoteJid.endsWith('@g.us'))
    .map((chat: any) => {
      const sendTo = jidToNumber(chat.lastMessage?.key?.remoteJidAlt ?? chat.remoteJid);
      const lastMessage = chat.lastMessage?.message?.conversation ?? null;
      return {
        remoteJid: chat.remoteJid as string,
        sendTo,
        name: (chat.pushName as string | null) || sendTo,
        profilePicUrl: (chat.profilePicUrl as string | null) ?? undefined,
        lastMessage,
        lastMessageAt: chat.lastMessage?.messageTimestamp ?? null,
        lastMessageFromMe: chat.lastMessage?.key?.fromMe ?? false,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

  res.status(200).json({ chats });
}
