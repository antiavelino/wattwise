/**
 * WattWise — Supabase Cloud Data Service
 * 
 * Comunicação direta com o banco relacional PostgreSQL do Supabase Cloud:
 * - profiles, organizations, organization_members
 * - equipment, energy_readings, organization_settings, energy_alerts
 * 
 * Respeita estritamente o Row Level Security (RLS) e o contexto multi-tenant.
 * Não utiliza chave service_role no cliente.
 */

import { supabaseClient } from './supabase';
import {
  AlertStatus,
  AppSettings,
  ConsumptionRecord,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  MeasurementType,
  Organization,
  OrgRole,
  ReadingSource,
  UserProfile,
} from '../types/energy';
import { EquipmentInput, RecordInput, SettingsInput } from '../context/WattWiseContext';

export interface RemoteOrgBundle {
  equipment: Equipment[];
  readings: ConsumptionRecord[];
  settings: AppSettings;
  alertStates: Record<string, { status: AlertStatus; acknowledgedBy?: string; acknowledgedAt?: string }>;
}

export interface RemoteUserOrg {
  role: OrgRole;
  organization: Organization;
}

// ============================================================================
// 1. Perfil e Organizações do Usuário
// ============================================================================

export async function fetchRemoteUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name || 'Usuário WattWise',
    email: '', // preenchido a partir do auth.user
    avatarUrl: data.avatar_url || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at || data.created_at,
  };
}

export async function fetchRemoteUserOrganizations(userId: string): Promise<RemoteUserOrg[]> {
  if (!supabaseClient) return [];

  const { data, error } = await supabaseClient
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        created_by,
        timezone,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data
    .filter((row: any) => row.organizations)
    .map((row: any) => ({
      role: row.role as OrgRole,
      organization: {
        id: row.organizations.id,
        name: row.organizations.name,
        slug: row.organizations.slug,
        createdBy: row.organizations.created_by || userId,
        timezone: row.organizations.timezone || 'America/Sao_Paulo',
        createdAt: row.organizations.created_at,
        updatedAt: row.organizations.updated_at || row.organizations.created_at,
      },
    }));
}

export async function createRemoteOrganization(
  name: string,
  slug?: string,
  timezone = 'America/Sao_Paulo',
): Promise<string> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { data, error } = await supabaseClient.rpc('create_organization_with_owner', {
    org_name: name.trim(),
    org_slug: slug?.trim() || null,
    org_timezone: timezone,
  });

  if (error) {
    throw new Error(error.message || 'Falha ao criar organização no Supabase Cloud.');
  }

  return data as string;
}

// ============================================================================
// 2. Consulta de Dados da Organização Ativa
// ============================================================================

export async function fetchRemoteOrganizationData(orgId: string): Promise<RemoteOrgBundle> {
  if (!supabaseClient) {
    throw new Error('Supabase Client não inicializado.');
  }

  // 1. Equipamentos
  const { data: eqData, error: eqErr } = await supabaseClient
    .from('equipment')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (eqErr) throw new Error(`Falha ao carregar equipamentos: ${eqErr.message}`);

  // 2. Registros de consumo
  const { data: rdData, error: rdErr } = await supabaseClient
    .from('energy_readings')
    .select('*')
    .eq('organization_id', orgId)
    .order('measured_at', { ascending: true });

  if (rdErr) throw new Error(`Falha ao carregar leituras: ${rdErr.message}`);

  // 3. Configurações da organização
  const { data: stData } = await supabaseClient
    .from('organization_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  // 4. Alertas de anomalia persistidos
  const { data: alData } = await supabaseClient
    .from('energy_alerts')
    .select('*')
    .eq('organization_id', orgId);

  // Mapeamentos
  const equipment: Equipment[] = (eqData || []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    category: row.category as EquipmentCategory,
    location: row.location || 'Principal',
    powerWatts: Number(row.rated_power_w) || 0,
    quantity: Number(row.quantity) || 1,
    dailyUsageHours: Number(row.daily_usage_hours) || 8,
    status: row.status as EquipmentStatus,
    notes: row.notes || undefined,
    isDemo: false,
    updatedAt: row.updated_at || row.created_at,
  }));

  const readings: ConsumptionRecord[] = (rdData || []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    equipmentId: row.equipment_id || undefined,
    date: row.measured_at,
    consumptionKwh: Number(row.energy_kwh) || 0,
    measurementType: (row.measurement_type as MeasurementType) || 'measured',
    source: (row.source as ReadingSource) || 'manual',
    meterPreviousKwh: row.meter_previous_kwh !== null ? Number(row.meter_previous_kwh) : undefined,
    meterCurrentKwh: row.meter_current_kwh !== null ? Number(row.meter_current_kwh) : undefined,
    note: row.notes || undefined,
    isDemo: false,
    createdBy: row.created_by || undefined,
    updatedAt: row.created_at,
  }));

  const settings: AppSettings = {
    establishmentName: '',
    tariffPerKwh: stData ? Number(stData.electricity_tariff) : 0.92,
    anomalyThresholdPercent: stData ? Number(stData.alert_threshold_percentage) : 20.0,
    preferredCurrency: stData?.preferred_currency || 'BRL',
    timezone: stData?.timezone || 'America/Sao_Paulo',
    isDemoProfile: false,
  };

  const alertStates: Record<string, { status: 'open' | 'acknowledged' | 'resolved'; acknowledgedBy?: string; acknowledgedAt?: string }> = {};
  if (alData) {
    for (const al of alData) {
      alertStates[al.id] = {
        status: al.status,
        acknowledgedBy: al.acknowledged_by || undefined,
        acknowledgedAt: al.acknowledged_at || undefined,
      };
    }
  }

  return { equipment, readings, settings, alertStates };
}

// ============================================================================
// 3. Mutações: Equipamentos
// ============================================================================

export async function insertRemoteEquipment(
  orgId: string,
  input: EquipmentInput,
): Promise<Equipment> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { data, error } = await supabaseClient
    .from('equipment')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      category: input.category,
      location: input.location?.trim() || 'Principal',
      rated_power_w: input.powerWatts,
      quantity: input.quantity ?? 1,
      daily_usage_hours: input.dailyUsageHours ?? 8,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao inserir equipamento no Supabase.');
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    category: data.category as EquipmentCategory,
    location: data.location || 'Principal',
    powerWatts: Number(data.rated_power_w),
    quantity: Number(data.quantity),
    dailyUsageHours: Number(data.daily_usage_hours),
    status: data.status as EquipmentStatus,
    notes: data.notes || undefined,
    isDemo: false,
    updatedAt: data.updated_at,
  };
}

export async function updateRemoteEquipment(
  orgId: string,
  equipmentId: string,
  input: EquipmentInput,
): Promise<Equipment> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { data, error } = await supabaseClient
    .from('equipment')
    .update({
      name: input.name.trim(),
      category: input.category,
      location: input.location?.trim() || 'Principal',
      rated_power_w: input.powerWatts,
      quantity: input.quantity ?? 1,
      daily_usage_hours: input.dailyUsageHours ?? 8,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .eq('id', equipmentId)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao atualizar equipamento no Supabase.');
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    category: data.category as EquipmentCategory,
    location: data.location || 'Principal',
    powerWatts: Number(data.rated_power_w),
    quantity: Number(data.quantity),
    dailyUsageHours: Number(data.daily_usage_hours),
    status: data.status as EquipmentStatus,
    notes: data.notes || undefined,
    isDemo: false,
    updatedAt: data.updated_at,
  };
}

export async function deleteRemoteEquipment(orgId: string, equipmentId: string): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { error } = await supabaseClient
    .from('equipment')
    .delete()
    .eq('id', equipmentId)
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(error.message || 'Falha ao excluir equipamento no Supabase.');
  }
}

// ============================================================================
// 4. Mutações: Registros de Consumo
// ============================================================================

export async function insertRemoteReading(
  orgId: string,
  input: RecordInput,
): Promise<ConsumptionRecord> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { data, error } = await supabaseClient
    .from('energy_readings')
    .insert({
      organization_id: orgId,
      equipment_id: input.equipmentId || null,
      measured_at: input.date,
      energy_kwh: input.consumptionKwh,
      measurement_type: input.measurementType || 'measured',
      source: input.source || 'manual',
      meter_previous_kwh: input.meterPreviousKwh ?? null,
      meter_current_kwh: input.meterCurrentKwh ?? null,
      notes: input.note?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao registrar consumo no Supabase.');
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    equipmentId: data.equipment_id || undefined,
    date: data.measured_at,
    consumptionKwh: Number(data.energy_kwh),
    measurementType: data.measurement_type as MeasurementType,
    source: data.source as ReadingSource,
    meterPreviousKwh: data.meter_previous_kwh !== null ? Number(data.meter_previous_kwh) : undefined,
    meterCurrentKwh: data.meter_current_kwh !== null ? Number(data.meter_current_kwh) : undefined,
    note: data.notes || undefined,
    isDemo: false,
    createdBy: data.created_by || undefined,
    updatedAt: data.created_at,
  };
}

export async function updateRemoteReading(
  orgId: string,
  readingId: string,
  input: RecordInput,
): Promise<ConsumptionRecord> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { data, error } = await supabaseClient
    .from('energy_readings')
    .update({
      equipment_id: input.equipmentId || null,
      measured_at: input.date,
      energy_kwh: input.consumptionKwh,
      measurement_type: input.measurementType || 'measured',
      source: input.source || 'manual',
      meter_previous_kwh: input.meterPreviousKwh ?? null,
      meter_current_kwh: input.meterCurrentKwh ?? null,
      notes: input.note?.trim() || null,
    })
    .eq('id', readingId)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao atualizar leitura no Supabase.');
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    equipmentId: data.equipment_id || undefined,
    date: data.measured_at,
    consumptionKwh: Number(data.energy_kwh),
    measurementType: data.measurement_type as MeasurementType,
    source: data.source as ReadingSource,
    meterPreviousKwh: data.meter_previous_kwh !== null ? Number(data.meter_previous_kwh) : undefined,
    meterCurrentKwh: data.meter_current_kwh !== null ? Number(data.meter_current_kwh) : undefined,
    note: data.notes || undefined,
    isDemo: false,
    createdBy: data.created_by || undefined,
    updatedAt: data.created_at,
  };
}

export async function deleteRemoteReading(orgId: string, readingId: string): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { error } = await supabaseClient
    .from('energy_readings')
    .delete()
    .eq('id', readingId)
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(error.message || 'Falha ao excluir leitura no Supabase.');
  }
}

// ============================================================================
// 5. Mutações: Configurações da Organização
// ============================================================================

export async function updateRemoteSettings(
  orgId: string,
  input: SettingsInput,
): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  // Atualiza nome da organização se informado
  if (input.establishmentName) {
    await supabaseClient
      .from('organizations')
      .update({ name: input.establishmentName.trim() })
      .eq('id', orgId);
  }

  // Atualiza settings
  const { error } = await supabaseClient
    .from('organization_settings')
    .update({
      electricity_tariff: input.tariffPerKwh,
      alert_threshold_percentage: input.anomalyThresholdPercent,
      timezone: input.timezone || 'America/Sao_Paulo',
    })
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(error.message || 'Falha ao atualizar configurações no Supabase.');
  }
}

// ============================================================================
// 6. Mutações: Alertas
// ============================================================================

export async function acknowledgeRemoteAlert(
  orgId: string,
  alertId: string,
  status: AlertStatus,
  userId?: string,
): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase Client não inicializado.');

  const { error } = await supabaseClient
    .from('energy_alerts')
    .update({
      status,
      acknowledged_by: userId || null,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(error.message || 'Falha ao atualizar status do alerta no Supabase.');
  }
}
