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
