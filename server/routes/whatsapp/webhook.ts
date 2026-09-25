import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createClient } from '@supabase/supabase-js';
import { parseInstanceName } from '../../../api/_shared/whatsapp.js';
import { jidToNumber } from '../../../api/_shared/jid.js';
import { findExternalAdReply } from '../../lib/adReply.js';

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expectedSecret || req.params.secret !== expectedSecret) {
    res.status(404).end();
    return;
  }

  try {
    const { event, instance, data } = req.body ?? {};

    if (event !== 'messages.upsert' || !data || typeof instance !== 'string') {
      res.status(200).json({ ok: true });
      return;
    }

    if (data.key?.fromMe) {
      res.status(200).json({ ok: true });
      return;
    }

    const remoteJid: string | undefined = data.key?.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us')) {
      res.status(200).json({ ok: true });
      return;
    }

    const adReply = findExternalAdReply(data);
    if (!adReply) {
      res.status(200).json({ ok: true });
      return;
    }

    const parsedInstance = parseInstanceName(instance);
    if (!parsedInstance) {
      res.status(200).json({ ok: true });
      return;
    }
    const { storeId, teamMemberId } = parsedInstance;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(200).json({ ok: true });
      return;
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const phone = jidToNumber(data.key.remoteJidAlt ?? remoteJid);

    const { data: existingLeads } = await admin
      .from('leads')
      .select('id')
      .eq('store_id', storeId)
      .eq('phone', phone)
      .limit(1);

    if (existingLeads && existingLeads.length > 0) {
      res.status(200).json({ ok: true });
      return;
    }

    const { data: storeRow } = await admin
      .from('stores')
      .select('last_rotation_profile_id')
      .eq('id', storeId)
      .single();

    const { data: rotationPool } = await admin
      .from('profiles')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('status', 'ativo')
      .eq('in_lead_rotation', true)
      .order('id', { ascending: true });

    let assignedProfile: { id: string; name: string } | null = null;
    let advancedRotation = false;

    if (rotationPool && rotationPool.length > 0) {
      const lastId = storeRow?.last_rotation_profile_id ?? null;
      const lastIndex = lastId ? rotationPool.findIndex((p) => p.id === lastId) : -1;
      const nextIndex = (lastIndex + 1) % rotationPool.length;
      assignedProfile = rotationPool[nextIndex];
      advancedRotation = true;
    } else {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('id, name')
        .eq('id', teamMemberId)
        .single();
      assignedProfile = ownerProfile ?? null;
    }

    if (!assignedProfile) {
      res.status(200).json({ ok: true });
      return;
    }

    const adText = [adReply.title, adReply.body].filter(Boolean).join('\n\n');

    await admin.from('leads').insert({
      store_id: storeId,
      name: data.pushName || phone,
      phone,
      source: 'Meta Ads',
      stage: 'novo',
      temperature: 'quente',
      assigned_to: assignedProfile.name,
      notes: adText || 'Lead recebido via anúncio Clique para WhatsApp.',
    });

    if (advancedRotation) {
      await admin.from('stores').update({ last_rotation_profile_id: assignedProfile.id }).eq('id', storeId);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao processar webhook de WhatsApp:', err);
    res.status(200).json({ ok: true });
  }
}
