import { supabase } from './supabaseClient';
import { FipeOption, FipeDetail } from './fipe';

async function fipeGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api/fipe/${path}`, {
    headers: {
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro ao consultar a FIPE' }));
    throw new Error(body.error ?? 'Erro ao consultar a FIPE');
  }
  return response.json();
}

let brandsCache: FipeOption[] | null = null;
const modelsCache = new Map<string, FipeOption[]>();
const yearsCache = new Map<string, FipeOption[]>();

export async function fetchFipeBrands(): Promise<FipeOption[]> {
  if (brandsCache) return brandsCache;
  brandsCache = await fipeGet<FipeOption[]>('cars/brands');
  return brandsCache;
}

export async function fetchFipeModels(brandCode: string): Promise<FipeOption[]> {
  const cached = modelsCache.get(brandCode);
  if (cached) return cached;
  const models = await fipeGet<FipeOption[]>(`cars/brands/${brandCode}/models`);
  modelsCache.set(brandCode, models);
  return models;
}

export async function fetchFipeYears(brandCode: string, modelCode: string): Promise<FipeOption[]> {
  const cacheKey = `${brandCode}:${modelCode}`;
  const cached = yearsCache.get(cacheKey);
  if (cached) return cached;
  const years = await fipeGet<FipeOption[]>(`cars/brands/${brandCode}/models/${modelCode}/years`);
  yearsCache.set(cacheKey, years);
  return years;
}

export async function fetchFipeDetail(
  brandCode: string,
  modelCode: string,
  yearCode: string
): Promise<FipeDetail> {
  return fipeGet<FipeDetail>(`cars/brands/${brandCode}/models/${modelCode}/years/${yearCode}`);
}
