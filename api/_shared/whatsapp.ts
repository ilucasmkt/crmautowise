import type { SupabaseClient } from '@supabase/supabase-js';

export function instanceNameFor(storeId: string, teamMemberId: string): string {
  return `crm_${storeId}_${teamMemberId}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function extractBearerToken(authHeader: string | string[] | undefined): string | null {
  return typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
}

export class AuthorizationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface AuthorizedTeamMember {
  storeId: string;
  instanceName: string;
}

export async function authorizeTeamMemberAccess(
  admin: SupabaseClient,
  accessToken: string,
  teamMemberId: string
): Promise<AuthorizedTeamMember> {
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new AuthorizationError(401, 'Sessão inválida');
  }

  const { data: callerProfile, error: callerError } = await admin
    .from('profiles')
    .select('store_id')
    .eq('id', userData.user.id)
    .single();
  if (callerError || !callerProfile) {
    throw new AuthorizationError(403, 'Perfil não encontrado');
  }

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('store_id')
    .eq('id', teamMemberId)
    .single();
  if (targetError || !targetProfile || targetProfile.store_id !== callerProfile.store_id) {
    throw new AuthorizationError(403, 'Membro da equipe não encontrado');
  }

  return {
    storeId: callerProfile.store_id,
    instanceName: instanceNameFor(callerProfile.store_id, teamMemberId),
  };
}
