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

export interface WhatsAppMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
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

export async function sendWhatsAppMessage(teamMemberId: string, remoteJid: string, text: string): Promise<void> {
  const response = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ teamMemberId, remoteJid, text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao enviar a mensagem' }));
    throw new Error(body.error ?? 'Erro ao enviar a mensagem');
  }
}
