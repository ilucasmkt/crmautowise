-- Security fixes from final branch review:
-- C1: block id/store_id changes on self-update for ALL roles (previously
--     Administrador/Gerente de Vendas were fully exempt from the trigger's
--     column protections, letting them relocate themselves into another
--     tenant by changing their own store_id).
-- C2: block name changes on self-update for non-admin roles, since
--     leads.assigned_to matching relies on profiles.name being a stable,
--     unique-per-store identifier, not a self-editable display label.
-- Also pins search_path on all four SECURITY DEFINER functions and drops
-- the unnecessary SECURITY DEFINER from the trigger function.

alter table profiles add constraint profiles_store_name_unique unique (store_id, name);

create or replace function auth_store_id() returns uuid
language sql security definer stable
set search_path = public, pg_temp as $$
  select store_id from profiles where id = auth.uid();
$$;

create or replace function auth_role() returns text
language sql security definer stable
set search_path = public, pg_temp as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_name() returns text
language sql security definer stable
set search_path = public, pg_temp as $$
  select name from profiles where id = auth.uid();
$$;

create or replace function prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
set search_path = public, pg_temp as $$
begin
  if auth.uid() = old.id then
    if new.id is distinct from old.id or new.store_id is distinct from old.store_id then
      raise exception 'Not allowed to change your own id or store_id';
    end if;

    if auth_role() not in ('Administrador', 'Gerente de Vendas') then
      if new.role is distinct from old.role
        or new.status is distinct from old.status
        or new.sales_count is distinct from old.sales_count
        or new.leads_active is distinct from old.leads_active
        or new.target_sales is distinct from old.target_sales
        or new.name is distinct from old.name
      then
        raise exception 'Not allowed to change privileged profile fields on your own account';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
