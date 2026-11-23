import {
  AlertAcknowledgement,
  AlertStatus,
  AppSettings,
  AuditLogEntry,
  ConsumptionRecord,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  LegacyMigrationPreview,
  MeasurementType,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrgRole,
  ReadingSource,
  UserProfile,
} from '../types/energy';
import { generateId } from '../utils/formatters';
import { isEquipmentStatus, isValidIsoDate } from '../utils/validators';
import { STORAGE_KEY as LEGACY_STORAGE_KEY } from './localStorage';

export const SAAS_DB_STORAGE_KEY = 'wattwise_saas_db_v2';
export const LEGACY_BACKUP_STORAGE_KEY = 'wattwise_state_v1_backup';

const ROLE_WEIGHT: Record<OrgRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

interface StoredUserAccount {
  profile: UserProfile;
  passwordDigest: string;
}

export interface OtpRecoveryChallenge {
  email: string;
  otpCode: string;
  expiresAt: number;
  verified: boolean;
}

export interface SaasDatabaseSchema {
  version: number;
  currentSessionUserId: string | null;
  activeOrganizationByUser: Record<string, string>;
  users: StoredUserAccount[];
  organizations: Organization[];
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  equipment: Equipment[];
  readings: ConsumptionRecord[];
  settingsByOrg: Record<string, AppSettings>;
  alertStatesByOrg: Record<string, Record<string, AlertAcknowledgement>>;
  auditLogs: AuditLogEntry[];
  migratedLegacyOrgs: string[];
  recoveryChallenges?: Record<string, OtpRecoveryChallenge>;
}

function simpleHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `sha256_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export function createEmptySaasDatabase(): SaasDatabaseSchema {
  return {
    version: 2,
    currentSessionUserId: null,
    activeOrganizationByUser: {},
    users: [],
    organizations: [],
    members: [],
    invitations: [],
    equipment: [],
    readings: [],
    settingsByOrg: {},
    alertStatesByOrg: {},
    auditLogs: [],
    migratedLegacyOrgs: [],
    recoveryChallenges: {},
  };
}

export function loadSaasDatabase(): SaasDatabaseSchema {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createEmptySaasDatabase();
    }
    const raw = window.localStorage.getItem(SAAS_DB_STORAGE_KEY);
    if (!raw) return createEmptySaasDatabase();
    const parsed = JSON.parse(raw) as Partial<SaasDatabaseSchema>;
    if (!parsed || typeof parsed !== 'object') return createEmptySaasDatabase();

    return {
      version: 2,
      currentSessionUserId: parsed.currentSessionUserId ?? null,
      activeOrganizationByUser: parsed.activeOrganizationByUser ?? {},
      users: Array.isArray(parsed.users) ? parsed.users : [],
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
      readings: Array.isArray(parsed.readings) ? parsed.readings : [],
      settingsByOrg: parsed.settingsByOrg ?? {},
      alertStatesByOrg: parsed.alertStatesByOrg ?? {},
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      migratedLegacyOrgs: Array.isArray(parsed.migratedLegacyOrgs)
        ? parsed.migratedLegacyOrgs
        : [],
      recoveryChallenges: parsed.recoveryChallenges ?? {},
    };
  } catch {
    return createEmptySaasDatabase();
  }
}

export function saveSaasDatabase(db: SaasDatabaseSchema): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SAAS_DB_STORAGE_KEY, JSON.stringify(db));
    }
  } catch {
    // Mantém integridade em memória caso quota local falhe
  }
}

export function slugifyOrganizationName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return base || 'organizacao';
}

export function getUserRoleInOrganization(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
): OrgRole | null {
  const membership = db.members.find(
    (m) => m.userId === userId && m.organizationId === organizationId,
  );
  return membership ? membership.role : null;
}

export function assertUserHasOrgRole(
  db: SaasDatabaseSchema,
  userId: string | null,
  organizationId: string,
  minimumRole: OrgRole,
): OrgRole {
  if (!userId) {
    throw new Error('Autenticação obrigatória para executar esta operação.');
  }
  const role = getUserRoleInOrganization(db, userId, organizationId);
  if (!role) {
    throw new Error(
      'Acesso negado (RLS): usuário não pertence à organização informada.',
    );
  }
  if (ROLE_WEIGHT[role] < ROLE_WEIGHT[minimumRole]) {
    throw new Error(
      `Permissão insuficiente (RBAC): a função "${role}" não pode executar operações que exigem nível "${minimumRole}".`,
    );
  }
  return role;
}

function appendAuditLog(
  db: SaasDatabaseSchema,
  params: {
    organizationId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details: string;
  },
): void {
  const user = db.users.find((u) => u.profile.id === params.actorUserId);
  const entry: AuditLogEntry = {
    id: generateId('audit'),
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorName: user?.profile.fullName ?? 'Sistema',
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs = [entry, ...db.auditLogs].slice(0, 250);
}

// ============================================================================
// Autenticação e Contas
// ============================================================================

export function registerUserAccount(
  db: SaasDatabaseSchema,
  input: { fullName: string; email: string; password: string; organizationName?: string },
): { db: SaasDatabaseSchema; user: UserProfile; organization?: Organization } {
  const normalizedEmail = input.email.trim().toLowerCase();
  const trimmedName = input.fullName.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Informe seu nome completo (mínimo de 2 caracteres).');
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }

  const existing = db.users.find((u) => u.profile.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('Já existe uma conta cadastrada com este e-mail.');
  }

  const now = new Date().toISOString();
  const user: UserProfile = {
    id: generateId('usr'),
    email: normalizedEmail,
    fullName: trimmedName,
    createdAt: now,
    updatedAt: now,
  };

  const nextDb: SaasDatabaseSchema = {
    ...db,
    users: [
      ...db.users,
      {
        profile: user,
        passwordDigest: simpleHash(`${normalizedEmail}:${input.password}`),
      },
    ],
    currentSessionUserId: user.id,
  };

  for (const inv of nextDb.invitations) {
    if (inv.email.toLowerCase() === normalizedEmail && inv.status === 'pending') {
      inv.status = 'accepted';
      nextDb.members.push({
        id: generateId('mem'),
        organizationId: inv.organizationId,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: inv.role,
        joinedAt: now,
      });
      if (!nextDb.activeOrganizationByUser[user.id]) {
        nextDb.activeOrganizationByUser[user.id] = inv.organizationId;
      }
    }
  }

  let createdOrg: Organization | undefined;
  if (input.organizationName && input.organizationName.trim()) {
    const orgResult = createOrganizationForUser(nextDb, user.id, {
      name: input.organizationName.trim(),
      timezone: 'America/Sao_Paulo',
    });
    createdOrg = orgResult.organization;
  }

  saveSaasDatabase(nextDb);
  return { db: nextDb, user, organization: createdOrg };
}

export function loginUserAccount(
  db: SaasDatabaseSchema,
  input: { email: string; password: string },
): { db: SaasDatabaseSchema; user: UserProfile } {
  const normalizedEmail = input.email.trim().toLowerCase();
  const account = db.users.find((u) => u.profile.email.toLowerCase() === normalizedEmail);
  if (!account) {
    throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
  }

  const expectedDigest = simpleHash(`${normalizedEmail}:${input.password}`);
  if (account.passwordDigest !== expectedDigest) {
    throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
  }

  const nextDb: SaasDatabaseSchema = {
    ...db,
    currentSessionUserId: account.profile.id,
  };
  saveSaasDatabase(nextDb);
  return { db: nextDb, user: account.profile };
}

export function resetUserPassword(
  db: SaasDatabaseSchema,
  input: { email: string; newPassword: string },
): SaasDatabaseSchema {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!input.newPassword || input.newPassword.length < 6) {
    throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  }

  const accountIdx = db.users.findIndex(
    (u) => u.profile.email.toLowerCase() === normalizedEmail,
  );
  if (accountIdx === -1) {
    throw new Error('Nenhuma conta encontrada para o e-mail informado.');
  }

  const nextUsers = [...db.users];
  nextUsers[accountIdx] = {
    ...nextUsers[accountIdx],
    passwordDigest: simpleHash(`${normalizedEmail}:${input.newPassword}`),
    profile: {
      ...nextUsers[accountIdx].profile,
      updatedAt: new Date().toISOString(),
    },
  };

  const nextDb: SaasDatabaseSchema = {
    ...db,
    users: nextUsers,
  };
  saveSaasDatabase(nextDb);
  return nextDb;
}

export function requestPasswordRecoveryOtp(
  db: SaasDatabaseSchema,
  email: string,
): { db: SaasDatabaseSchema; otpCode: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Informe um endereço de e-mail válido para recuperação.');
  }
  const account = db.users.find((u) => u.profile.email.toLowerCase() === normalizedEmail);
  if (!account) {
    throw new Error('Nenhuma conta encontrada com o e-mail informado.');
  }

  // Gera código de 6 dígitos numéricos
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const challenge: OtpRecoveryChallenge = {
    email: normalizedEmail,
    otpCode,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
    verified: false,
  };

  const nextDb: SaasDatabaseSchema = {
    ...db,
    recoveryChallenges: {
      ...(db.recoveryChallenges ?? {}),
      [normalizedEmail]: challenge,
    },
  };
  saveSaasDatabase(nextDb);
  return { db: nextDb, otpCode };
}

export function verifyPasswordRecoveryOtp(
  db: SaasDatabaseSchema,
  email: string,
  otpCode: string,
): { db: SaasDatabaseSchema; valid: boolean } {
  const normalizedEmail = email.trim().toLowerCase();
  const challenge = db.recoveryChallenges?.[normalizedEmail];
  if (!challenge) {
    throw new Error('Nenhuma solicitação de recuperação pendente para este e-mail.');
  }
  if (Date.now() > challenge.expiresAt) {
    throw new Error('O código de verificação expirou. Solicite um novo código.');
  }
  const cleanCode = otpCode.replace(/\D/g, '');
  if (cleanCode.length !== 6 || challenge.otpCode !== cleanCode) {
    throw new Error('Código de verificação incorreto. Verifique os 6 dígitos digitados.');
  }

  const nextDb: SaasDatabaseSchema = {
    ...db,
    recoveryChallenges: {
      ...(db.recoveryChallenges ?? {}),
      [normalizedEmail]: {
        ...challenge,
        verified: true,
      },
    },
  };
  saveSaasDatabase(nextDb);
  return { db: nextDb, valid: true };
}

export function completePasswordRecovery(
  db: SaasDatabaseSchema,
  email: string,
  newPassword: string,
): SaasDatabaseSchema {
  const normalizedEmail = email.trim().toLowerCase();
  const challenge = db.recoveryChallenges?.[normalizedEmail];
  if (!challenge || !challenge.verified) {
    throw new Error('É necessário validar o código OTP antes de redefinir a senha.');
  }
  if (Date.now() > challenge.expiresAt) {
    throw new Error('A sessão de recuperação expirou. Inicie o processo novamente.');
  }

  const nextDb = resetUserPassword(db, { email: normalizedEmail, newPassword });
  if (nextDb.recoveryChallenges && nextDb.recoveryChallenges[normalizedEmail]) {
    const remaining = { ...nextDb.recoveryChallenges };
    delete remaining[normalizedEmail];
    nextDb.recoveryChallenges = remaining;
    saveSaasDatabase(nextDb);
  }
  return nextDb;
}

export function logoutUserAccount(db: SaasDatabaseSchema): SaasDatabaseSchema {
  const nextDb: SaasDatabaseSchema = {
    ...db,
    currentSessionUserId: null,
  };
  saveSaasDatabase(nextDb);
  return nextDb;
}

// ============================================================================
// Organizações, Membros e Permissões Multi-Tenant
// ============================================================================

export function createOrganizationForUser(
  db: SaasDatabaseSchema,
  userId: string,
  input: {
    name: string;
    timezone?: string;
    tariffPerKwh?: number;
    anomalyThresholdPercent?: number;
  },
): { db: SaasDatabaseSchema; organization: Organization } {
  const account = db.users.find((u) => u.profile.id === userId);
  if (!account) {
    throw new Error('Usuário não encontrado para criar organização.');
  }

  const trimmedName = input.name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('O nome da organização deve ter pelo menos 2 caracteres.');
  }

  const now = new Date().toISOString();
  const baseSlug = slugifyOrganizationName(trimmedName);
  const uniqueSlug = db.organizations.some((o) => o.slug === baseSlug)
    ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    : baseSlug;

  const organization: Organization = {
    id: generateId('org'),
    name: trimmedName,
    slug: uniqueSlug,
    createdBy: userId,
    timezone: input.timezone ?? 'America/Sao_Paulo',
    createdAt: now,
    updatedAt: now,
  };

  const member: OrganizationMember = {
    id: generateId('mem'),
    organizationId: organization.id,
    userId,
    email: account.profile.email,
    fullName: account.profile.fullName,
    role: 'owner',
    joinedAt: now,
  };

  const settings: AppSettings = {
    establishmentName: trimmedName,
    tariffPerKwh: input.tariffPerKwh ?? 0.92,
    anomalyThresholdPercent: input.anomalyThresholdPercent ?? 20,
    preferredCurrency: 'BRL',
    timezone: organization.timezone,
    isDemoProfile: false,
  };

  db.organizations = [...db.organizations, organization];
  db.members = [...db.members, member];
  db.settingsByOrg = { ...db.settingsByOrg, [organization.id]: settings };
  db.alertStatesByOrg = { ...db.alertStatesByOrg, [organization.id]: {} };
  db.activeOrganizationByUser = {
    ...db.activeOrganizationByUser,
    [userId]: organization.id,
  };

  appendAuditLog(db, {
    organizationId: organization.id,
    actorUserId: userId,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    details: `Organização "${organization.name}" criada com perfil Owner.`,
  });

  saveSaasDatabase(db);
  return { db, organization };
}

export function getOrganizationsForUser(
  db: SaasDatabaseSchema,
  userId: string,
): Array<{ organization: Organization; role: OrgRole }> {
  const memberships = db.members.filter((m) => m.userId === userId);
  const list: Array<{ organization: Organization; role: OrgRole }> = [];
  for (const m of memberships) {
    const org = db.organizations.find((o) => o.id === m.organizationId);
    if (org) {
      list.push({ organization: org, role: m.role });
    }
  }
  return list;
}

export function queryOrganizationData(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
): {
  organization: Organization;
  role: OrgRole;
  equipment: Equipment[];
  readings: ConsumptionRecord[];
  settings: AppSettings;
  alertStates: Record<string, AlertAcknowledgement>;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  auditLogs: AuditLogEntry[];
} {
  const role = assertUserHasOrgRole(db, userId, organizationId, 'viewer');
  const organization = db.organizations.find((o) => o.id === organizationId);
  if (!organization) {
    throw new Error('Organização não encontrada.');
  }

  const settings = db.settingsByOrg[organizationId] ?? {
    establishmentName: organization.name,
    tariffPerKwh: 0.92,
    anomalyThresholdPercent: 20,
    preferredCurrency: 'BRL',
    timezone: organization.timezone,
    isDemoProfile: false,
  };

  return {
    organization,
    role,
    equipment: db.equipment.filter((e) => e.organizationId === organizationId),
    readings: db.readings.filter((r) => r.organizationId === organizationId),
    settings,
    alertStates: db.alertStatesByOrg[organizationId] ?? {},
    members: db.members.filter((m) => m.organizationId === organizationId),
    invitations: db.invitations.filter((i) => i.organizationId === organizationId),
    auditLogs: db.auditLogs.filter((a) => a.organizationId === organizationId),
  };
}

// ============================================================================
// CRUD Multi-Tenant com Verificação RLS e RBAC
// ============================================================================

export function createEquipmentInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  input: {
    name: string;
    category: EquipmentCategory;
    location?: string;
    powerWatts: number;
    quantity?: number;
    dailyUsageHours?: number;
    status: EquipmentStatus;
    notes?: string;
    targetOrganizationId?: string;
  },
): { db: SaasDatabaseSchema; equipment: Equipment } {
  if (input.targetOrganizationId && input.targetOrganizationId !== organizationId) {
    throw new Error(
      'Violação de segurança (RLS WITH CHECK): tentativa de inserir equipamento com organization_id diferente da sessão autorizada.',
    );
  }

  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const newEquipment: Equipment = {
    id: generateId('eq'),
    organizationId,
    name: input.name.trim(),
    category: input.category,
    location: input.location?.trim() || 'Principal',
    powerWatts: Math.round(input.powerWatts),
    quantity: Math.max(1, Math.round(input.quantity ?? 1)),
    dailyUsageHours: Math.min(24, Math.max(0, Number(input.dailyUsageHours ?? 8))),
    status: input.status,
    notes: input.notes?.trim() || undefined,
    isDemo: false,
    updatedAt: new Date().toISOString(),
  };

  db.equipment = [newEquipment, ...db.equipment];
  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'equipment.created',
    entityType: 'equipment',
    entityId: newEquipment.id,
    details: `Equipamento "${newEquipment.name}" (${newEquipment.powerWatts} W × ${newEquipment.quantity}) cadastrado.`,
  });

  saveSaasDatabase(db);
  return { db, equipment: newEquipment };
}

export function updateEquipmentInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  equipmentId: string,
  input: {
    name: string;
    category: EquipmentCategory;
    location?: string;
    powerWatts: number;
    quantity?: number;
    dailyUsageHours?: number;
    status: EquipmentStatus;
    notes?: string;
  },
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const target = db.equipment.find((e) => e.id === equipmentId);
  if (!target || target.organizationId !== organizationId) {
    throw new Error('Acesso negado (RLS): equipamento não pertence a esta organização.');
  }

  db.equipment = db.equipment.map((item) =>
    item.id === equipmentId
      ? {
          ...item,
          name: input.name.trim(),
          category: input.category,
          location: input.location?.trim() || item.location || 'Principal',
          powerWatts: Math.round(input.powerWatts),
          quantity: Math.max(1, Math.round(input.quantity ?? item.quantity ?? 1)),
          dailyUsageHours: Math.min(
            24,
            Math.max(0, Number(input.dailyUsageHours ?? item.dailyUsageHours ?? 8)),
          ),
          status: input.status,
          notes: input.notes?.trim() || undefined,
          isDemo: false,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'equipment.updated',
    entityType: 'equipment',
    entityId: equipmentId,
    details: `Equipamento "${input.name.trim()}" atualizado.`,
  });

  saveSaasDatabase(db);
  return db;
}

export function deleteEquipmentInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  equipmentId: string,
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const target = db.equipment.find((e) => e.id === equipmentId);
  if (!target || target.organizationId !== organizationId) {
    throw new Error('Acesso negado (RLS): equipamento não pertence a esta organização.');
  }

  db.equipment = db.equipment.filter((e) => e.id !== equipmentId);
  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'equipment.deleted',
    entityType: 'equipment',
    entityId: equipmentId,
    details: `Equipamento "${target.name}" excluído.`,
  });

  saveSaasDatabase(db);
  return db;
}

export function createReadingInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  input: {
    date: string;
    consumptionKwh: number;
    equipmentId?: string;
    measurementType?: MeasurementType;
    source?: ReadingSource;
    meterPreviousKwh?: number;
    meterCurrentKwh?: number;
    note?: string;
    targetOrganizationId?: string;
  },
): { db: SaasDatabaseSchema; reading: ConsumptionRecord } {
  if (input.targetOrganizationId && input.targetOrganizationId !== organizationId) {
    throw new Error(
      'Violação de segurança (RLS WITH CHECK): tentativa de inserir leitura com organization_id de outra organização.',
    );
  }

  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  if (!isValidIsoDate(input.date)) {
    throw new Error('Data de medição inválida.');
  }
  if (!Number.isFinite(input.consumptionKwh) || input.consumptionKwh < 0) {
    throw new Error('O consumo em kWh não pode ser negativo.');
  }

  if (input.equipmentId) {
    const eq = db.equipment.find((e) => e.id === input.equipmentId);
    if (!eq || eq.organizationId !== organizationId) {
      throw new Error('Equipamento vinculado inválido ou pertencente a outra organização.');
    }
  }

  const mType: MeasurementType = input.measurementType ?? 'measured';
  const reading: ConsumptionRecord = {
    id: generateId('rec'),
    organizationId,
    equipmentId: input.equipmentId || undefined,
    date: input.date,
    consumptionKwh: Math.round(input.consumptionKwh * 100) / 100,
    measurementType: mType,
    source: input.source ?? 'manual',
    meterPreviousKwh: input.meterPreviousKwh,
    meterCurrentKwh: input.meterCurrentKwh,
    note: input.note?.trim() || undefined,
    isDemo: mType === 'simulated',
    createdBy: userId,
    updatedAt: new Date().toISOString(),
  };

  db.readings = [...db.readings, reading];
  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'reading.created',
    entityType: 'energy_reading',
    entityId: reading.id,
    details: `Medição de ${reading.consumptionKwh} kWh (${mType}) registrada em ${reading.date}.`,
  });

  saveSaasDatabase(db);
  return { db, reading };
}

export function updateReadingInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  readingId: string,
  input: {
    date: string;
    consumptionKwh: number;
    equipmentId?: string;
    measurementType?: MeasurementType;
    note?: string;
  },
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const target = db.readings.find((r) => r.id === readingId);
  if (!target || target.organizationId !== organizationId) {
    throw new Error('Acesso negado (RLS): registro não pertence a esta organização.');
  }

  const mType: MeasurementType = input.measurementType ?? target.measurementType ?? 'measured';

  db.readings = db.readings.map((item) =>
    item.id === readingId
      ? {
          ...item,
          date: input.date,
          consumptionKwh: Math.round(input.consumptionKwh * 100) / 100,
          equipmentId: input.equipmentId || undefined,
          measurementType: mType,
          note: input.note?.trim() || undefined,
          isDemo: mType === 'simulated',
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'reading.updated',
    entityType: 'energy_reading',
    entityId: readingId,
    details: `Medição de ${input.date} atualizada para ${input.consumptionKwh} kWh.`,
  });

  saveSaasDatabase(db);
  return db;
}

export function deleteReadingInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  readingId: string,
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const target = db.readings.find((r) => r.id === readingId);
  if (!target || target.organizationId !== organizationId) {
    throw new Error('Acesso negado (RLS): registro não pertence a esta organização.');
  }

  db.readings = db.readings.filter((r) => r.id !== readingId);
  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'reading.deleted',
    entityType: 'energy_reading',
    entityId: readingId,
    details: `Medição de ${target.date} (${target.consumptionKwh} kWh) excluída.`,
  });

  saveSaasDatabase(db);
  return db;
}

export function updateOrganizationSettingsInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  input: {
    establishmentName: string;
    tariffPerKwh: number;
    anomalyThresholdPercent: number;
    timezone?: string;
  },
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'admin');

  const trimmedName = input.establishmentName.trim();
  const nextSettings: AppSettings = {
    establishmentName: trimmedName,
    tariffPerKwh: input.tariffPerKwh,
    anomalyThresholdPercent: input.anomalyThresholdPercent,
    preferredCurrency: 'BRL',
    timezone: input.timezone ?? 'America/Sao_Paulo',
    isDemoProfile: false,
  };

  db.settingsByOrg = {
    ...db.settingsByOrg,
    [organizationId]: nextSettings,
  };

  db.organizations = db.organizations.map((org) =>
    org.id === organizationId
      ? {
          ...org,
          name: trimmedName,
          timezone: nextSettings.timezone ?? org.timezone,
          updatedAt: new Date().toISOString(),
        }
      : org,
  );

  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'settings.updated',
    entityType: 'organization_settings',
    entityId: organizationId,
    details: `Tarifa configurada em R$ ${input.tariffPerKwh.toFixed(2)}/kWh e limite de alerta em ${input.anomalyThresholdPercent}%.`,
  });

  saveSaasDatabase(db);
  return db;
}

export function updateAlertStatusInOrg(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  alertId: string,
  status: AlertStatus,
): SaasDatabaseSchema {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const user = db.users.find((u) => u.profile.id === userId);
  const currentOrgAlerts = db.alertStatesByOrg[organizationId] ?? {};
  db.alertStatesByOrg = {
    ...db.alertStatesByOrg,
    [organizationId]: {
      ...currentOrgAlerts,
      [alertId]: {
        status,
        acknowledgedBy: user?.profile.fullName ?? 'Operador',
        acknowledgedAt: new Date().toISOString(),
      },
    },
  };

  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: `alert.${status}`,
    entityType: 'energy_alert',
    entityId: alertId,
    details: `Status do alerta alterado para "${status}".`,
  });

  saveSaasDatabase(db);
  return db;
}

// ============================================================================
// Equipe e Membros (RBAC)
// ============================================================================

export function inviteMemberToOrganization(
  db: SaasDatabaseSchema,
  actorUserId: string,
  organizationId: string,
  input: { email: string; fullName?: string; role: OrgRole },
): { db: SaasDatabaseSchema; addedDirectly: boolean; emailSent: boolean } {
  const actorRole = assertUserHasOrgRole(db, actorUserId, organizationId, 'admin');
  if (input.role === 'owner' && actorRole !== 'owner') {
    throw new Error('Somente um Owner pode conceder função de Owner.');
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Informe um e-mail válido para o convite.');
  }

  if (
    db.members.some(
      (m) => m.organizationId === organizationId && m.email.toLowerCase() === normalizedEmail,
    )
  ) {
    throw new Error('Este usuário já faz parte da organização.');
  }

  const existingUser = db.users.find((u) => u.profile.email.toLowerCase() === normalizedEmail);
  const now = new Date().toISOString();

  if (existingUser) {
    db.members = [
      ...db.members,
      {
        id: generateId('mem'),
        organizationId,
        userId: existingUser.profile.id,
        email: existingUser.profile.email,
        fullName: existingUser.profile.fullName,
        role: input.role,
        joinedAt: now,
      },
    ];
    appendAuditLog(db, {
      organizationId,
      actorUserId,
      action: 'member.added',
      entityType: 'organization_member',
      details: `${existingUser.profile.fullName} (${normalizedEmail}) adicionado com função "${input.role}".`,
    });
    saveSaasDatabase(db);
    return { db, addedDirectly: true, emailSent: false };
  }

  const invitation: OrganizationInvitation = {
    id: generateId('inv'),
    organizationId,
    email: normalizedEmail,
    role: input.role,
    invitedBy: actorUserId,
    status: 'pending',
    emailSent: false,
    createdAt: now,
  };

  db.invitations = [invitation, ...db.invitations];
  appendAuditLog(db, {
    organizationId,
    actorUserId,
    action: 'member.invited',
    entityType: 'organization_invitation',
    entityId: invitation.id,
    details: `Convite criado para ${normalizedEmail} (${input.role}). Vínculo automático ao criar conta.`,
  });

  saveSaasDatabase(db);
  return { db, addedDirectly: false, emailSent: false };
}

export function updateMemberRoleInOrganization(
  db: SaasDatabaseSchema,
  actorUserId: string,
  organizationId: string,
  memberId: string,
  newRole: OrgRole,
): SaasDatabaseSchema {
  const actorRole = assertUserHasOrgRole(db, actorUserId, organizationId, 'admin');
  const target = db.members.find(
    (m) => m.id === memberId && m.organizationId === organizationId,
  );
  if (!target) {
    throw new Error('Membro não encontrado nesta organização.');
  }
  if (target.role === 'owner' && actorRole !== 'owner') {
    throw new Error('Somente um Owner pode alterar a função de outro Owner.');
  }
  if (newRole === 'owner' && actorRole !== 'owner') {
    throw new Error('Somente um Owner pode promover um membro a Owner.');
  }

  const ownersCount = db.members.filter(
    (m) => m.organizationId === organizationId && m.role === 'owner',
  ).length;
  if (target.role === 'owner' && newRole !== 'owner' && ownersCount <= 1) {
    throw new Error('A organização deve manter pelo menos um Owner ativo.');
  }

  db.members = db.members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m));
  appendAuditLog(db, {
    organizationId,
    actorUserId,
    action: 'member.role_updated',
    entityType: 'organization_member',
    entityId: memberId,
    details: `Função de ${target.email} alterada para "${newRole}".`,
  });

  saveSaasDatabase(db);
  return db;
}

export function removeMemberFromOrganization(
  db: SaasDatabaseSchema,
  actorUserId: string,
  organizationId: string,
  memberId: string,
): SaasDatabaseSchema {
  const actorRole = assertUserHasOrgRole(db, actorUserId, organizationId, 'admin');
  const target = db.members.find(
    (m) => m.id === memberId && m.organizationId === organizationId,
  );
  if (!target) {
    throw new Error('Membro não encontrado nesta organização.');
  }
  if (target.role === 'owner' && actorRole !== 'owner') {
    throw new Error('Somente um Owner pode remover outro Owner.');
  }

  const ownersCount = db.members.filter(
    (m) => m.organizationId === organizationId && m.role === 'owner',
  ).length;
  if (target.role === 'owner' && ownersCount <= 1) {
    throw new Error('Não é possível remover o único Owner da organização.');
  }

  db.members = db.members.filter((m) => m.id !== memberId);
  appendAuditLog(db, {
    organizationId,
    actorUserId,
    action: 'member.removed',
    entityType: 'organization_member',
    entityId: memberId,
    details: `Membro ${target.email} removido da organização.`,
  });

  saveSaasDatabase(db);
  return db;
}

// ============================================================================
// Migração Controlada e Idempotente do LocalStorage Legado (wattwise_state_v1)
// ============================================================================

export function getLegacyMigrationPreview(
  db: SaasDatabaseSchema,
  organizationId: string,
): LegacyMigrationPreview {
  const emptyPreview: LegacyMigrationPreview = {
    hasLegacyData: false,
    alreadyMigratedToCurrentOrg: db.migratedLegacyOrgs.includes(organizationId),
    equipmentCount: 0,
    recordsCount: 0,
    realEquipmentCount: 0,
    realRecordsCount: 0,
    demoEquipmentCount: 0,
    demoRecordsCount: 0,
    establishmentName: '',
    tariffPerKwh: 0.92,
    anomalyThresholdPercent: 20,
    sampleEquipment: [],
    sampleRecords: [],
  };

  try {
    if (typeof window === 'undefined' || !window.localStorage) return emptyPreview;
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return emptyPreview;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return emptyPreview;

    const rawEq = Array.isArray(parsed.equipment) ? parsed.equipment : [];
    const rawRec = Array.isArray(parsed.records) ? parsed.records : [];
    const rawSettings = (parsed.settings as Record<string, unknown>) ?? {};

    const sampleEquipment: Equipment[] = [];
    let demoEquipmentCount = 0;
    for (const item of rawEq) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const isDemo = Boolean(obj.isDemo);
      if (isDemo) demoEquipmentCount += 1;
      if (typeof obj.name === 'string' && typeof obj.powerWatts === 'number') {
        sampleEquipment.push({
          id: String(obj.id ?? generateId('eq')),
          name: obj.name,
          category: (obj.category as EquipmentCategory) ?? 'Outros',
          powerWatts: obj.powerWatts,
          status: isEquipmentStatus(obj.status) ? obj.status : 'active',
          isDemo,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const sampleRecords: ConsumptionRecord[] = [];
    let demoRecordsCount = 0;
    for (const item of rawRec) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const isDemo = Boolean(obj.isDemo);
      if (isDemo) demoRecordsCount += 1;
      if (typeof obj.date === 'string' && typeof obj.consumptionKwh === 'number') {
        sampleRecords.push({
          id: String(obj.id ?? generateId('rec')),
          date: obj.date,
          consumptionKwh: obj.consumptionKwh,
          note: typeof obj.note === 'string' ? obj.note : undefined,
          isDemo,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (sampleEquipment.length === 0 && sampleRecords.length === 0) {
      return emptyPreview;
    }

    return {
      hasLegacyData: true,
      alreadyMigratedToCurrentOrg: db.migratedLegacyOrgs.includes(organizationId),
      equipmentCount: sampleEquipment.length,
      recordsCount: sampleRecords.length,
      realEquipmentCount: sampleEquipment.length - demoEquipmentCount,
      realRecordsCount: sampleRecords.length - demoRecordsCount,
      demoEquipmentCount,
      demoRecordsCount,
      establishmentName:
        typeof rawSettings.establishmentName === 'string'
          ? rawSettings.establishmentName
          : 'Dados Locais',
      tariffPerKwh:
        typeof rawSettings.tariffPerKwh === 'number' ? rawSettings.tariffPerKwh : 0.92,
      anomalyThresholdPercent:
        typeof rawSettings.anomalyThresholdPercent === 'number'
          ? rawSettings.anomalyThresholdPercent
          : 20,
      sampleEquipment: sampleEquipment.slice(0, 5),
      sampleRecords: sampleRecords.slice(-5).reverse(),
    };
  } catch {
    return emptyPreview;
  }
}

export function migrateLegacyLocalStorageToOrganization(
  db: SaasDatabaseSchema,
  userId: string,
  organizationId: string,
  options: { includeSimulatedDemoItems: boolean },
): {
  db: SaasDatabaseSchema;
  importedEquipmentCount: number;
  importedRecordsCount: number;
  skippedDuplicateCount: number;
} {
  assertUserHasOrgRole(db, userId, organizationId, 'operator');

  const raw =
    typeof window !== 'undefined' ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null;
  if (!raw) {
    throw new Error('Nenhum dado legado encontrado no LocalStorage.');
  }

  window.localStorage.setItem(LEGACY_BACKUP_STORAGE_KEY, raw);

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const rawEq = Array.isArray(parsed.equipment) ? parsed.equipment : [];
  const rawRec = Array.isArray(parsed.records) ? parsed.records : [];

  const existingOrgEq = db.equipment.filter((e) => e.organizationId === organizationId);
  const existingOrgReadings = db.readings.filter((r) => r.organizationId === organizationId);

  let importedEquipmentCount = 0;
  let importedRecordsCount = 0;
  let skippedDuplicateCount = 0;
  const now = new Date().toISOString();

  for (const item of rawEq) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const isDemo = Boolean(obj.isDemo);
    if (isDemo && !options.includeSimulatedDemoItems) continue;

    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const powerWatts = typeof obj.powerWatts === 'number' ? Math.round(obj.powerWatts) : 0;
    if (!name || powerWatts <= 0) continue;

    const duplicate = existingOrgEq.some(
      (e) => e.name.toLowerCase() === name.toLowerCase() && e.powerWatts === powerWatts,
    );
    if (duplicate) {
      skippedDuplicateCount += 1;
      continue;
    }

    const migratedEq: Equipment = {
      id: generateId('eq'),
      organizationId,
      name,
      category: (obj.category as EquipmentCategory) ?? 'Outros',
      location: 'Importado LocalStorage',
      powerWatts,
      quantity: 1,
      dailyUsageHours: 8,
      status: isEquipmentStatus(obj.status) ? obj.status : 'active',
      notes: isDemo ? 'Item demonstrativo importado do navegador' : 'Importado do LocalStorage v1',
      isDemo,
      updatedAt: now,
    };

    db.equipment.push(migratedEq);
    existingOrgEq.push(migratedEq);
    importedEquipmentCount += 1;
  }

  for (const item of rawRec) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const isDemo = Boolean(obj.isDemo);
    if (isDemo && !options.includeSimulatedDemoItems) continue;

    const date = typeof obj.date === 'string' && isValidIsoDate(obj.date) ? obj.date : '';
    const kwh = typeof obj.consumptionKwh === 'number' ? obj.consumptionKwh : -1;
    if (!date || kwh < 0) continue;

    const duplicate = existingOrgReadings.some((r) => r.date === date && !r.equipmentId);
    if (duplicate) {
      skippedDuplicateCount += 1;
      continue;
    }

    const migratedRec: ConsumptionRecord = {
      id: generateId('rec'),
      organizationId,
      date,
      consumptionKwh: Math.round(kwh * 100) / 100,
      measurementType: isDemo ? 'simulated' : 'measured',
      source: 'local_migration',
      note: typeof obj.note === 'string' ? obj.note : undefined,
      isDemo,
      createdBy: userId,
      updatedAt: now,
    };

    db.readings.push(migratedRec);
    existingOrgReadings.push(migratedRec);
    importedRecordsCount += 1;
  }

  if (!db.migratedLegacyOrgs.includes(organizationId)) {
    db.migratedLegacyOrgs = [...db.migratedLegacyOrgs, organizationId];
  }

  appendAuditLog(db, {
    organizationId,
    actorUserId: userId,
    action: 'migration.localstorage_imported',
    entityType: 'organization',
    entityId: organizationId,
    details: `Migração concluída: ${importedEquipmentCount} equipamento(s) e ${importedRecordsCount} registro(s) importados (${skippedDuplicateCount} duplicado(s) ignorado(s)). Backup mantido em ${LEGACY_BACKUP_STORAGE_KEY}.`,
  });

  saveSaasDatabase(db);
  return {
    db,
    importedEquipmentCount,
    importedRecordsCount,
    skippedDuplicateCount,
  };
}
