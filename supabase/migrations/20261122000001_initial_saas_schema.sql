-- ==============================================================================
-- Migration: 20261122000001_initial_saas_schema.sql
-- Project: WattWise — Multi-Tenant Smart Energy Intelligence
-- Description: Complete PostgreSQL relational schema, constraints, indexes,
--              updated_at triggers, and automatic user profile provisioning.
-- ==============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 0. Custom Domain Enums (Documentation & Optional Type Reference)
-- Note: Columns use explicit TEXT + CHECK constraints as well for maximum
-- compatibility with PostgREST and TypeScript SDK code generation.
-- ------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'admin', 'operator', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'measurement_type') then
    create type public.measurement_type as enum ('measured', 'estimated', 'simulated');
  end if;
  if not exists (select 1 from pg_type where typname = 'reading_source') then
    create type public.reading_source as enum ('manual', 'meter_cumulative', 'local_migration', 'demo_seed');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_severity') then
    create type public.alert_severity as enum ('warning', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_status') then
    create type public.alert_status as enum ('open', 'acknowledged', 'resolved');
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 1. Generic updated_at Trigger Function
-- ------------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. Table: profiles
-- Stores public user profile metadata linked 1:1 with auth.users.
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Table: organizations
-- Multi-tenant root entity representing a company, plant, or facility.
-- ------------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references auth.users(id) on delete set null,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Table: organization_members
-- Maps users to organizations with strict RBAC role enforcement.
-- ------------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 5. Table: organization_invitations
-- Stores hashed invitation tokens for onboarding team members securely.
-- ------------------------------------------------------------------------------
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null check (role in ('admin', 'operator', 'viewer')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 6. Table: equipment
-- Catalog of monitored electrical assets per organization.
-- ------------------------------------------------------------------------------
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  category text not null,
  location text not null default 'Principal',
  rated_power_w integer not null check (rated_power_w > 0),
  quantity integer not null default 1 check (quantity > 0),
  daily_usage_hours numeric(4,2) not null default 8.0 check (daily_usage_hours >= 0 and daily_usage_hours <= 24),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_equipment_updated_at
  before update on public.equipment
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Table: energy_readings
-- Time-series energy measurements (measured, estimated, or simulated).
-- ------------------------------------------------------------------------------
create table if not exists public.energy_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  measured_at date not null,
  energy_kwh numeric(12,3) not null check (energy_kwh >= 0),
  measurement_type text not null check (measurement_type in ('measured', 'estimated', 'simulated')),
  source text not null default 'manual' check (source in ('manual', 'meter_cumulative', 'local_migration', 'demo_seed')),
  meter_previous_kwh numeric(14,3) check (meter_previous_kwh is null or meter_previous_kwh >= 0),
  meter_current_kwh numeric(14,3) check (meter_current_kwh is null or meter_current_kwh >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint meter_cumulative_order_check check (
    meter_previous_kwh is null
    or meter_current_kwh is null
    or meter_current_kwh >= meter_previous_kwh
  )
);

-- ------------------------------------------------------------------------------
-- 8. Table: organization_settings
-- Tenant-specific tariff, currency, and anomaly detection sensitivity.
-- ------------------------------------------------------------------------------
create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  electricity_tariff numeric(10,4) not null default 0.92 check (electricity_tariff > 0),
  alert_threshold_percentage numeric(6,2) not null default 20.0 check (alert_threshold_percentage >= 5 and alert_threshold_percentage <= 200),
  preferred_currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create trigger set_organization_settings_updated_at
  before update on public.organization_settings
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. Table: energy_alerts
-- Anomaly notifications when consumption exceeds historical/estimated baselines.
-- ------------------------------------------------------------------------------
create table if not exists public.energy_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  reading_id uuid references public.energy_readings(id) on delete cascade,
  severity text not null check (severity in ('warning', 'critical')),
  title text not null,
  description text not null,
  deviation_percent numeric(7,2),
  baseline_kwh numeric(12,3),
  measured_kwh numeric(12,3),
  detected_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 10. Table: audit_logs
-- Immutable security and operational audit trail per tenant.
-- ------------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 11. Performance & Multi-Tenant Isolation Indexes
-- ------------------------------------------------------------------------------
create index if not exists idx_org_members_org_id
  on public.organization_members(organization_id);

create index if not exists idx_org_members_user_org
  on public.organization_members(user_id, organization_id);

create index if not exists idx_org_invitations_org_id
  on public.organization_invitations(organization_id, status);

create index if not exists idx_equipment_org_id
  on public.equipment(organization_id, status);

create index if not exists idx_energy_readings_org_measured_at
  on public.energy_readings(organization_id, measured_at desc);

create index if not exists idx_energy_readings_equipment_id
  on public.energy_readings(equipment_id, measured_at desc);

create index if not exists idx_energy_alerts_org_status
  on public.energy_alerts(organization_id, status, detected_at desc);

create index if not exists idx_audit_logs_org_created_at
  on public.audit_logs(organization_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 12. Automatic Profile Creation on Supabase Auth Signup
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'usuario@wattwise.com.br'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
