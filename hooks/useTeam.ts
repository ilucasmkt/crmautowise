import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TeamMember } from '../types';

interface TeamRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: TeamMember['role'];
  status: TeamMember['status'];
  sales_count: number;
  leads_active: number;
  target_sales: number;
  avatar_color: string | null;
  joined_date: string;
  whatsapp_status: TeamMember['whatsappStatus'] | null;
  whatsapp_connected_number: string | null;
  whatsapp_session_id: string | null;
  whatsapp_battery: number | null;
  whatsapp_connected_at: string | null;
}

function fromRow(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    role: row.role,
    status: row.status,
    salesCount: row.sales_count,
    leadsActive: row.leads_active,
    targetSales: row.target_sales,
    avatarColor: row.avatar_color ?? 'bg-slate-500',
    joinedDate: row.joined_date,
    whatsappStatus: row.whatsapp_status ?? undefined,
    whatsappConnectedNumber: row.whatsapp_connected_number ?? undefined,
    whatsappSessionId: row.whatsapp_session_id ?? undefined,
    whatsappBattery: row.whatsapp_battery ?? undefined,
    whatsappConnectedAt: row.whatsapp_connected_at ?? undefined,
  };
}

export function useTeam(storeId: string) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('store_id', storeId);
    if (!error && data) setTeam((data as TeamRow[]).map(fromRow));
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMember = useCallback(
    async (newMember: Omit<TeamMember, 'id' | 'joinedDate'>) => {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          name: newMember.name,
          email: newMember.email,
          phone: newMember.phone,
          role: newMember.role,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Erro ao convidar usuário' }));
        throw new Error(body.error ?? 'Erro ao convidar usuário');
      }
      await reload();
    },
    [reload]
  );

  const updateMember = useCallback(async (updated: TeamMember) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        status: updated.status,
        target_sales: updated.targetSales,
      })
      .eq('id', updated.id);
    if (!error) setTeam((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) setTeam((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { team, loading, addMember, updateMember, deleteMember };
}
