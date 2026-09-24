import { supabase } from './supabaseClient';

export interface WhatsAppConnectResult {
  qrCodeBase64: string;
  instanceName: string;
}

export interface WhatsAppStatusResult {
  state: 'open' | 'connecting' | 'close' | string;
  phoneNumber?: string;
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
