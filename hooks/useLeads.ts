import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lead, LeadStage } from '../types';

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interested_vehicle: string | null;
  vehicle_price: number | null;
  source: Lead['source'];
  stage: Lead['stage'];
  temperature: Lead['temperature'];
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  last_contact_at: string | null;
  value: number | null;
  date_iso: string | null;
}

function fromRow(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? '',
    interestedVehicle: row.interested_vehicle ?? '',
    vehiclePrice: row.vehicle_price ?? undefined,
    source: row.source,
    stage: row.stage,
    temperature: row.temperature,
    assignedTo: row.assigned_to ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at ?? row.created_at,
    value: row.value ?? undefined,
    dateIso: row.date_iso ?? undefined,
  };
}

export function useLeads(storeId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setLeads((data as LeadRow[]).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addLead = useCallback(
    async (newLead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('leads')
        .insert({
          store_id: storeId,
          name: newLead.name,
          phone: newLead.phone,
          email: newLead.email,
          interested_vehicle: newLead.interestedVehicle,
          vehicle_price: newLead.vehiclePrice ?? null,
          source: newLead.source,
          stage: newLead.stage,
          temperature: newLead.temperature,
          assigned_to: newLead.assignedTo,
          notes: newLead.notes,
          last_contact_at: now,
          value: newLead.value ?? null,
          date_iso: now,
        })
        .select()
        .single();
      if (!error && data) setLeads((prev) => [fromRow(data as LeadRow), ...prev]);
    },
    [storeId]
  );

  const updateLead = useCallback(async (updated: Lead) => {
    const { error } = await supabase
      .from('leads')
      .update({
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        interested_vehicle: updated.interestedVehicle,
        vehicle_price: updated.vehiclePrice ?? null,
        source: updated.source,
        stage: updated.stage,
        temperature: updated.temperature,
        assigned_to: updated.assignedTo,
        notes: updated.notes,
        last_contact_at: updated.lastContactAt,
        value: updated.value ?? null,
      })
      .eq('id', updated.id);
    if (!error) setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLeadStage = useCallback(async (leadId: string, newStage: LeadStage) => {
    const lastContactAt = new Date().toISOString();
    const { error } = await supabase
      .from('leads')
      .update({ stage: newStage, last_contact_at: lastContactAt })
      .eq('id', leadId);
    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage, lastContactAt } : l))
      );
    }
  }, []);

  return { leads, loading, addLead, updateLead, deleteLead, updateLeadStage };
}
