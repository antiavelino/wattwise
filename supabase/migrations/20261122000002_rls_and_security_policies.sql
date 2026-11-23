-- ==============================================================================
-- Migration: 20261122000002_rls_and_security_policies.sql
-- Project: WattWise — Multi-Tenant Smart Energy Intelligence
-- Description: Enables Row Level Security (RLS) on all tables, creates
--              SECURITY DEFINER tenant helper functions, atomic tenant creation
--              RPC, and granular RBAC policies (owner, admin, operator, viewer).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable Row Level Security on EVERY Table
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.equipment enable row level security;
alter table public.energy_readings enable row level security;
alter table public.organization_settings enable row level security;
alter table public.energy_alerts enable row level security;
alter table public.audit_logs enable row level security;

-- ------------------------------------------------------------------------------
-- 2. Security Definer Helper Functions (Prevent RLS recursion & enforce RBAC)
-- ------------------------------------------------------------------------------

-- Returns the authenticated user's role in the specified organization, or NULL if not a member.
create or replace function public.get_user_org_role(target_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select om.role
    from public.organization_members om
   where om.organization_id = target_org_id
     and om.user_id = auth.uid()
   limit 1;
$$;

-- Checks whether the authenticated user has one of the allowed roles in target_org_id.
create or replace function public.user_has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members om
     where om.organization_id = target_org_id
       and om.user_id = auth.uid()
       and om.role = any(allowed_roles)
  );
$$;

-- Atomically provisions a new organization with its owner membership, default
-- settings, and initial audit log record.
create or replace function public.create_organization_with_owner(
  org_name text,
  org_slug text,
  org_timezone text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_clean_slug text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if org_name is null or char_length(trim(org_name)) < 2 then
    raise exception 'O nome da organização deve ter pelo menos 2 caracteres.' using errcode = '22023';
  end if;

  v_clean_slug := lower(regexp_replace(trim(coalesce(org_slug, org_name)), '[^a-zA-Z0-9]+', '-', 'g'));
  v_clean_slug := trim(both '-' from v_clean_slug);

  if char_length(v_clean_slug) < 2 then
    v_clean_slug := 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  -- Ensure uniqueness if slug already exists
  if exists (select 1 from public.organizations where slug = v_clean_slug) then
    v_clean_slug := v_clean_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  -- 1. Create organization
  insert into public.organizations (name, slug, created_by, timezone)
  values (trim(org_name), v_clean_slug, v_user_id, coalesce(nullif(trim(org_timezone), ''), 'America/Sao_Paulo'))
  returning id into v_org_id;

  -- 2. Bind caller as 'owner'
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  -- 3. Initialize default organization settings
  insert into public.organization_settings (
    organization_id,
    electricity_tariff,
    alert_threshold_percentage,
    preferred_currency,
    timezone
  )
  values (
    v_org_id,
    0.92,
    20.0,
    'BRL',
    coalesce(nullif(trim(org_timezone), ''), 'America/Sao_Paulo')
  );

  -- 4. Record creation in audit_logs
  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_org_id,
    v_user_id,
    'organization.created',
    'organization',
    v_org_id::text,
    jsonb_build_object('name', trim(org_name), 'slug', v_clean_slug)
  );

  return v_org_id;
end;
$$;

grant execute on function public.get_user_org_role(uuid) to authenticated;
grant execute on function public.user_has_org_role(uuid, text[]) to authenticated;
grant execute on function public.create_organization_with_owner(text, text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 3. RLS Policies: profiles
-- Users can read their own profile and profiles of co-members in shared organizations.
-- Users can insert/update only their own profile.
-- ------------------------------------------------------------------------------
create policy "profiles_select_self_or_org_peers"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
        from public.organization_members my_m
        join public.organization_members peer_m
          on peer_m.organization_id = my_m.organization_id
       where my_m.user_id = auth.uid()
         and peer_m.user_id = profiles.id
    )
  );

create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. RLS Policies: organizations
-- Members (viewer, operator, admin, owner) can view their organizations.
-- Admin and owner can update organization details. Only owner can delete.
-- ------------------------------------------------------------------------------
create policy "organizations_select_members"
  on public.organizations
  for select
  to authenticated
  using (
    public.user_has_org_role(id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "organizations_insert_authenticated"
  on public.organizations
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "organizations_update_admin_owner"
  on public.organizations
  for update
  to authenticated
  using (
    public.user_has_org_role(id, array['owner', 'admin'])
  )
  with check (
    public.user_has_org_role(id, array['owner', 'admin'])
  );

create policy "organizations_delete_owner_only"
  on public.organizations
  for delete
  to authenticated
  using (
    public.user_has_org_role(id, array['owner'])
  );

-- ------------------------------------------------------------------------------
-- 5. RLS Policies: organization_members
-- All members of an organization can view the member list.
-- Owners can add/update/remove any role; Admins can manage operator/viewer members.
-- ------------------------------------------------------------------------------
create policy "org_members_select_members"
  on public.organization_members
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "org_members_insert_owner_or_admin"
  on public.organization_members
  for insert
  to authenticated
  with check (
    -- Owner can insert any role in their organization
    public.user_has_org_role(organization_id, array['owner'])
    -- Admin can insert operator or viewer roles in their organization
    or (
      public.user_has_org_role(organization_id, array['admin'])
      and role in ('operator', 'viewer')
    )
  );

create policy "org_members_update_owner_or_admin"
  on public.organization_members
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner'])
    or (
      public.user_has_org_role(organization_id, array['admin'])
      and role in ('operator', 'viewer')
    )
  )
  with check (
    public.user_has_org_role(organization_id, array['owner'])
    or (
      public.user_has_org_role(organization_id, array['admin'])
      and role in ('operator', 'viewer')
    )
  );

create policy "org_members_delete_owner_or_admin_or_self"
  on public.organization_members
  for delete
  to authenticated
  using (
    -- Owner can remove members
    public.user_has_org_role(organization_id, array['owner'])
    -- Admin can remove operators and viewers
    or (
      public.user_has_org_role(organization_id, array['admin'])
      and role in ('operator', 'viewer')
    )
    -- Non-owner member can leave the organization voluntarily
    or (
      user_id = auth.uid()
      and role <> 'owner'
    )
  );

-- ------------------------------------------------------------------------------
-- 6. RLS Policies: organization_invitations
-- Viewable and manageable by owner and admin of the target organization.
-- ------------------------------------------------------------------------------
create policy "org_invitations_select_admin_owner"
  on public.organization_invitations
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

create policy "org_invitations_insert_admin_owner"
  on public.organization_invitations
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner'])
    or (
      public.user_has_org_role(organization_id, array['admin'])
      and role in ('operator', 'viewer')
    )
  );

create policy "org_invitations_update_admin_owner"
  on public.organization_invitations
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  )
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

create policy "org_invitations_delete_admin_owner"
  on public.organization_invitations
  for delete
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

-- ------------------------------------------------------------------------------
-- 7. RLS Policies: equipment
-- viewer: SELECT only
-- operator: SELECT, INSERT, UPDATE
-- admin & owner: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------------------------------------------
create policy "equipment_select_all_members"
  on public.equipment
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "equipment_insert_operator_admin_owner"
  on public.equipment
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "equipment_update_operator_admin_owner"
  on public.equipment
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  )
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "equipment_delete_admin_owner"
  on public.equipment
  for delete
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

-- ------------------------------------------------------------------------------
-- 8. RLS Policies: energy_readings
-- viewer: SELECT only
-- operator: SELECT, INSERT, UPDATE
-- admin & owner: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------------------------------------------
create policy "energy_readings_select_all_members"
  on public.energy_readings
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "energy_readings_insert_operator_admin_owner"
  on public.energy_readings
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "energy_readings_update_operator_admin_owner"
  on public.energy_readings
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  )
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "energy_readings_delete_admin_owner"
  on public.energy_readings
  for delete
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

-- ------------------------------------------------------------------------------
-- 9. RLS Policies: organization_settings
-- viewer & operator: SELECT only
-- admin & owner: SELECT, INSERT, UPDATE
-- ------------------------------------------------------------------------------
create policy "org_settings_select_all_members"
  on public.organization_settings
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "org_settings_insert_admin_owner"
  on public.organization_settings
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

create policy "org_settings_update_admin_owner"
  on public.organization_settings
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  )
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

-- ------------------------------------------------------------------------------
-- 10. RLS Policies: energy_alerts
-- viewer: SELECT only
-- operator: SELECT, INSERT, UPDATE (acknowledge/resolve)
-- admin & owner: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------------------------------------------
create policy "energy_alerts_select_all_members"
  on public.energy_alerts
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator', 'viewer'])
  );

create policy "energy_alerts_insert_operator_admin_owner"
  on public.energy_alerts
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "energy_alerts_update_operator_admin_owner"
  on public.energy_alerts
  for update
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  )
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
  );

create policy "energy_alerts_delete_admin_owner"
  on public.energy_alerts
  for delete
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

-- ------------------------------------------------------------------------------
-- 11. RLS Policies: audit_logs
-- Members with owner or admin role can inspect their organization's audit trail.
-- Operators/admins/owners can append audit events for their own organization.
-- ------------------------------------------------------------------------------
create policy "audit_logs_select_admin_owner"
  on public.audit_logs
  for select
  to authenticated
  using (
    public.user_has_org_role(organization_id, array['owner', 'admin'])
  );

create policy "audit_logs_insert_members"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    public.user_has_org_role(organization_id, array['owner', 'admin', 'operator'])
    and (actor_user_id is null or actor_user_id = auth.uid())
  );
