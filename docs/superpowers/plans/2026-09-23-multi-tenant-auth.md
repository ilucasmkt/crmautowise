# Multi-tenant Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Auto Wise from a single-browser, localStorage-only app into a multi-tenant SaaS with real login, per-dealership data isolation, and role-based permissions.

**Architecture:** Supabase (Postgres + Auth) as the backend, with Row Level Security enforcing tenant isolation and per-role data access. A Vercel serverless function (`/api/team/invite`) handles the one privileged operation (creating a team member's login) that needs the service role key. A local-only script (`create-store`) provisions new dealership accounts.

**Tech Stack:** React 19 + Vite (existing), `@supabase/supabase-js`, `@vercel/node` (serverless function types), `vitest` (unit tests for pure permission logic), `tsx` + `dotenv` (local script).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-multi-tenant-auth-design.md` — read it before starting; every task below implements one part of it.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` live in `.env.local` (client-safe, already populated).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` live in `.env` (server/script-only, already populated, gitignored).
- View components (`DashboardView`, `EstoqueView`, `LeadsView`, `KanbanView`, `HotSiteView`, `EquipeView`, `AjustesView`) are presentational — they only read props and call handler props. All data-fetching lives in `App.tsx` and the `hooks/` it uses. Do not add Supabase calls inside view components.
- `leads.assigned_to` is the team member's **name** (text), not an id — see spec's "leads" table note. Do not change `LeadsView.tsx` or `KanbanView.tsx`'s assignment UI.
- Existing code style: no test framework was previously configured; this plan introduces `vitest` only for pure logic in `lib/permissions.ts`. Everything that touches Supabase or the UI is verified manually via `npm run dev`, matching how the rest of this codebase has always been verified (there is no existing UI test setup to follow).

---

### Task 1: Dependencies and scripts — ✅ already done

`@supabase/supabase-js`, `@vercel/node`, `dotenv`, `tsx`, `vitest` are installed; `package.json` has `test` and `create-store` scripts. Commit `d1310ac`. No action needed — listed here only so the task numbering matches the rest of the plan.

---

### Task 2: Supabase client and env typings

**Files:**
- Create: `vite-env.d.ts`
- Create: `lib/supabaseClient.ts`

**Interfaces:**
- Produces: `supabase` (exported `SupabaseClient` instance from `lib/supabaseClient.ts`) — every later hook and component imports this.

- [ ] **Step 1: Create the Vite env typings**

Create `vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Create the Supabase client**

Create `lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run lint`
Expected: no errors (exit code 0).

Run: `npm run build`
Expected: build succeeds (this only checks the file compiles — nothing imports `supabaseClient.ts` yet).

- [ ] **Step 4: Commit**

```bash
git add vite-env.d.ts lib/supabaseClient.ts
git commit -m "Add Supabase client and Vite env typings"
```

---

### Task 3: Database schema and Row Level Security

**Files:**
- Create: `supabase/migrations/0001_init.sql`

This task's "test" is running the SQL against the real Supabase project and checking it applies cleanly — there is no local Postgres in this project, so this is a manual step run in the Supabase Dashboard, not an automated one.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_init.sql`:

```sql
create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table stores (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  legal_name text,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  logo_url text,
  meta_pixel_id text,
  meta_access_token text,
  google_tag_manager_id text,
  enable_pixel_events boolean not null default false,
  working_hours jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('Administrador','Gerente de Vendas','Consultor de Vendas','Atendimento / BDC')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  sales_count integer not null default 0,
  leads_active integer not null default 0,
  target_sales integer not null default 0,
  avatar_color text,
  joined_date date not null default now(),
  whatsapp_status text,
  whatsapp_connected_number text,
  whatsapp_session_id text,
  whatsapp_battery integer,
  whatsapp_connected_at timestamptz
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  brand text,
  model text,
  version text,
  year int,
  model_year int,
  mileage int,
  price numeric,
  fipe_price numeric,
  fuel text,
  transmission text,
  color text,
  plate text,
  status text not null default 'disponivel' check (status in ('disponivel','reservado','vendido')),
  image_url text,
  images text[] not null default '{}',
  features text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  interested_vehicle text,
  vehicle_price numeric,
  source text,
  stage text not null default 'novo',
  temperature text,
  assigned_to text,
  notes text,
  created_at timestamptz not null default now(),
  last_contact_at timestamptz,
  value numeric,
  date_iso timestamptz
);

create index on profiles (store_id);
create index on vehicles (store_id);
create index on leads (store_id);

-- ---------- Helpers ----------
-- SECURITY DEFINER so these can read `profiles` from inside a policy on
-- `profiles` itself without recursing into that policy.

create or replace function auth_store_id() returns uuid
language sql security definer stable as $$
  select store_id from profiles where id = auth.uid();
$$;

create or replace function auth_role() returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_name() returns text
language sql security definer stable as $$
  select name from profiles where id = auth.uid();
$$;

-- ---------- Row Level Security ----------

alter table stores enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table leads enable row level security;

-- stores: any authenticated member reads their own store; only
-- Administrador updates it (Ajustes screen); nobody else writes to it
-- from the client (create-store uses the service role key, which
-- bypasses RLS).
create policy stores_select on stores for select
  using (id = auth_store_id());

create policy stores_update_admin on stores for update
  using (id = auth_store_id() and auth_role() = 'Administrador')
  with check (id = auth_store_id() and auth_role() = 'Administrador');

-- profiles: everyone in a store can see their colleagues (needed for
-- the "Atendente Responsável" dropdown and Kanban avatars); a user can
-- update their own row; Administrador/Gerente can insert/update any
-- profile in their store; only Administrador can delete one.
create policy profiles_select on profiles for select
  using (store_id = auth_store_id());

create policy profiles_update_self on profiles for update
  using (id = auth.uid());

create policy profiles_insert_admin on profiles for insert
  with check (store_id = auth_store_id() and auth_role() in ('Administrador','Gerente de Vendas'));

create policy profiles_update_admin on profiles for update
  using (store_id = auth_store_id() and auth_role() in ('Administrador','Gerente de Vendas'));

create policy profiles_delete_admin on profiles for delete
  using (store_id = auth_store_id() and auth_role() = 'Administrador');

-- vehicles: every role in the store has full CRUD (per the permission
-- matrix, Estoque is open to everyone).
create policy vehicles_all on vehicles for all
  using (store_id = auth_store_id())
  with check (store_id = auth_store_id());

-- leads: Administrador, Gerente de Vendas and Atendimento/BDC see and
-- edit every lead in the store; Consultor de Vendas only leads
-- assigned to them by name.
create policy leads_select on leads for select
  using (
    store_id = auth_store_id()
    and (auth_role() <> 'Consultor de Vendas' or assigned_to = auth_name())
  );

create policy leads_insert on leads for insert
  with check (store_id = auth_store_id());

create policy leads_update on leads for update
  using (
    store_id = auth_store_id()
    and (auth_role() <> 'Consultor de Vendas' or assigned_to = auth_name())
  );

create policy leads_delete on leads for delete
  using (
    store_id = auth_store_id()
    and auth_role() in ('Administrador','Gerente de Vendas','Atendimento / BDC')
  );
```

- [ ] **Step 2: Apply it to Supabase**

This is a manual step (there's no CLI/connection-string access to the project's Postgres instance from this environment):

1. Open the Supabase Dashboard → SQL Editor.
2. Paste the full contents of `supabase/migrations/0001_init.sql`.
3. Click **Run**.

Expected: "Success. No rows returned." If it errors, read the message — the most likely cause is running it twice (tables already exist); drop the 4 tables and re-run if you need a clean slate while testing.

- [ ] **Step 3: Verify the tables and RLS exist**

In the Supabase Dashboard → Table Editor, confirm `stores`, `profiles`, `vehicles`, `leads` all appear, each with a shield icon indicating RLS is enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "Add multi-tenant schema and RLS policies"
```

---

### Task 4: Permission rules (TDD)

**Files:**
- Create: `lib/permissions.ts`
- Create: `lib/permissions.test.ts`

**Interfaces:**
- Consumes: `NavSection` from `types.ts` (already exists: `'inicio' | 'estoque' | 'leads' | 'crm' | 'hotsite' | 'equipe' | 'ajustes'`), `TeamMember['role']` from `types.ts`.
- Produces: `Role` type alias, `canAccessSection(role, section): boolean`, `getVisibleSections(role): NavSection[]`, `canEditStoreSettings(role): boolean`, `canDeleteTeamMember(role): boolean` — consumed by Task 6 (Sidebar) and Task 13 (App.tsx).

- [ ] **Step 1: Write the failing tests**

Create `lib/permissions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  canAccessSection,
  getVisibleSections,
  canEditStoreSettings,
  canDeleteTeamMember,
} from './permissions';

describe('canAccessSection', () => {
  it('allows Consultor de Vendas into leads but not equipe', () => {
    expect(canAccessSection('Consultor de Vendas', 'leads')).toBe(true);
    expect(canAccessSection('Consultor de Vendas', 'equipe')).toBe(false);
  });

  it('allows Administrador everywhere', () => {
    expect(canAccessSection('Administrador', 'ajustes')).toBe(true);
    expect(canAccessSection('Administrador', 'equipe')).toBe(true);
  });

  it('blocks Atendimento / BDC from ajustes and equipe', () => {
    expect(canAccessSection('Atendimento / BDC', 'ajustes')).toBe(false);
    expect(canAccessSection('Atendimento / BDC', 'equipe')).toBe(false);
  });

  it('allows Gerente de Vendas into equipe and ajustes', () => {
    expect(canAccessSection('Gerente de Vendas', 'equipe')).toBe(true);
    expect(canAccessSection('Gerente de Vendas', 'ajustes')).toBe(true);
  });
});

describe('getVisibleSections', () => {
  it('excludes equipe and ajustes for Consultor de Vendas', () => {
    const sections = getVisibleSections('Consultor de Vendas');
    expect(sections).not.toContain('equipe');
    expect(sections).not.toContain('ajustes');
    expect(sections).toContain('inicio');
    expect(sections).toContain('estoque');
    expect(sections).toContain('leads');
    expect(sections).toContain('crm');
    expect(sections).toContain('hotsite');
  });

  it('includes every section for Administrador', () => {
    expect(getVisibleSections('Administrador')).toHaveLength(7);
  });
});

describe('canEditStoreSettings', () => {
  it('only Administrador can edit', () => {
    expect(canEditStoreSettings('Administrador')).toBe(true);
    expect(canEditStoreSettings('Gerente de Vendas')).toBe(false);
    expect(canEditStoreSettings('Consultor de Vendas')).toBe(false);
  });
});

describe('canDeleteTeamMember', () => {
  it('only Administrador can delete', () => {
    expect(canDeleteTeamMember('Administrador')).toBe(true);
    expect(canDeleteTeamMember('Gerente de Vendas')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/permissions.test.ts`
Expected: FAIL — `Cannot find module './permissions'` (the file doesn't exist yet).

- [ ] **Step 3: Implement**

Create `lib/permissions.ts`:

```ts
import { NavSection, TeamMember } from '../types';

export type Role = TeamMember['role'];

const SECTION_ACCESS: Record<NavSection, Role[]> = {
  inicio: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  estoque: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  leads: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  crm: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  hotsite: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  equipe: ['Administrador', 'Gerente de Vendas'],
  ajustes: ['Administrador', 'Gerente de Vendas'],
};

export function canAccessSection(role: Role, section: NavSection): boolean {
  return SECTION_ACCESS[section].includes(role);
}

export function getVisibleSections(role: Role): NavSection[] {
  return (Object.keys(SECTION_ACCESS) as NavSection[]).filter((section) =>
    canAccessSection(role, section)
  );
}

export function canEditStoreSettings(role: Role): boolean {
  return role === 'Administrador';
}

export function canDeleteTeamMember(role: Role): boolean {
  return role === 'Administrador';
}
```

Note: `lib/permissions.ts` imports from `../types` because `lib/` sits one level below the project root, same as `hooks/` and `contexts/` created in later tasks.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/permissions.test.ts`
Expected: PASS — 1 test file, 4 suites, 8 tests, all green.

- [ ] **Step 5: Commit**

```bash
git add lib/permissions.ts lib/permissions.test.ts
git commit -m "Add role-based permission rules"
```

---

### Task 5: Auth context and login screen

**Files:**
- Create: `contexts/AuthContext.tsx`
- Create: `components/LoginView.tsx`

**Interfaces:**
- Consumes: `supabase` from `lib/supabaseClient.ts` (Task 2).
- Produces: `AuthProvider` (React component), `useAuth(): { session, profile, loading, signOut }`, `Profile` type `{ id: string; storeId: string; name: string; email: string; role: 'Administrador' | 'Gerente de Vendas' | 'Consultor de Vendas' | 'Atendimento / BDC' }` — consumed by Task 6 (Sidebar via role) and Task 13 (`App.tsx`).

- [ ] **Step 1: Create the auth context**

Create `contexts/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface Profile {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Gerente de Vendas' | 'Consultor de Vendas' | 'Atendimento / BDC';
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, store_id, name, email, role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    storeId: data.store_id,
    name: data.name,
    email: data.email,
    role: data.role,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setProfile(await loadProfile(data.session.user.id));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setProfile(await loadProfile(newSession.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Create the login screen**

Create `components/LoginView.tsx`:

```tsx
import React, { useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError('E-mail ou senha inválidos.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-lg p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
            <Car className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl text-slate-900">Auto Wise</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="voce@loja.com.br"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="********"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run lint`
Expected: no errors. (Nothing renders these yet — that's Task 13 — this just confirms both files compile.)

- [ ] **Step 4: Commit**

```bash
git add contexts/AuthContext.tsx components/LoginView.tsx
git commit -m "Add auth context and login screen"
```

---

### Task 6: Sidebar — role-based nav, real user, sign out

**Files:**
- Modify: `components/Sidebar.tsx`

**Interfaces:**
- Consumes: `getVisibleSections(role)` from `lib/permissions.ts` (Task 4).
- Produces: `SidebarProps` gains `role: TeamMember['role']`, `userName: string`, `onSignOut: () => void` — consumed by Task 13 (`App.tsx`).

- [ ] **Step 1: Add the new props and imports**

In `components/Sidebar.tsx`, replace:

```tsx
import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Kanban, 
  UserCheck, 
  Settings, 
  ChevronRight,
  Flame,
  Store,
  Sparkles,
  ExternalLink,
  Globe
} from 'lucide-react';
import { NavSection } from '../types';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  leadsCount: number;
  stockCount: number;
  teamCount: number;
  storeName: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  leadsCount,
  stockCount,
  teamCount,
  storeName,
  isMobileOpen,
  onCloseMobile,
}) => {
```

with:

```tsx
import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Kanban, 
  UserCheck, 
  Settings, 
  ChevronRight,
  Flame,
  Store,
  Sparkles,
  ExternalLink,
  Globe,
  LogOut
} from 'lucide-react';
import { NavSection, TeamMember } from '../types';
import { getVisibleSections } from '../lib/permissions';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  leadsCount: number;
  stockCount: number;
  teamCount: number;
  storeName: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  role: TeamMember['role'];
  userName: string;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  leadsCount,
  stockCount,
  teamCount,
  storeName,
  isMobileOpen,
  onCloseMobile,
  role,
  userName,
  onSignOut,
}) => {
```

- [ ] **Step 2: Filter nav items by role**

Replace:

```tsx
  return (
    <>
      {/* Backdrop for mobile */}
```

with:

```tsx
  const visibleSections = getVisibleSections(role);
  const visibleNavItems = navItems.filter((item) => visibleSections.includes(item.id));

  return (
    <>
      {/* Backdrop for mobile */}
```

Then replace the nav rendering (`{navItems.map((item) => {`) with `{visibleNavItems.map((item) => {`:

Find:
```tsx
          {navItems.map((item) => {
```

Replace with:
```tsx
          {visibleNavItems.map((item) => {
```

- [ ] **Step 3: Replace the hardcoded footer with the real user and a sign-out button**

Replace:

```tsx
        {/* User Account & Store Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              LM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Lucas Martins</p>
              <p className="text-[11px] text-slate-400 truncate">Gerente / Admin</p>
            </div>
            <button 
              id="user-settings-shortcut"
              onClick={() => {
                onSelectSection('ajustes');
                onCloseMobile();
              }}
              title="Ajustes da conta"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
```

with:

```tsx
        {/* User Account & Store Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{role}</p>
            </div>
            {visibleSections.includes('ajustes') && (
              <button 
                id="user-settings-shortcut"
                onClick={() => {
                  onSelectSection('ajustes');
                  onCloseMobile();
                }}
                title="Ajustes da conta"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              id="sign-out-btn"
              onClick={onSignOut}
              title="Sair"
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run lint`
Expected: errors about `Sidebar`'s new required props being missing at its call site in `App.tsx` — that's expected until Task 13 rewires `App.tsx`. Confirm the *only* errors are about the `<Sidebar ... />` call site in `App.tsx` (e.g. "Property 'role' is missing"), not about `Sidebar.tsx` itself.

- [ ] **Step 5: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "Add role-based nav filtering and sign out to Sidebar"
```

---

### Task 7: Vehicles data hook

**Files:**
- Create: `hooks/useVehicles.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Vehicle` type from `types.ts`.
- Produces: `useVehicles(storeId: string): { vehicles: Vehicle[]; loading: boolean; addVehicle(v): Promise<void>; updateVehicle(v): Promise<void>; deleteVehicle(id): Promise<void> }` — consumed by Task 13 (`App.tsx`).

- [ ] **Step 1: Create the hook**

Create `hooks/useVehicles.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Vehicle } from '../types';

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  model_year: number;
  mileage: number;
  price: number;
  fipe_price: number | null;
  fuel: Vehicle['fuel'];
  transmission: Vehicle['transmission'];
  color: string;
  plate: string;
  status: Vehicle['status'];
  image_url: string;
  images: string[] | null;
  features: string[] | null;
  created_at: string;
}

function fromRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    version: row.version,
    year: row.year,
    modelYear: row.model_year,
    mileage: row.mileage,
    price: row.price,
    fipePrice: row.fipe_price ?? undefined,
    fuel: row.fuel,
    transmission: row.transmission,
    color: row.color,
    plate: row.plate,
    status: row.status,
    imageUrl: row.image_url,
    images: row.images ?? undefined,
    features: row.features ?? [],
    createdAt: row.created_at,
  };
}

export function useVehicles(storeId: string) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setVehicles((data as VehicleRow[]).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addVehicle = useCallback(
    async (newVehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          store_id: storeId,
          brand: newVehicle.brand,
          model: newVehicle.model,
          version: newVehicle.version,
          year: newVehicle.year,
          model_year: newVehicle.modelYear,
          mileage: newVehicle.mileage,
          price: newVehicle.price,
          fipe_price: newVehicle.fipePrice ?? null,
          fuel: newVehicle.fuel,
          transmission: newVehicle.transmission,
          color: newVehicle.color,
          plate: newVehicle.plate,
          status: newVehicle.status,
          image_url: newVehicle.imageUrl,
          images: newVehicle.images ?? [],
          features: newVehicle.features,
        })
        .select()
        .single();
      if (!error && data) setVehicles((prev) => [fromRow(data as VehicleRow), ...prev]);
    },
    [storeId]
  );

  const updateVehicle = useCallback(async (updated: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        brand: updated.brand,
        model: updated.model,
        version: updated.version,
        year: updated.year,
        model_year: updated.modelYear,
        mileage: updated.mileage,
        price: updated.price,
        fipe_price: updated.fipePrice ?? null,
        fuel: updated.fuel,
        transmission: updated.transmission,
        color: updated.color,
        plate: updated.plate,
        status: updated.status,
        image_url: updated.imageUrl,
        images: updated.images ?? [],
        features: updated.features,
      })
      .eq('id', updated.id);
    if (!error) setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { vehicles, loading, addVehicle, updateVehicle, deleteVehicle };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: no new errors from this file (the pre-existing `Sidebar`-related errors from Task 6 are still expected until Task 13).

- [ ] **Step 3: Commit**

```bash
git add hooks/useVehicles.ts
git commit -m "Add Supabase-backed vehicles hook"
```

---

### Task 8: Store settings hook + Ajustes read-only mode

**Files:**
- Create: `hooks/useStoreSettings.ts`
- Modify: `components/AjustesView.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `StoreSettings` type from `types.ts`.
- Produces: `useStoreSettings(storeId): { settings: StoreSettings | null; loading: boolean; saveSettings(s): Promise<void> }`; `AjustesViewProps` gains `readOnly?: boolean` — both consumed by Task 13.

- [ ] **Step 1: Create the hook**

Create `hooks/useStoreSettings.ts`:

```ts
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
```

- [ ] **Step 2: Add a read-only mode to AjustesView**

In `components/AjustesView.tsx`, find:

```tsx
interface AjustesViewProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  settings,
  onSaveSettings,
}) => {
```

Replace with:

```tsx
interface AjustesViewProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  readOnly?: boolean;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  settings,
  onSaveSettings,
  readOnly = false,
}) => {
```

Then find the form tag:

```tsx
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
```

Replace it with:

```tsx
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
        <fieldset disabled={readOnly} className="contents">
```

And find the matching closing tag near the end of the same form (search for the lone `</form>` — there is only one in this file):

```tsx
        </form>
```

Replace it with:

```tsx
        </fieldset>
        </form>
```

This uses a native HTML `<fieldset disabled>` to disable every input/button inside the form in one place, instead of touching each of the many individual fields in this 700+ line file. `className="contents"` keeps the fieldset from affecting the existing `space-y-6` layout (fieldset renders as `display: contents`, so its children lay out as if they were direct children of the form).

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run lint`
Expected: no new errors from `AjustesView.tsx` or `useStoreSettings.ts`.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add hooks/useStoreSettings.ts components/AjustesView.tsx
git commit -m "Add store settings hook and read-only mode for Ajustes"
```

---

### Task 9: Team hook + Equipe invite flow

**Files:**
- Create: `hooks/useTeam.ts`
- Modify: `components/EquipeView.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `TeamMember` type from `types.ts`. Calls `POST /api/team/invite` (built in Task 11 — this task can be completed and committed independently; the endpoint just won't exist until Task 11 runs, so end-to-end "add member" only works after both are done).
- Produces: `useTeam(storeId): { team: TeamMember[]; loading: boolean; addMember(m): Promise<void>; updateMember(m): Promise<void>; deleteMember(id): Promise<void> }`; `EquipeViewProps.onAddMember` signature changes from `(member, password?) => void` to `(member) => void`; `EquipeViewProps` gains `canDelete: boolean` — both consumed by Task 13.

- [ ] **Step 1: Create the hook**

Create `hooks/useTeam.ts`:

```ts
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
```

- [ ] **Step 2: Drop the password field from EquipeView's props and imports**

In `components/EquipeView.tsx`, find:

```tsx
import { 
  UserCheck, 
  Plus, 
  Search, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Key, 
  Eye, 
  EyeOff, 
  Award, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle, 
  UserPlus, 
  Lock,
  Sparkles,
  QrCode,
  Wifi,
  WifiOff,
  Smartphone,
  Battery,
  RefreshCw,
  Send,
  CheckCircle2,
  Zap,
  Globe,
  MessageSquare
} from 'lucide-react';
import { TeamMember } from '../types';

interface EquipeViewProps {
  team: TeamMember[];
  onAddMember: (member: Omit<TeamMember, 'id' | 'joinedDate'>, password?: string) => void;
  onUpdateMember: (member: TeamMember) => void;
  onDeleteMember: (id: string) => void;
}

export const EquipeView: React.FC<EquipeViewProps> = ({
  team,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
```

Replace with:

```tsx
import { 
  UserCheck, 
  Plus, 
  Search, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Key, 
  Award, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle, 
  UserPlus, 
  Lock,
  Sparkles,
  QrCode,
  Wifi,
  WifiOff,
  Smartphone,
  Battery,
  RefreshCw,
  Send,
  CheckCircle2,
  Zap,
  Globe,
  MessageSquare
} from 'lucide-react';
import { TeamMember } from '../types';

interface EquipeViewProps {
  team: TeamMember[];
  onAddMember: (member: Omit<TeamMember, 'id' | 'joinedDate'>) => void;
  onUpdateMember: (member: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  canDelete: boolean;
}

export const EquipeView: React.FC<EquipeViewProps> = ({
  team,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  canDelete,
}) => {
```

Find:

```tsx
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
```

Delete both lines.

Find, inside `handleOpenAdd`:

```tsx
    setTargetSales(10);
    setPassword('Mudar@123');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: TeamMember) => {
```

Replace with:

```tsx
    setTargetSales(10);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: TeamMember) => {
```

Find, inside `handleOpenEdit`:

```tsx
    setTargetSales(m.targetSales);
    setPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };
```

Replace with:

```tsx
    setTargetSales(m.targetSales);
    setIsModalOpen(true);
  };
```

- [ ] **Step 3: Replace the password form section with an invite notice**

Find:

```tsx
              {/* Password configuration */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-600" />
                    {editingMember ? 'Redefinir Senha (opcional)' : 'Senha Própria de Acesso *'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 lowercase"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </label>

                <input
                  id="user-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required={!editingMember}
                  placeholder={editingMember ? 'Deixe em branco para manter atual' : 'Defina a senha do colaborador'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  O colaborador poderá trocar esta senha no primeiro login
                </span>
              </div>
```

Replace with:

```tsx
              {!editingMember && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-600" />
                    Acesso ao Sistema
                  </label>
                  <span className="text-[11px] text-slate-500 block">
                    Um e-mail de convite será enviado para {email || 'o colaborador'} definir a própria senha de acesso.
                  </span>
                </div>
              )}
```

- [ ] **Step 4: Drop the password argument from the submit handler**

Find:

```tsx
      onAddMember({
        name: name.trim() || 'Novo Colaborador',
        email: email.trim() || 'usuario@autocrm.com.br',
        phone: phone.trim(),
        role,
        status,
        salesCount: 0,
        leadsActive: 0,
        targetSales: Number(targetSales) || 10,
        avatarColor: randomColor,
        whatsappStatus: 'desconectado',
      }, password);
```

Replace with:

```tsx
      onAddMember({
        name: name.trim() || 'Novo Colaborador',
        email: email.trim() || 'usuario@autocrm.com.br',
        phone: phone.trim(),
        role,
        status,
        salesCount: 0,
        leadsActive: 0,
        targetSales: Number(targetSales) || 10,
        avatarColor: randomColor,
        whatsappStatus: 'desconectado',
      });
```

- [ ] **Step 5: Hide the delete button when `canDelete` is false**

Find:

```tsx
                  <button
                    onClick={() => {
                      if (confirm(`Remover o usuário ${member.name}?`)) onDeleteMember(member.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
```

Replace with:

```tsx
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm(`Remover o usuário ${member.name}?`)) onDeleteMember(member.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run lint`
Expected: no errors referencing `Eye`, `EyeOff`, `password`, or `showPassword` in `EquipeView.tsx`. Errors about `App.tsx`'s `<EquipeView>` call site missing `canDelete` are expected until Task 13.

- [ ] **Step 7: Commit**

```bash
git add hooks/useTeam.ts components/EquipeView.tsx
git commit -m "Add team hook and switch member creation to email invites"
```

---

### Task 10: Leads data hook

**Files:**
- Create: `hooks/useLeads.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Lead`, `LeadStage` types from `types.ts`.
- Produces: `useLeads(storeId): { leads: Lead[]; loading: boolean; addLead(l): Promise<void>; updateLead(l): Promise<void>; deleteLead(id): Promise<void>; updateLeadStage(id, stage): Promise<void> }` — consumed by Task 13.

- [ ] **Step 1: Create the hook**

Create `hooks/useLeads.ts`:

```ts
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add hooks/useLeads.ts
git commit -m "Add Supabase-backed leads hook"
```

---

### Task 11: Team invite serverless function

**Files:**
- Create: `api/team/invite.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` server env vars (already in `.env` for local `vercel dev`, must also be added in Vercel project settings without the `VITE_` prefix).
- Produces: `POST /api/team/invite` endpoint consumed by `hooks/useTeam.ts` (Task 9).

- [ ] **Step 1: Create the function**

Create `api/team/invite.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VALID_ROLES = [
  'Administrador',
  'Gerente de Vendas',
  'Consultor de Vendas',
  'Atendimento / BDC',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const { name, email, phone, role } = req.body ?? {};
  if (!name || !email || !role || !VALID_ROLES.includes(role)) {
    res.status(400).json({ error: 'Dados inválidos: nome, email e cargo são obrigatórios' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sessão inválida' });
    return;
  }

  const { data: callerProfile, error: callerError } = await admin
    .from('profiles')
    .select('store_id, role')
    .eq('id', userData.user.id)
    .single();

  if (callerError || !callerProfile) {
    res.status(403).json({ error: 'Perfil não encontrado' });
    return;
  }

  if (!['Administrador', 'Gerente de Vendas'].includes(callerProfile.role)) {
    res.status(403).json({ error: 'Sem permissão para convidar novos usuários' });
    return;
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user) {
    res.status(500).json({ error: inviteError?.message ?? 'Erro ao enviar convite' });
    return;
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: invited.user.id,
    store_id: callerProfile.store_id,
    name,
    email,
    phone: phone ?? null,
    role,
    status: 'ativo',
    avatar_color: 'bg-brand-500',
  });

  if (profileError) {
    res.status(500).json({ error: profileError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: no errors. (`tsconfig.json`'s `"types": ["node"]` already gives access to `process.env`; `@vercel/node`'s types are picked up via the explicit import.)

- [ ] **Step 3: Commit**

```bash
git add api/team/invite.ts
git commit -m "Add team invite serverless function"
```

---

### Task 12: Store provisioning script

**Files:**
- Create: `scripts/create-store.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `.env` (via `dotenv/config`).
- Produces: `npm run create-store` — an interactive CLI, run locally only, never deployed.

- [ ] **Step 1: Create the script**

Create `scripts/create-store.ts`:

```ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import readline from 'node:readline/promises';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const storeName = await rl.question('Nome da loja: ');
  const adminName = await rl.question('Nome do administrador: ');
  const adminEmail = await rl.question('E-mail do administrador: ');
  const adminPassword = await rl.question('Senha inicial do administrador: ');

  rl.close();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({ store_name: storeName })
    .select()
    .single();

  if (storeError || !store) {
    console.error('Erro ao criar loja:', storeError?.message);
    process.exit(1);
  }

  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (userError || !user.user) {
    console.error('Erro ao criar usuário administrador:', userError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.user.id,
    store_id: store.id,
    name: adminName,
    email: adminEmail,
    role: 'Administrador',
    status: 'ativo',
    avatar_color: 'bg-brand-600',
  });

  if (profileError) {
    console.error('Erro ao criar perfil do administrador:', profileError.message);
    process.exit(1);
  }

  console.log(`\nLoja "${storeName}" criada com sucesso.`);
  console.log(`Login do administrador: ${adminEmail}`);
}

main();
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/create-store.ts
git commit -m "Add local store provisioning script"
```

---

### Task 13: Wire everything into App.tsx and index.tsx

**Files:**
- Modify: `index.tsx`
- Modify: `App.tsx` (full rewrite — every earlier task's pieces come together here)

**Interfaces:**
- Consumes: everything produced by Tasks 4–12.

- [ ] **Step 1: Wrap the app with AuthProvider**

Replace the full contents of `index.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Rewrite App.tsx**

Replace the full contents of `App.tsx`:

```tsx
import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Car, 
  Bell, 
  Search, 
  Plus, 
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { LeadsView } from './components/LeadsView';
import { KanbanView } from './components/KanbanView';
import { HotSiteView } from './components/HotSiteView';
import { EquipeView } from './components/EquipeView';
import { AjustesView } from './components/AjustesView';
import { LoginView } from './components/LoginView';
import { 
  NavSection, 
  Vehicle, 
  Lead, 
  TeamMember, 
  StoreSettings, 
  LeadStage 
} from './types';
import { useAuth } from './contexts/AuthContext';
import type { Profile } from './contexts/AuthContext';
import { canEditStoreSettings, canDeleteTeamMember } from './lib/permissions';
import { useVehicles } from './hooks/useVehicles';
import { useLeads } from './hooks/useLeads';
import { useTeam } from './hooks/useTeam';
import { useStoreSettings } from './hooks/useStoreSettings';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
    Carregando...
  </div>
);

const AuthenticatedApp: React.FC<{ profile: Profile }> = ({ profile }) => {
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { vehicles, loading: vehiclesLoading, addVehicle, updateVehicle, deleteVehicle } =
    useVehicles(profile.storeId);
  const { leads, loading: leadsLoading, addLead, updateLead, deleteLead, updateLeadStage } =
    useLeads(profile.storeId);
  const { team, loading: teamLoading, addMember, updateMember, deleteMember } =
    useTeam(profile.storeId);
  const { settings, loading: settingsLoading, saveSettings } = useStoreSettings(profile.storeId);

  if (vehiclesLoading || leadsLoading || teamLoading || settingsLoading || !settings) {
    return <LoadingScreen />;
  }

  const handleAddVehicle = (newVehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    addVehicle(newVehicle);
  };

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    updateVehicle(updatedVehicle);
  };

  const handleDeleteVehicle = (id: string) => {
    deleteVehicle(id);
  };

  const handleAddLead = (newLead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => {
    addLead(newLead);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    updateLead(updatedLead);
  };

  const handleDeleteLead = (id: string) => {
    deleteLead(id);
  };

  const handleUpdateLeadStage = (leadId: string, newStage: LeadStage) => {
    updateLeadStage(leadId, newStage);
  };

  const handleAddTeamMember = async (newMember: Omit<TeamMember, 'id' | 'joinedDate'>) => {
    try {
      await addMember(newMember);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao convidar usuário.');
    }
  };

  const handleUpdateTeamMember = (updatedMember: TeamMember) => {
    updateMember(updatedMember);
  };

  const handleDeleteTeamMember = (id: string) => {
    deleteMember(id);
  };

  const handleSaveSettings = (newSettings: StoreSettings) => {
    saveSettings(newSettings);
  };

  const sectionTitles: { [key in NavSection]: { title: string; subtitle: string } } = {
    inicio: {
      title: 'Início & Dashboard',
      subtitle: 'Visão geral da operação comercial, leads e faturamento',
    },
    estoque: {
      title: 'Estoque de Veículos',
      subtitle: 'Controle de carros disponíveis, valores e fichas técnicas',
    },
    leads: {
      title: 'Gestão de LEADS',
      subtitle: 'Lista detalhada de contatos recentes via Meta Ads e canais',
    },
    crm: {
      title: 'Pipeline CRM',
      subtitle: 'Funil de vendas e movimentação de etapas em Kanban',
    },
    hotsite: {
      title: 'Hot Site & Landing Pages',
      subtitle: 'Páginas individuais para anúncios de cada veículo com qualificação imediata',
    },
    equipe: {
      title: 'Equipe de Vendas',
      subtitle: 'Cadastro de colaboradores com login e senha próprios',
    },
    ajustes: {
      title: 'Ajustes da Loja',
      subtitle: 'Perfil cadastral, horário de funcionamento e Meta Pixel',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        leadsCount={leads.length}
        stockCount={vehicles.length}
        teamCount={team.length}
        storeName={settings.storeName}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        role={profile.role}
        userName={profile.name}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  {sectionTitles[activeSection].title}
                </h1>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  {settings.storeName}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500">
                {sectionTitles[activeSection].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Badge */}
            <div className="relative">
              <button 
                id="notifications-btn"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors relative"
                title="Notificações de novos leads"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </button>
            </div>

            {/* Quick Action Button based on section */}
            <button
              onClick={() => {
                if (activeSection === 'estoque') {
                  const addBtn = document.getElementById('add-vehicle-btn');
                  if (addBtn) addBtn.click();
                } else if (activeSection === 'equipe') {
                  const teamBtn = document.getElementById('add-team-member-btn');
                  if (teamBtn) teamBtn.click();
                } else {
                  setActiveSection('leads');
                  setTimeout(() => {
                    const leadBtn = document.getElementById('add-lead-btn');
                    if (leadBtn) leadBtn.click();
                  }, 50);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </header>

        {/* Dynamic Section View */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'inicio' && (
            <DashboardView
              leads={leads}
              vehicles={vehicles}
              team={team}
              onNavigate={(sec) => setActiveSection(sec)}
              onOpenNewLeadModal={() => {
                setActiveSection('leads');
                setTimeout(() => {
                  const btn = document.getElementById('add-lead-btn');
                  if (btn) btn.click();
                }, 50);
              }}
              onOpenNewCarModal={() => {
                setActiveSection('estoque');
                setTimeout(() => {
                  const btn = document.getElementById('add-vehicle-btn');
                  if (btn) btn.click();
                }, 50);
              }}
            />
          )}

          {activeSection === 'estoque' && (
            <EstoqueView
              vehicles={vehicles}
              onAddVehicle={handleAddVehicle}
              onUpdateVehicle={handleUpdateVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onOpenHotSite={(carId) => {
                setActiveSection('hotsite');
              }}
            />
          )}

          {activeSection === 'leads' && (
            <LeadsView
              leads={leads}
              vehicles={vehicles}
              team={team}
              onAddLead={handleAddLead}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
            />
          )}

          {activeSection === 'crm' && (
            <KanbanView
              leads={leads}
              team={team}
              onUpdateLeadStage={handleUpdateLeadStage}
              onOpenNewLeadModal={(stage) => {
                setActiveSection('leads');
                setTimeout(() => {
                  const btn = document.getElementById('add-lead-btn');
                  if (btn) btn.click();
                }, 50);
              }}
              onSelectLead={(lead) => {
                setActiveSection('leads');
              }}
            />
          )}

          {activeSection === 'hotsite' && (
            <HotSiteView
              vehicles={vehicles}
              settings={settings}
              onAddLead={handleAddLead}
              onNavigateToLeads={() => setActiveSection('leads')}
            />
          )}

          {activeSection === 'equipe' && (
            <EquipeView
              team={team}
              onAddMember={handleAddTeamMember}
              onUpdateMember={handleUpdateTeamMember}
              onDeleteMember={handleDeleteTeamMember}
              canDelete={canDeleteTeamMember(profile.role)}
            />
          )}

          {activeSection === 'ajustes' && (
            <AjustesView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              readOnly={!canEditStoreSettings(profile.role)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <LoginView />;
  }

  return <AuthenticatedApp profile={profile} />;
};

export default App;
```

Note why this is structured as two components: `AuthenticatedApp` calls `useState`/hooks unconditionally on every render, which is required by the Rules of Hooks. It only ever mounts once `profile` is non-null, so those hooks never run "conditionally" from React's perspective — mounting a different component isn't a hooks violation, but an early `return` *inside* a component that calls hooks both before and after the return would be.

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run lint`
Expected: no errors — this is the point where every prop mismatch introduced in Tasks 6, 8, 9 gets resolved.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the printed local URL in a browser.

Expected: the login screen renders (not the dashboard). This confirms the auth gate works even before Task 3's SQL has been run against Supabase and before Task 14's store exists — `useAuth()` will have `profile: null` because there's no session yet.

- [ ] **Step 5: Commit**

```bash
git add index.tsx App.tsx
git commit -m "Wire auth, permissions and Supabase hooks into App.tsx"
```

---

### Task 14: Remove dead mock data, provision the first store, end-to-end verification

**Files:**
- Delete: `data/mockData.ts`

- [ ] **Step 1: Delete the now-unused mock data**

`data/mockData.ts` was only ever imported by `App.tsx`, which no longer imports it after Task 13.

```bash
git rm data/mockData.ts
```

- [ ] **Step 2: Verify nothing else references it**

Run: `npm run lint` and `npm run build`
Expected: both succeed with no "cannot find module" errors.

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove unused mock data now that data comes from Supabase"
```

- [ ] **Step 4: Provision the AutoPrime Multimarcas store**

This requires Task 3's SQL to already be applied in Supabase. Run:

```bash
npm run create-store
```

Answer the prompts (store name, admin name, admin email, admin password). Expected output: `Loja "..." criada com sucesso.` with the admin's email echoed back.

- [ ] **Step 5: End-to-end manual verification**

Run: `npm run dev`, open the app.

1. Log in with the admin email/password from Step 4 → dashboard loads (empty: 0 leads, 0 vehicles).
2. Add a vehicle in Estoque → it appears and persists after a page refresh (confirms Supabase read/write, not localStorage).
3. Add a lead in Leads, assign it to the admin's own name → it appears in CRM/Kanban.
4. Go to Equipe → add a team member with role "Consultor de Vendas" using a real email you can check → confirm the invite email arrives (Supabase's default email provider can be slow/rate-limited; check Supabase Dashboard → Authentication → Users to confirm the user was created even if the email is delayed).
5. Set that new user's password via the invite email link, log in as them in a private/incognito window.
6. Confirm: Equipe and Ajustes are not in their sidebar; Leads/CRM only shows leads assigned to their name (none yet, since the lead from step 3 was assigned to the admin).
7. As the admin, edit the lead from step 3 and reassign it to the Consultor's name; refresh the Consultor's session → the lead now appears for them.
8. As the Consultor, confirm they cannot navigate to `/api/team/invite`-triggering UI (there is none in their sidebar) and that directly calling it would be rejected — this is covered by Task 11's role check, no manual API call needed unless you want to double-check with `curl`.

- [ ] **Step 6: Push and redeploy**

```bash
git push origin main
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project's Environment Variables (Settings → Environment Variables) if not already there, then redeploy from the Vercel dashboard. Repeat step 5's login check against the production URL.
