alter table profiles add column in_lead_rotation boolean not null default true;
alter table stores add column last_rotation_profile_id uuid references profiles(id) on delete set null;
