import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_PREFIXES = ['cars', 'references'];
const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  const accessToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sessão inválida' });
    return;
  }

  const pathParam = req.query.path;
  const rawPath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam ?? '';
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length === 0 || !ALLOWED_PREFIXES.includes(segments[0])) {
    res.status(404).json({ error: 'Recurso não encontrado' });
    return;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  const queryString = query.toString();
  const targetUrl = `${FIPE_BASE_URL}/${segments.join('/')}${queryString ? `?${queryString}` : ''}`;

  const fipeToken = process.env.FIPE_API_TOKEN;
  const headers: Record<string, string> = {};
  if (fipeToken) headers['X-Subscription-Token'] = fipeToken;

  let fipeResponse: Response;
  try {
    fipeResponse = await fetch(targetUrl, { headers });
  } catch (err) {
    console.error('Erro ao contatar a API da FIPE:', err);
    res.status(502).json({ error: 'Falha ao consultar a FIPE' });
    return;
  }

  const body = await fipeResponse.json().catch(() => null);
  res.status(fipeResponse.status).json(body);
}
