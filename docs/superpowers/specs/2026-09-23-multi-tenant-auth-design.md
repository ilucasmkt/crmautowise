# Multi-tenant auth for Auto Wise CRM

Date: 2026-09-23
Status: Approved by user, ready for implementation planning

## Context

Auto Wise is a Vite + React SPA. It currently has no backend: all data
(vehicles, leads, team, store settings) lives in the browser's
`localStorage`, and there is no login — anyone who opens the URL sees
the same single dataset.

The product is becoming a multi-tenant SaaS: each car dealership
("loja") that buys Auto Wise gets its own isolated account. Within a
dealership's account, each team member (Administrador, Gerente de
Vendas, Consultor de Vendas, Atendimento/BDC) gets their own login,
with different permissions.

The data currently visible in the deployed app (9 leads, 6 vehicles,
etc.) is demo/mock data and does not need to be preserved or migrated.

## Goals

- A login screen; nothing in the app is reachable without an
  authenticated session.
- Each dealership's data (vehicles, leads, team, settings) is fully
  isolated from every other dealership's, enforced at the database
  level (not just hidden in the UI).
- An Administrator or Sales Manager can add a team member from inside
  the app; that person receives an email invite to set their own
  password.
- Role-based permissions, enforced both in the UI (hide nav items) and
  in data access (RLS), per the matrix below.
- New dealership accounts are provisioned by the Auto Wise owner
  (Lucas) via a local script — no public signup page.

## Non-goals

- Public self-service signup for new dealerships.
- Billing/subscription management.
- Fine-grained per-field permissions (e.g. hiding specific columns) —
  access is controlled per screen/dataset only.
- Migrating existing localStorage data (there isn't any real data to
  migrate).

## Architecture

- **Supabase** (Postgres + Auth) as the backend. The user already has
  an account.
  - `@supabase/supabase-js` in the frontend, using the public
    anon key (safe to ship to the browser — access is restricted by
    RLS, not by keeping the key secret).
  - The Supabase **service role key** is a secret and is only ever
    used server-side.
- **Vercel Serverless Functions** (`/api/*.ts`) for the one operation
  that needs the service role key: creating a team member's auth user
  and sending them an invite email. Vercel builds these automatically
  alongside the Vite static site — no separate deployment needed.
- A **local provisioning script** (`scripts/create-store.ts`, run with
  `npm run create-store`, never deployed) that Lucas runs to create a
  new dealership: it creates a row in `stores` and the first
  Administrador user, using the service role key from a local-only
  `.env` file.

## Data model

Postgres tables (Supabase). All tables except `stores` carry a
`store_id` foreign key.

```sql
stores (
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
  enable_pixel_events boolean default false,
  working_hours jsonb,
  created_at timestamptz default now()
)

profiles (
  id uuid primary key references auth.users(id),
  store_id uuid not null references stores(id),
  name text not null,
  email text not null,
  phone text,
  role text not null check (role in
    ('Administrador','Gerente de Vendas','Consultor de Vendas','Atendimento / BDC')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  sales_count integer default 0,
  leads_active integer default 0,
  target_sales integer default 0,
  avatar_color text,
  joined_date date default now(),
  whatsapp_status text,
  whatsapp_connected_number text,
  whatsapp_session_id text,
  whatsapp_battery integer,
  whatsapp_connected_at timestamptz
)

vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  brand text, model text, version text,
  year int, model_year int, mileage int,
  price numeric, fipe_price numeric,
  fuel text, transmission text, color text, plate text,
  status text check (status in ('disponivel','reservado','vendido')),
  image_url text, images text[], features text[],
  created_at timestamptz default now()
)

leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text, phone text, email text,
  interested_vehicle text, vehicle_price numeric,
  source text, stage text, temperature text,
  assigned_to text,
  notes text,
  created_at timestamptz default now(),
  last_contact_at timestamptz,
  value numeric,
  date_iso timestamptz
)
```

`profiles.id` is the same UUID as the Supabase Auth user — logging in
as that user and reading `profiles` gives you your own row directly
via `auth.uid()`.

`leads.assigned_to` stores the team member's **name** (text), not a
foreign key. `LeadsView.tsx` already assigns leads via a `<select>`
populated from the `team` list, storing `t.name` as the value, and
`KanbanView.tsx` displays and filters by that same name string
end-to-end. Switching this to a `profiles.id` FK would require
rewriting the assignment dropdown, every display of the assignee, and
the seller filter in both files for no functional gain here — so this
design keeps `assigned_to` as a name, and Consultor-scoped RLS matches
it against the caller's own `profiles.name` instead of `auth.uid()`.
This assumes team member names are unique within a store, which is a
reasonable constraint for a small dealership team (enforced nowhere
today, and not worth adding for this pass).

### Row Level Security

RLS is enabled on every table. The core policy pattern (repeated per
table, adapted for `SELECT`/`INSERT`/`UPDATE`/`DELETE`):

```sql
using ( store_id = (select store_id from profiles where id = auth.uid()) )
```

`profiles` itself additionally restricts row-level writes: a user can
update their own row, but only an Administrador or Gerente de Vendas
(checked via a helper SQL function reading the caller's own role) can
insert/update/delete *other* profiles in their store — and only
Administrador can delete.

`leads`/`crm` add one more condition for `Consultor de Vendas`: they
may only `SELECT`/`UPDATE` rows where
`assigned_to = (select name from profiles where id = auth.uid())`.
Administrador, Gerente de Vendas and Atendimento/BDC see all leads in
their store.

## Auth & provisioning flows

**Login**: a new `/login` screen (email + password) using
`supabase.auth.signInWithPassword`. On success, the app loads the
caller's `profiles` row (giving `store_id`, `role`, `name`) and renders
the existing dashboard. Logging out calls `supabase.auth.signOut()`.
Session persistence is handled by the Supabase JS client (localStorage
token, auto-refresh) — no custom session code needed.

**New dealership** (admin-only, out of the running app):
`npm run create-store` prompts for store name + admin email, creates
the `stores` row, creates the Auth user via
`supabase.auth.admin.createUser` with a temporary password, and sets
their `profiles` row with role `Administrador`. Lucas relays the login
to the dealership owner directly (or triggers a password-reset email
so they set their own).

**New team member** (inside the app, Administrador/Gerente only):
the "Equipe" screen's "Adicionar" form posts `{ name, email, role }` to
`POST /api/team/invite`. That function verifies the caller's session
JWT, confirms their role is Administrador or Gerente de Vendas, then
uses the service role key to call
`supabase.auth.admin.inviteUserByEmail(email)` (Supabase sends the
invite email itself) and inserts the `profiles` row with the given
`store_id`/`role`. The new member clicks the emailed link, sets their
password, and can log in immediately.

## Frontend changes

- `lib/supabaseClient.ts`: single exported Supabase client, reading
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `contexts/AuthContext.tsx`: wraps the app, exposes
  `{ user, profile, loading, signOut }`; redirects to `/login` when
  there's no session.
- `App.tsx`: nav items and routes filtered by `profile.role` per the
  permission matrix below; the "Equipe" and "Ajustes" sections are
  omitted from the sidebar entirely for roles that can't access them
  (in addition to RLS blocking the underlying data).
- All `localStorage.getItem`/`setItem` calls live in `App.tsx` only —
  the view components (`DashboardView`, `EstoqueView`, `LeadsView`,
  `KanbanView`, `EquipeView`, `AjustesView`, `HotSiteView`) are purely
  presentational and only receive data/handlers as props, so the
  Supabase migration is concentrated in `App.tsx`: four new hooks
  (`useVehicles`, `useLeads`, `useTeam`, `useStoreSettings`) replace
  the `useState`/`useEffect(localStorage...)` pairs one-for-one,
  keeping the same handler names/shapes the view components already
  expect. Queries are scoped implicitly by RLS (no manual `store_id`
  filtering needed for reads, though `store_id` is still set on
  inserts).
- `EquipeView.tsx`'s "add member" action (which already collects
  name/email/role/password) calls the new `/api/team/invite` endpoint
  instead of writing to local state; the password field is dropped
  since Supabase's invite email lets the new member set their own.

### Permission matrix

| | Dashboard | Estoque | Leads | CRM (Kanban) | Hot Site | Equipe | Ajustes |
|---|---|---|---|---|---|---|---|
| Administrador | full | full | full | full | full | full | full |
| Gerente de Vendas | full | full | full | full | full | full (no delete) | view only |
| Consultor de Vendas | full | full | own leads only | own leads only | full | none | none |
| Atendimento/BDC | full | full | full | full | full | none | none |

## Environment variables

- Frontend (`.env.local`, also set in Vercel project settings):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Serverless functions only (Vercel project settings, **not** prefixed
  `VITE_` so it's never bundled client-side): `SUPABASE_SERVICE_ROLE_KEY`.
- Local-only (`.env`, gitignored, used by `create-store` script):
  `SUPABASE_SERVICE_ROLE_KEY`.

## Rollout

1. User creates the Supabase project and shares the project URL +
   anon key + service role key (added directly to `.env.local` / `.env`
   / Vercel settings — never pasted into chat).
2. Apply the SQL schema + RLS policies (a migration file in
   `supabase/migrations/`).
3. Implement auth context, login screen, Supabase client.
4. Migrate each view from localStorage to Supabase queries, one at a
   time, gating nav by role.
5. Implement `/api/team/invite` and the `create-store` script.
6. Run `create-store` once to create the AutoPrime Multimarcas account
   for manual end-to-end testing (login, add a team member, add a
   vehicle, add a lead, verify Consultor sees only their own leads).
7. Push, redeploy on Vercel, smoke-test on the live URL.
