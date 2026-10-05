create table if not exists public.app_users (
  id text primary key,
  username text not null unique,
  email text unique,
  auth_user_id uuid unique,
  name text not null,
  role text not null check (role in ('admin', 'system_admin', 'juror', 'viewer')),
  salt text,
  password_hash text,
  created_at timestamptz not null
);

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'system_admin', 'juror', 'viewer'));

alter table public.app_users
  add column if not exists email text;

alter table public.app_users
  add column if not exists auth_user_id uuid;

alter table public.app_users
  alter column salt drop not null,
  alter column password_hash drop not null;

create unique index if not exists app_users_email_unique_idx
  on public.app_users (email)
  where email is not null;

create unique index if not exists app_users_auth_user_id_unique_idx
  on public.app_users (auth_user_id)
  where auth_user_id is not null;

create table if not exists public.candidates (
  id text primary key,
  order_index integer not null unique,
  name text not null,
  behavior_score numeric,
  is_top10 boolean not null default false,
  is_top5 boolean not null default false,
  updated_at timestamptz not null,
  constraint behavior_score_range check (
    behavior_score is null or behavior_score between 1 and 100
  )
);

create table if not exists public.evaluations (
  id text primary key,
  juror_id text not null references public.app_users(id),
  candidate_id text not null references public.candidates(id),
  scores jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  arcgis jsonb,
  unique (juror_id, candidate_id)
);

create table if not exists public.audit_log (
  id text primary key,
  at timestamptz not null,
  user_id text not null,
  action text not null,
  candidate_id text
);

create index if not exists evaluations_juror_idx
  on public.evaluations (juror_id);

create index if not exists evaluations_candidate_idx
  on public.evaluations (candidate_id);

alter table public.app_users enable row level security;
alter table public.candidates enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_log enable row level security;

grant select, insert, update, delete on table public.app_users to service_role;
grant select, insert, update, delete on table public.candidates to service_role;
grant select, insert, update, delete on table public.evaluations to service_role;
grant select, insert, update, delete on table public.audit_log to service_role;

drop policy if exists "service_role_full_access_app_users" on public.app_users;
create policy "service_role_full_access_app_users"
  on public.app_users
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_full_access_candidates" on public.candidates;
create policy "service_role_full_access_candidates"
  on public.candidates
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_full_access_evaluations" on public.evaluations;
create policy "service_role_full_access_evaluations"
  on public.evaluations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_full_access_audit_log" on public.audit_log;
create policy "service_role_full_access_audit_log"
  on public.audit_log
  for all
  to service_role
  using (true)
  with check (true);
