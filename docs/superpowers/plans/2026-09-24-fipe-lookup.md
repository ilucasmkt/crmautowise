# FIPE Auto-Lookup for Vehicle Registration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Estoque (inventory) vehicle form, let the user pick a car via cascading Marca → Modelo → Ano selects backed by the official FIPE table, auto-filling brand/model/version/year/fuel/FIPE price, while sale price and the rest stay manual. Remove the license plate badge from the public Hot Site (plate and FIPE price are internal-only).

**Architecture:** A Vercel serverless function (`api/fipe/[...path].ts`) proxies whitelisted, authenticated `GET` requests to the public Parallelum FIPE API (`https://fipe.parallelum.com.br/api/v2`), injecting an optional API token server-side. The frontend (`lib/fipe.ts`) calls this proxy and normalizes the data (price string → number, fuel string → the app's enum, one FIPE model string → a best-effort `model`/`version` split). A new `FipeVehiclePicker` component renders the cascading selects and reports the final pick to `EstoqueView.tsx`, which fills its existing form state — no different from the user typing the values in by hand.

**Tech Stack:** React 19 + TypeScript (Vite), Supabase (Postgres + Auth), Vercel Serverless Functions (`@vercel/node`), Vitest.

## Global Constraints

- Plate and FIPE reference price must never be shown on the public Hot Site — internal-only fields (per spec Goals).
- Sale price (`price`) is never auto-filled by the FIPE lookup — always typed by the user (per spec Goals).
- A manual fallback (free-text brand/model) must always be available — never a dead end when a car isn't in the FIPE table (per spec Goals / Error handling).
- The FIPE API token is optional; the feature must work without one (500 req/day, unauthenticated) and pick up `FIPE_API_TOKEN` from the server environment automatically if set, with no code change (per spec Architecture).
- The proxy never exposes the token to the browser, and only forwards `GET` requests to `cars/*` or `references` paths after verifying a valid Supabase session (per spec Architecture).
- `year` (Ano Fab.) is set equal to the FIPE `modelYear` on auto-fill — never invent an offset (per spec UI section).

---

### Task 1: Remove the plate badge from the public Hot Site

**Files:**
- Modify: `components/HotSiteView.tsx:494-502`, `components/HotSiteView.tsx:820-828`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (fully independent fix).

- [ ] **Step 1: Remove the first plate badge (mobile/preview slide)**

In `components/HotSiteView.tsx`, find:

```tsx
                        {/* Slide Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Oportunidade Única
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-xs text-slate-900 shadow-xs">
                            Placa {selectedCar.plate}
                          </span>
                        </div>
```

Replace with:

```tsx
                        {/* Slide Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Oportunidade Única
                          </span>
                        </div>
```

- [ ] **Step 2: Remove the second plate badge (full-page tab slide)**

In the same file, find:

```tsx
                          {/* Slide Badges */}
                          <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> Oferta Especial
                            </span>
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur-xs text-slate-900 shadow-sm">
                              Placa {selectedCar.plate}
                            </span>
                          </div>
```

Replace with:

```tsx
                          {/* Slide Badges */}
                          <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> Oferta Especial
                            </span>
                          </div>
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors (Sparkles is still used; no other reference to `selectedCar.plate` remains in this file).

- [ ] **Step 4: Commit**

```bash
git add components/HotSiteView.tsx
git commit -m "fix: remove plate badge from public Hot Site (internal-only data)"
```

---

### Task 2: Add FIPE tracking fields to the vehicle data model

**Files:**
- Create: `supabase/migrations/0003_fipe_fields.sql`
- Modify: `types.ts:19-38` (`Vehicle` interface)
- Modify: `hooks/useVehicles.ts` (`VehicleRow` interface, `fromRow`, `addVehicle`, `updateVehicle`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Vehicle.fipeCode?: string`, `Vehicle.fipeReferenceMonth?: string` — read/written by Task 6/7's UI and persisted end-to-end.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0003_fipe_fields.sql`:

```sql
alter table vehicles
  add column fipe_code text,
  add column fipe_reference_month text;
```

- [ ] **Step 2: Add the fields to the `Vehicle` type**

In `types.ts`, find:

```ts
  price: number;
  fipePrice?: number;
  fuel: 'Flex' | 'Gasolina' | 'Diesel' | 'Híbrido' | 'Elétrico';
```

Replace with:

```ts
  price: number;
  fipePrice?: number;
  fipeCode?: string;
  fipeReferenceMonth?: string;
  fuel: 'Flex' | 'Gasolina' | 'Diesel' | 'Híbrido' | 'Elétrico';
```

- [ ] **Step 3: Read/write the new columns in `useVehicles`**

In `hooks/useVehicles.ts`, find:

```ts
  fipe_price: number | null;
  fuel: Vehicle['fuel'];
```

Replace with:

```ts
  fipe_price: number | null;
  fipe_code: string | null;
  fipe_reference_month: string | null;
  fuel: Vehicle['fuel'];
```

Find:

```ts
    fipePrice: row.fipe_price ?? undefined,
    fuel: row.fuel,
```

Replace with:

```ts
    fipePrice: row.fipe_price ?? undefined,
    fipeCode: row.fipe_code ?? undefined,
    fipeReferenceMonth: row.fipe_reference_month ?? undefined,
    fuel: row.fuel,
```

Find (inside `addVehicle`'s `.insert({...})`):

```ts
          fipe_price: newVehicle.fipePrice ?? null,
          fuel: newVehicle.fuel,
```

Replace with:

```ts
          fipe_price: newVehicle.fipePrice ?? null,
          fipe_code: newVehicle.fipeCode ?? null,
          fipe_reference_month: newVehicle.fipeReferenceMonth ?? null,
          fuel: newVehicle.fuel,
```

Find (inside `updateVehicle`'s `.update({...})`):

```ts
        fipe_price: updated.fipePrice ?? null,
        fuel: updated.fuel,
```

Replace with:

```ts
        fipe_price: updated.fipePrice ?? null,
        fipe_code: updated.fipeCode ?? null,
        fipe_reference_month: updated.fipeReferenceMonth ?? null,
        fuel: updated.fuel,
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Apply the migration in Supabase**

Open the Supabase dashboard for this project → SQL Editor → paste the full contents of `supabase/migrations/0003_fipe_fields.sql` → Run. Confirm it succeeds (no rows affected is expected; it's a schema change).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_fipe_fields.sql types.ts hooks/useVehicles.ts
git commit -m "feat: add fipe_code and fipe_reference_month to vehicles"
```

---

### Task 3: FIPE client module (`lib/fipe.ts`)

**Files:**
- Create: `lib/fipe.ts`
- Test: `lib/fipe.test.ts`

**Interfaces:**
- Consumes: `supabase` from `lib/supabaseClient.ts` (`supabase.auth.getSession()`); `Vehicle` from `types.ts` (for the `Vehicle['fuel']` return type).
- Produces (used by Task 5 `FipeVehiclePicker.tsx`):
  - `interface FipeOption { code: string; name: string }`
  - `interface FipeDetail { brand: string; model: string; modelYear: number; fuel: string; fuelAcronym: string; codeFipe: string; price: string; referenceMonth: string; vehicleType: number }`
  - `fetchFipeBrands(): Promise<FipeOption[]>`
  - `fetchFipeModels(brandCode: string): Promise<FipeOption[]>`
  - `fetchFipeYears(brandCode: string, modelCode: string): Promise<FipeOption[]>`
  - `fetchFipeDetail(brandCode: string, modelCode: string, yearCode: string): Promise<FipeDetail>`
  - `parseFipePrice(raw: string): number`
  - `mapFipeFuel(raw: string): Vehicle['fuel']`
  - `splitFipeModel(raw: string): { model: string; version: string }`

- [ ] **Step 1: Write the failing tests for the pure functions**

Create `lib/fipe.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFipePrice, mapFipeFuel, splitFipeModel } from './fipe';

describe('parseFipePrice', () => {
  it('parses a standard FIPE price string', () => {
    expect(parseFipePrice('R$ 10.000,00')).toBe(10000);
  });

  it('parses a price with a single thousands group', () => {
    expect(parseFipePrice('R$ 4.842,00')).toBe(4842);
  });

  it('parses a large price with multiple thousand separators', () => {
    expect(parseFipePrice('R$ 189.450,50')).toBe(189450.5);
  });

  it('returns 0 for an unparseable string', () => {
    expect(parseFipePrice('indisponível')).toBe(0);
  });
});

describe('mapFipeFuel', () => {
  it('maps Gasolina', () => {
    expect(mapFipeFuel('Gasolina')).toBe('Gasolina');
  });

  it('maps Diesel', () => {
    expect(mapFipeFuel('Diesel')).toBe('Diesel');
  });

  it('maps Híbrido', () => {
    expect(mapFipeFuel('Híbrido')).toBe('Híbrido');
  });

  it('maps Elétrico', () => {
    expect(mapFipeFuel('Elétrico')).toBe('Elétrico');
  });

  it('falls back to Flex for Álcool', () => {
    expect(mapFipeFuel('Álcool')).toBe('Flex');
  });

  it('falls back to Flex for an unknown fuel string', () => {
    expect(mapFipeFuel('Gás Natural')).toBe('Flex');
  });
});

describe('splitFipeModel', () => {
  it('splits a model with engine displacement into model and full version', () => {
    const result = splitFipeModel('COROLLA XEI 2.0 Flex 16V Aut.');
    expect(result.model).toBe('COROLLA XEI');
    expect(result.version).toBe('COROLLA XEI 2.0 Flex 16V Aut.');
  });

  it('falls back to the first word when the string starts with a number', () => {
    const result = splitFipeModel('147 C/ CL');
    expect(result.model).toBe('147');
    expect(result.version).toBe('147 C/ CL');
  });

  it('keeps a single-word model as-is', () => {
    const result = splitFipeModel('Uno');
    expect(result.model).toBe('Uno');
    expect(result.version).toBe('Uno');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/fipe.test.ts`
Expected: FAIL — `lib/fipe.ts` does not exist yet (`Cannot find module './fipe'` or similar).

- [ ] **Step 3: Implement `lib/fipe.ts`**

Create `lib/fipe.ts`:

```ts
import { supabase } from './supabaseClient';
import { Vehicle } from '../types';

export interface FipeOption {
  code: string;
  name: string;
}

export interface FipeDetail {
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fuelAcronym: string;
  codeFipe: string;
  price: string;
  referenceMonth: string;
  vehicleType: number;
}

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

export function parseFipePrice(raw: string): number {
  const normalized = raw.replace(/[^\d,]/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function mapFipeFuel(raw: string): Vehicle['fuel'] {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes('diesel')) return 'Diesel';
  if (normalized.includes('híbrido') || normalized.includes('hibrido')) return 'Híbrido';
  if (normalized.includes('elétrico') || normalized.includes('eletrico')) return 'Elétrico';
  if (normalized.includes('gasolina')) return 'Gasolina';
  return 'Flex';
}

export function splitFipeModel(raw: string): { model: string; version: string } {
  const trimmed = raw.trim();
  const tokens = trimmed.split(/\s+/);
  const displacementIndex = tokens.findIndex((token) => /^\d+[.,]\d+$/.test(token));
  const model = displacementIndex > 0 ? tokens.slice(0, displacementIndex).join(' ') : (tokens[0] ?? trimmed);
  return { model, version: trimmed };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/fipe.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/fipe.ts lib/fipe.test.ts
git commit -m "feat: add FIPE client module with price/fuel/model parsing"
```

---

### Task 4: FIPE serverless proxy (`api/fipe/[...path].ts`)

**Files:**
- Create: `api/fipe/[...path].ts`

**Interfaces:**
- Consumes: `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY` (already configured on Vercel — same vars `api/team/invite.ts` uses), `process.env.FIPE_API_TOKEN` (new, optional).
- Produces: the `GET /api/fipe/*` endpoint consumed by `lib/fipe.ts`'s `fipeGet()` (Task 3).

- [ ] **Step 1: Write the proxy handler**

Create `api/fipe/[...path].ts`:

```ts
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
  const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
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
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/fipe/\[...path\].ts
git commit -m "feat: add serverless proxy for the FIPE API"
```

- [ ] **Step 4: Note for later manual verification**

This function only runs on Vercel (there is no local `vercel dev` setup in this project, matching `api/team/invite.ts`'s existing pattern). It will be exercised end-to-end once Task 7 is deployed in Task 8 — verify then with the browser flow and, optionally, `curl` against the deployed URL.

---

### Task 5: `FipeVehiclePicker` component

**Files:**
- Create: `components/FipeVehiclePicker.tsx`

**Interfaces:**
- Consumes: `fetchFipeBrands`, `fetchFipeModels`, `fetchFipeYears`, `fetchFipeDetail`, `parseFipePrice`, `mapFipeFuel`, `splitFipeModel`, `FipeOption` from `lib/fipe.ts` (Task 3); `Vehicle` from `types.ts`.
- Produces (consumed by Task 6 `EstoqueView.tsx`):
  - `export interface FipeFillResult { brand: string; model: string; version: string; modelYear: number; fuel: Vehicle['fuel']; fipePrice: number; fipeCode: string; fipeReferenceMonth: string }`
  - `export const FipeVehiclePicker: React.FC<{ mode: 'fipe' | 'manual'; onModeChange: (mode: 'fipe' | 'manual') => void; onFill: (result: FipeFillResult) => void }>`

- [ ] **Step 1: Write the component**

Create `components/FipeVehiclePicker.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Search, PenLine, Loader2 } from 'lucide-react';
import {
  fetchFipeBrands,
  fetchFipeModels,
  fetchFipeYears,
  fetchFipeDetail,
  parseFipePrice,
  mapFipeFuel,
  splitFipeModel,
  FipeOption,
} from '../lib/fipe';
import { Vehicle } from '../types';

export interface FipeFillResult {
  brand: string;
  model: string;
  version: string;
  modelYear: number;
  fuel: Vehicle['fuel'];
  fipePrice: number;
  fipeCode: string;
  fipeReferenceMonth: string;
}

interface FipeVehiclePickerProps {
  mode: 'fipe' | 'manual';
  onModeChange: (mode: 'fipe' | 'manual') => void;
  onFill: (result: FipeFillResult) => void;
}

export const FipeVehiclePicker: React.FC<FipeVehiclePickerProps> = ({ mode, onModeChange, onFill }) => {
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [brandCode, setBrandCode] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [yearCode, setYearCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchFipeBrands()
      .then((data) => {
        if (!cancelled) {
          setBrands(data);
          setStatus('idle');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar marcas da FIPE');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBrandChange = async (code: string) => {
    setBrandCode(code);
    setModelCode('');
    setYearCode('');
    setModels([]);
    setYears([]);
    if (!code) return;
    setStatus('loading');
    try {
      const data = await fetchFipeModels(code);
      setModels(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar modelos da FIPE');
    }
  };

  const handleModelChange = async (code: string) => {
    setModelCode(code);
    setYearCode('');
    setYears([]);
    if (!code) return;
    setStatus('loading');
    try {
      const data = await fetchFipeYears(brandCode, code);
      setYears(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar anos da FIPE');
    }
  };

  const handleYearChange = async (code: string) => {
    setYearCode(code);
    if (!code) return;
    setStatus('loading');
    try {
      const detail = await fetchFipeDetail(brandCode, modelCode, code);
      const { model, version } = splitFipeModel(detail.model);
      onFill({
        brand: brands.find((b) => b.code === brandCode)?.name ?? detail.brand,
        model,
        version,
        modelYear: detail.modelYear,
        fuel: mapFipeFuel(detail.fuel),
        fipePrice: parseFipePrice(detail.price),
        fipeCode: detail.codeFipe,
        fipeReferenceMonth: detail.referenceMonth,
      });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao consultar a FIPE');
    }
  };

  return (
    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Marca e Modelo
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange('fipe')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'fipe'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3 h-3" /> Buscar na FIPE
          </button>
          <button
            type="button"
            onClick={() => onModeChange('manual')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'manual'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenLine className="w-3 h-3" /> Preencher manualmente
          </button>
        </div>
      </div>

      {mode === 'fipe' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              id="fipe-brand-select"
              value={brandCode}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
            >
              <option value="">Marca...</option>
              {brands.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <select
              id="fipe-model-select"
              value={modelCode}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!brandCode}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Modelo...</option>
              {models.map((m) => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
            <select
              id="fipe-year-select"
              value={yearCode}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={!modelCode}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Ano...</option>
              {years.map((y) => (
                <option key={y.code} value={y.code}>{y.name}</option>
              ))}
            </select>
          </div>
          {status === 'loading' && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Consultando a FIPE...
            </p>
          )}
          {status === 'error' && (
            <p className="text-[11px] text-red-600">
              {errorMessage || 'Não foi possível consultar a FIPE agora.'} Tente novamente ou preencha manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FipeVehiclePicker.tsx
git commit -m "feat: add cascading FIPE brand/model/year picker component"
```

---

### Task 6: Wire the picker into `EstoqueView.tsx`

**Files:**
- Modify: `components/EstoqueView.tsx`

**Interfaces:**
- Consumes: `FipeVehiclePicker`, `FipeFillResult` from `components/FipeVehiclePicker.tsx` (Task 5); `Vehicle.fipeCode`/`Vehicle.fipeReferenceMonth` from `types.ts` (Task 2).
- Produces: nothing consumed by later tasks — this is the final integration point.

- [ ] **Step 1: Import the picker**

In `components/EstoqueView.tsx`, find:

```ts
import { Vehicle } from '../types';
```

Replace with:

```ts
import { Vehicle } from '../types';
import { FipeVehiclePicker, FipeFillResult } from './FipeVehiclePicker';
```

- [ ] **Step 2: Add form state for the fill mode and FIPE tracking fields**

Find:

```ts
  const [featuresText, setFeaturesText] = useState('Bancos em couro, Câmera de ré, Sensor de estacionamento, Multimídia');
```

Replace with:

```ts
  const [featuresText, setFeaturesText] = useState('Bancos em couro, Câmera de ré, Sensor de estacionamento, Multimídia');
  const [fillMode, setFillMode] = useState<'fipe' | 'manual'>('fipe');
  const [fipeCode, setFipeCode] = useState('');
  const [fipeReferenceMonth, setFipeReferenceMonth] = useState('');
```

- [ ] **Step 3: Add the fill handler**

Find:

```ts
  const handleOpenAdd = () => {
```

Insert immediately before it:

```ts
  const handleFipeFill = (result: FipeFillResult) => {
    setBrand(result.brand);
    setModel(result.model);
    setVersion(result.version);
    setYear(result.modelYear);
    setModelYear(result.modelYear);
    setFuel(result.fuel);
    setFipePrice(result.fipePrice);
    setFipeCode(result.fipeCode);
    setFipeReferenceMonth(result.fipeReferenceMonth);
  };

```

- [ ] **Step 4: Reset FIPE state when opening "Add"**

Find (inside `handleOpenAdd`):

```ts
    setFeaturesText('Ar condicionado digital, Direção elétrica, Central multimídia com Apple CarPlay, Câmera de ré, Rodas de liga leve');
    setIsModalOpen(true);
  };
```

Replace with:

```ts
    setFeaturesText('Ar condicionado digital, Direção elétrica, Central multimídia com Apple CarPlay, Câmera de ré, Rodas de liga leve');
    setFillMode('fipe');
    setFipeCode('');
    setFipeReferenceMonth('');
    setIsModalOpen(true);
  };
```

- [ ] **Step 5: Load FIPE tracking state when opening "Edit"**

Find (inside `handleOpenEdit`):

```ts
    setFeaturesText(v.features.join(', '));
    setIsModalOpen(true);
  };
```

Replace with:

```ts
    setFeaturesText(v.features.join(', '));
    setFillMode('manual');
    setFipeCode(v.fipeCode ?? '');
    setFipeReferenceMonth(v.fipeReferenceMonth ?? '');
    setIsModalOpen(true);
  };
```

- [ ] **Step 6: Persist the FIPE tracking fields on submit**

Find (inside `handleSubmit`'s `vehicleData` object):

```ts
      fipePrice: Number(fipePrice) || Number(price),
      fuel,
```

Replace with:

```ts
      fipePrice: Number(fipePrice) || Number(price),
      fipeCode: fipeCode || undefined,
      fipeReferenceMonth: fipeReferenceMonth || undefined,
      fuel,
```

- [ ] **Step 7: Replace the free-text Marca/Modelo block with the picker**

Find:

```tsx
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Marca do Veículo *
                  </label>
                  <input
                    id="car-brand-input"
                    type="text"
                    required
                    placeholder="Ex: Toyota, Honda, Jeep..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Modelo *
                  </label>
                  <input
                    id="car-model-input"
                    type="text"
                    required
                    placeholder="Ex: Corolla, Compass, Nivus..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
```

Replace with:

```tsx
              {editingVehicle && fipeCode && fillMode === 'manual' && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Sincronizado com a FIPE (código {fipeCode}, referência {fipeReferenceMonth})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFillMode('fipe')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Atualizar da FIPE
                  </button>
                </div>
              )}

              <FipeVehiclePicker mode={fillMode} onModeChange={setFillMode} onFill={handleFipeFill} />

              {fillMode === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Marca do Veículo *
                    </label>
                    <input
                      id="car-brand-input"
                      type="text"
                      required
                      placeholder="Ex: Toyota, Honda, Jeep..."
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Modelo *
                    </label>
                    <input
                      id="car-model-input"
                      type="text"
                      required
                      placeholder="Ex: Corolla, Compass, Nivus..."
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              )}
```

- [ ] **Step 8: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open Estoque, click "Cadastrar Veículo":
1. Confirm the Marca/Modelo/Ano selects appear (FIPE mode by default) and cascade correctly (Marca → Modelo enabled → Ano enabled).
2. Pick a brand, model, and year; confirm Marca, Versão, Ano Fab., Ano Mod., Combustível and Preço Tabela FIPE all populate, and Preço de Venda stays whatever it was (never auto-filled).
3. Click "Preencher manualmente"; confirm the picker's selects hide and the old free-text Marca/Modelo inputs appear, empty/editable.
4. Save a vehicle created via FIPE, then reopen it for editing; confirm the "Sincronizado com a FIPE" badge appears with the right code/reference, and "Atualizar da FIPE" switches back to the cascading selects.
5. Save a vehicle created manually; confirm no FIPE badge appears when editing it.

- [ ] **Step 10: Commit**

```bash
git add components/EstoqueView.tsx
git commit -m "feat: wire FIPE cascading picker into the vehicle registration form"
```

---

### Task 7: Deploy and verify in production

**Files:** none (deployment step).

**Interfaces:** none.

- [ ] **Step 1: Full local verification**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

Run: `npx vitest run`
Expected: all tests pass (existing `lib/permissions.test.ts` plus the new `lib/fipe.test.ts`).

- [ ] **Step 2: Confirm required environment variables are set on Vercel**

In the Vercel project settings, confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set for Production (they must already exist for `/api/team/invite` to work). `FIPE_API_TOKEN` is optional — skip it for now (works unauthenticated at 500 requests/day); it can be added later from https://fipe.api.br/register without any code change.

- [ ] **Step 3: Push to `main`**

Ask the user to confirm before pushing (this deploys to production via Vercel's Git integration). Then:

```bash
git push origin main
```

- [ ] **Step 4: Verify the deployment**

Once Vercel finishes building (check the Vercel dashboard or wait for the deployment to go live), open the production URL and repeat the manual verification from Task 6 Step 9 against the live site, plus:
- Confirm the Hot Site (both preview and full-page tab) no longer shows a plate badge for any vehicle.
- Confirm a fresh FIPE lookup works end-to-end against the real deployed `/api/fipe/...` endpoint (not just local dev).
