-- ERP cloud single source of truth.
-- Clients can only read data covered by membership RLS and mutate workspace snapshots
-- through the version-checked RPC. Do not grant direct DML on these tables.
create table if not exists public.erp_workspaces (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (pg_catalog.char_length(pg_catalog.btrim(name)) between 2 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.erp_workspace_members (
  workspace_id uuid not null references public.erp_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.erp_workspace_state (
  workspace_id uuid primary key references public.erp_workspaces(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(data) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists erp_workspace_members_user_idx
  on public.erp_workspace_members(user_id, workspace_id);

alter table public.erp_workspaces enable row level security;
alter table public.erp_workspace_members enable row level security;
alter table public.erp_workspace_state enable row level security;

drop policy if exists erp_workspaces_select_member on public.erp_workspaces;
create policy erp_workspaces_select_member
  on public.erp_workspaces for select to authenticated
  using (exists (
    select 1 from public.erp_workspace_members m
    where m.workspace_id = id and m.user_id = (select auth.uid())
  ));

drop policy if exists erp_workspace_members_select_self on public.erp_workspace_members;
create policy erp_workspace_members_select_self
  on public.erp_workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists erp_workspace_state_select_member on public.erp_workspace_state;
create policy erp_workspace_state_select_member
  on public.erp_workspace_state for select to authenticated
  using (exists (
    select 1 from public.erp_workspace_members m
    where m.workspace_id = erp_workspace_state.workspace_id
      and m.user_id = (select auth.uid())
  ));

revoke all on table public.erp_workspaces from anon, authenticated;
revoke all on table public.erp_workspace_members from anon, authenticated;
revoke all on table public.erp_workspace_state from anon, authenticated;
grant select on table public.erp_workspaces to authenticated;
grant select on table public.erp_workspace_members to authenticated;
grant select on table public.erp_workspace_state to authenticated;

create or replace function public.erp_bootstrap_workspace(
  p_name text,
  p_initial_state jsonb
)
returns table(workspace_id uuid, workspace_name text, state_version integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_workspace_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  v_name := pg_catalog.btrim(coalesce(p_name, ''));
  if pg_catalog.char_length(v_name) < 2 or pg_catalog.char_length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Workspace name must contain 2-100 characters';
  end if;

  if p_initial_state is null
    or pg_catalog.jsonb_typeof(p_initial_state) <> 'object'
    or not (p_initial_state ? 'operational')
    or not (p_initial_state ? 'accounting')
    or pg_catalog.pg_column_size(p_initial_state) > 5000000 then
    raise exception using errcode = '22023', message = 'Invalid initial ERP state or payload exceeds 5 MB';
  end if;

  insert into public.erp_workspaces(name, created_by)
  values (v_name, v_user_id)
  returning id into v_workspace_id;

  insert into public.erp_workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  insert into public.erp_workspace_state(workspace_id, data, version, updated_by)
  values (v_workspace_id, p_initial_state, 1, v_user_id);

  return query select v_workspace_id, v_name, 1;
end;
$function$;

create or replace function public.erp_save_workspace_state(
  p_workspace_id uuid,
  p_data jsonb,
  p_expected_version integer
)
returns table(saved boolean, current_version integer, error_code text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_role text;
  v_current_version integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, null::integer, 'unauthenticated'::text;
    return;
  end if;

  if p_data is null
    or pg_catalog.jsonb_typeof(p_data) <> 'object'
    or not (p_data ? 'operational')
    or not (p_data ? 'accounting')
    or pg_catalog.pg_column_size(p_data) > 5000000 then
    return query select false, null::integer, 'invalid_payload'::text;
    return;
  end if;

  select m.role into v_role
  from public.erp_workspace_members m
  where m.workspace_id = p_workspace_id and m.user_id = v_user_id;

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    return query select false, null::integer, 'forbidden'::text;
    return;
  end if;

  select s.version into v_current_version
  from public.erp_workspace_state s
  where s.workspace_id = p_workspace_id
  for update;

  if not found then
    return query select false, null::integer, 'not_found'::text;
    return;
  end if;

  if p_expected_version is null or p_expected_version <> v_current_version then
    return query select false, v_current_version, 'conflict'::text;
    return;
  end if;

  update public.erp_workspace_state s
  set data = p_data,
      version = s.version + 1,
      updated_at = pg_catalog.now(),
      updated_by = v_user_id
  where s.workspace_id = p_workspace_id;

  return query select true, v_current_version + 1, null::text;
end;
$function$;

revoke all on function public.erp_bootstrap_workspace(text, jsonb) from public, anon;
revoke all on function public.erp_save_workspace_state(uuid, jsonb, integer) from public, anon;
grant execute on function public.erp_bootstrap_workspace(text, jsonb) to authenticated;
grant execute on function public.erp_save_workspace_state(uuid, jsonb, integer) to authenticated;

comment on table public.erp_workspace_state is
  'Canonical cloud ERP state. App data is stored as one workspace-scoped versioned JSONB document; clients must use erp_save_workspace_state to prevent lost updates.';
comment on function public.erp_save_workspace_state(uuid, jsonb, integer) is
  'Version-checked snapshot write. Rejects viewer role and stale versions; direct table DML is revoked.';