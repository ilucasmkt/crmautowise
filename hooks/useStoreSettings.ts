import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { StoreSettings } from '../types';

interface StoreRow {
  id: string;
  store_name: string;
  legal_name: string | null;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  google_tag_manager_id: string | null;
  enable_pixel_events: boolean;
  working_hours: StoreSettings['workingHours'];
}

function fromRow(row: StoreRow): StoreSettings {
  return {
    storeName: row.store_name,
    legalName: row.legal_name ?? '',
    cnpj: row.cnpj ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zipCode: row.zip_code ?? '',
    logoUrl: row.logo_url ?? undefined,
    metaPixelId: row.meta_pixel_id ?? '',
    metaAccessToken: row.meta_access_token ?? '',
    googleTagManagerId: row.google_tag_manager_id ?? '',
    enablePixelEvents: row.enable_pixel_events,
    workingHours: row.working_hours ?? [],
  };
}

export function useStoreSettings(storeId: string) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSettings(fromRow(data as StoreRow));
        setLoading(false);
      });
  }, [storeId]);

  const saveSettings = useCallback(
    async (updated: StoreSettings) => {
      const { error } = await supabase
        .from('stores')
        .update({
          store_name: updated.storeName,
          legal_name: updated.legalName,
          cnpj: updated.cnpj,
          phone: updated.phone,
          whatsapp: updated.whatsapp,
          email: updated.email,
          address: updated.address,
          city: updated.city,
          state: updated.state,
          zip_code: updated.zipCode,
          logo_url: updated.logoUrl ?? null,
          meta_pixel_id: updated.metaPixelId,
          meta_access_token: updated.metaAccessToken,
          google_tag_manager_id: updated.googleTagManagerId,
          enable_pixel_events: updated.enablePixelEvents,
          working_hours: updated.workingHours,
        })
        .eq('id', storeId);
      if (!error) setSettings(updated);
    },
    [storeId]
  );

  return { settings, loading, saveSettings };
}
