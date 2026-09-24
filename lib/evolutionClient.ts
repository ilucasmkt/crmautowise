import { supabase } from './supabaseClient';

export interface WhatsAppConnectResult {
  qrCodeBase64: string;
  instanceName: string;
}

export interface WhatsAppStatusResult {
  state: 'open' | 'connecting' | 'close' | string;
  phoneNumber?: string;
}

export interface WhatsAppChat {
  remoteJid: string;
  sendTo: string;
  name: string;
  profilePicUrl?: string;
  lastMessage: string | null;
  lastMessageAt: number | null;
  lastMessageFromMe: boolean;
}

export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'unsupported';

export interface WhatsAppMessage {
  id: string;
  fromMe: boolean;
  timestamp: number;
  type: WhatsAppMessageType;
  text?: string;
  caption?: string;
  /** Set only for optimistic local messages we just sent (image/audio), so they render instantly. */
  localDataUri?: string;
}

export interface WhatsAppMedia {
  mimetype: string;
  base64: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
}

export async function connectWhatsApp(teamMemberId: string): Promise<WhatsAppConnectResult> {
  const response = await fetch('/api/whatsapp/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ teamMemberId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao conectar o WhatsApp' }));
    throw new Error(body.error ?? 'Erro ao conectar o WhatsApp');
  }
  return response.json();
}

export async function getWhatsAppStatus(teamMemberId: string): Promise<WhatsAppStatusResult> {
  const response = await fetch(`/api/whatsapp/status?teamMemberId=${encodeURIComponent(teamMemberId)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao consultar status do WhatsApp' }));
    throw new Error(body.error ?? 'Erro ao consultar status do WhatsApp');
  }
  return response.json();
}

export async function disconnectWhatsApp(teamMemberId: string): Promise<void> {
  const response = await fetch('/api/whatsapp/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ teamMemberId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao desconectar o WhatsApp' }));
    throw new Error(body.error ?? 'Erro ao desconectar o WhatsApp');
  }
}

export async function getWhatsAppChats(teamMemberId: string): Promise<WhatsAppChat[]> {
  const response = await fetch(`/api/whatsapp/chats?teamMemberId=${encodeURIComponent(teamMemberId)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao carregar as conversas' }));
    throw new Error(body.error ?? 'Erro ao carregar as conversas');
  }
  const data = await response.json();
  return data.chats;
}

export async function getWhatsAppMessages(teamMemberId: string, remoteJid: string): Promise<WhatsAppMessage[]> {
  const response = await fetch(
    `/api/whatsapp/messages?teamMemberId=${encodeURIComponent(teamMemberId)}&remoteJid=${encodeURIComponent(remoteJid)}`,
    { headers: await authHeaders() }
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao carregar as mensagens' }));
    throw new Error(body.error ?? 'Erro ao carregar as mensagens');
  }
  const data = await response.json();
  return data.messages;
}

export async function sendWhatsAppMessage(teamMemberId: string, number: string, text: string): Promise<void> {
  const response = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ teamMemberId, number, text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao enviar a mensagem' }));
    throw new Error(body.error ?? 'Erro ao enviar a mensagem');
  }
}

export async function getWhatsAppMedia(teamMemberId: string, messageId: string): Promise<WhatsAppMedia> {
  const response = await fetch(
    `/api/whatsapp/media?teamMemberId=${encodeURIComponent(teamMemberId)}&messageId=${encodeURIComponent(messageId)}`,
    { headers: await authHeaders() }
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao carregar a mídia' }));
    throw new Error(body.error ?? 'Erro ao carregar a mídia');
  }
  return response.json();
}

export async function sendWhatsAppMedia(
  teamMemberId: string,
  number: string,
  mediaType: 'image' | 'audio',
  base64: string,
  mimetype: string,
  fileName?: string
): Promise<void> {
  const response = await fetch('/api/whatsapp/sendMedia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ teamMemberId, number, mediaType, base64, mimetype, fileName }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao enviar o arquivo' }));
    throw new Error(body.error ?? 'Erro ao enviar o arquivo');
  }
}
