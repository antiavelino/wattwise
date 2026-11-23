import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createDemoDataState } from '../data/demoData';
import { runEnergyAnalysis } from '../engine/analysisEngine';
import {
  completePasswordReset as authCompleteReset,
  requestPasswordResetOtp as authRequestOtp,
  verifyPasswordResetOtp as authVerifyOtp,
} from '../lib/authService';
import { isSupabaseConfigured, supabaseClient } from '../lib/supabase';
import {
  acknowledgeRemoteAlert,
  createRemoteOrganization,
  deleteRemoteEquipment,
  deleteRemoteReading,
  fetchRemoteOrganizationData,
  fetchRemoteUserOrganizations,
  fetchRemoteUserProfile,
  insertRemoteEquipment,
  insertRemoteReading,
  RemoteOrgBundle,
  RemoteUserOrg,
  updateRemoteEquipment,
  updateRemoteReading,
  updateRemoteSettings,
} from '../lib/supabaseService';
import { loadStateFromStorage, saveStateToStorage } from '../storage/localStorage';
import {
  createEquipmentInOrg,
  createOrganizationForUser,
  createReadingInOrg,
  deleteEquipmentInOrg,
  deleteReadingInOrg,
  getLegacyMigrationPreview,
  getOrganizationsForUser,
  inviteMemberToOrganization,
  loadSaasDatabase,
  loginUserAccount,
  logoutUserAccount,
  migrateLegacyLocalStorageToOrganization,
  queryOrganizationData,
  registerUserAccount,
  removeMemberFromOrganization,
  resetUserPassword,
  SaasDatabaseSchema,
  saveSaasDatabase,
  updateAlertStatusInOrg,
  updateEquipmentInOrg,
  updateMemberRoleInOrganization,
  updateOrganizationSettingsInOrg,
  updateReadingInOrg,
} from '../storage/saasRepository';
import {
  AlertStatus,
  AnalysisResult,
  AppDataState,
  AuditLogEntry,
  ConsumptionRecord,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  LegacyMigrationPreview,
  MeasurementType,
  NavSection,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrgRole,
  PeriodFilter,
  PublicPage,
  ReadingSource,
  ToastMessage,
  UserProfile,
} from '../types/energy';
import { generateId } from '../utils/formatters';

export type WorkspaceMode = 'public' | 'saas' | 'demo';

export interface EquipmentInput {
  name: string;
  category: EquipmentCategory;
  location?: string;
  powerWatts: number;
  quantity?: number;
  dailyUsageHours?: number;
  status: EquipmentStatus;
  notes?: string;
}

export interface RecordInput {
  date: string;
  consumptionKwh: number;
  equipmentId?: string;
  measurementType?: MeasurementType;
  source?: ReadingSource;
  meterPreviousKwh?: number;
  meterCurrentKwh?: number;
  note?: string;
}

export interface SettingsInput {
  establishmentName: string;
  tariffPerKwh: number;
  anomalyThresholdPercent: number;
  timezone?: string;
}

interface WattWiseContextValue {
  // Tema Visual
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Navegação e Modo
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  publicPage: PublicPage;
  navigatePublic: (page: PublicPage) => void;
  enterDemoSandbox: () => void;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  selectedEquipmentId: string | null;
  setSelectedEquipmentId: (id: string | null) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (filter: PeriodFilter) => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;

  // Sessão e Multi-tenant
  currentUser: UserProfile | null;
  userOrganizations: Array<{ organization: Organization; role: OrgRole }>;
  activeOrganization: Organization | null;
  activeRole: OrgRole;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  auditLogs: AuditLogEntry[];
  legacyMigrationPreview: LegacyMigrationPreview;

  // Dados Operacionais e Motor Analítico
  state: AppDataState;
  analysis: AnalysisResult;
  storageError: string | null;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;

  // Ações de Autenticação e Organizações
  registerAccount: (input: {
    fullName: string;
    email: string;
    password: string;
    organizationName?: string;
  }) => Promise<void> | void;
  loginAccount: (input: { email: string; password: string }) => Promise<void> | void;
  resetPassword: (input: { email: string; newPassword: string }) => void;
  requestPasswordResetOtp: (email: string) => Promise<{ ok: boolean; message: string; mockOtp?: string }>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<{ ok: boolean; message: string }>;
  completePasswordReset: (newPassword: string, email?: string) => Promise<{ ok: boolean; message: string }>;
  logoutAccount: () => Promise<void> | void;
  createOrganization: (input: {
    name: string;
    timezone?: string;
    tariffPerKwh?: number;
    anomalyThresholdPercent?: number;
  }) => Promise<void> | void;
  switchOrganization: (organizationId: string) => void;

  // Ações CRUD e Operacionais
  addEquipment: (input: EquipmentInput) => Promise<void> | void;
  updateEquipment: (id: string, input: EquipmentInput) => Promise<void> | void;
  toggleEquipmentStatus: (id: string) => Promise<void> | void;
  deleteEquipment: (id: string) => Promise<void> | void;
  addRecord: (input: RecordInput) => Promise<void> | void;
  updateRecord: (id: string, input: RecordInput) => Promise<void> | void;
  deleteRecord: (id: string) => Promise<void> | void;
  updateSettings: (input: SettingsInput) => Promise<void> | void;
  updateAlertStatus: (alertId: string, status: AlertStatus) => Promise<void> | void;

  // Equipe, Migração e Demonstração
  inviteMember: (input: { email: string; role: OrgRole }) => void;
  updateMemberRole: (memberId: string, role: OrgRole) => void;
  removeMember: (memberId: string) => void;
  migrateLegacyData: (options: { includeSimulatedDemoItems: boolean }) => void;
  restoreDemoData: () => void;
  clearOperationalData: () => void;
}

const WattWiseContext = createContext<WattWiseContextValue | null>(null);

export const WattWiseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('wattwise_theme');
        if (saved === 'light' || saved === 'dark') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }
      }
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('wattwise_theme', theme);
      }
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const initialDemoLoad = useMemo(() => loadStateFromStorage(), []);
  const [demoState, setDemoState] = useState<AppDataState>(initialDemoLoad.state);
  const [saasDb, setSaasDb] = useState<SaasDatabaseSchema>(() => loadSaasDatabase());

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('public');

  const [publicPage, setPublicPage] = useState<PublicPage>('home');

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  const [storageError, setStorageError] = useState<string | null>(
    initialDemoLoad.recoveredFromError ? (initialDemoLoad.errorMessage ?? null) : null,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4400);
    },
    [],
  );

  useEffect(() => {
    if (workspaceMode === 'demo') {
      const result = saveStateToStorage(demoState);
      if (!result.ok) {
        setStorageError(result.error ?? 'Erro ao salvar dados no LocalStorage.');
      } else {
        setStorageError(null);
      }
    }
  }, [demoState, workspaceMode]);

  // Estados para sincronização remota com Supabase Cloud
  const [remoteUser, setRemoteUser] = useState<UserProfile | null>(null);
  const [remoteOrgs, setRemoteOrgs] = useState<RemoteUserOrg[]>([]);
  const [remoteActiveOrgId, setRemoteActiveOrgId] = useState<string | null>(null);
  const [remoteBundle, setRemoteBundle] = useState<RemoteOrgBundle | null>(null);

  const refreshRemoteData = useCallback(async (orgId: string) => {
    try {
      const bundle = await fetchRemoteOrganizationData(orgId);
      setRemoteBundle(bundle);
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
      pushToast('error', 'Falha ao sincronizar dados', (err as Error).message);
    }
  }, [pushToast]);

  const syncRemoteSession = useCallback(async (authUser: { id: string; email?: string; user_metadata?: Record<string, any>; created_at?: string }) => {
    try {
      const prof = await fetchRemoteUserProfile(authUser.id);
      const userProfile: UserProfile = prof ?? {
        id: authUser.id,
        fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário WattWise',
        email: authUser.email || '',
        avatarUrl: authUser.user_metadata?.avatar_url,
        createdAt: authUser.created_at || new Date().toISOString(),
        updatedAt: authUser.created_at || new Date().toISOString(),
      };
      setRemoteUser(userProfile);
      const orgs = await fetchRemoteUserOrganizations(authUser.id);
      setRemoteOrgs(orgs);
      if (orgs.length > 0) {
        const defaultOrgId = orgs[0].organization.id;
        setRemoteActiveOrgId((prev) => (prev && orgs.some((o) => o.organization.id === prev) ? prev : defaultOrgId));
        setWorkspaceMode('saas');
      } else {
        setPublicPage('onboarding');
        setWorkspaceMode('public');
      }
    } catch (err) {
      console.error('Erro ao sincronizar sessão remota:', err);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseClient) return;

    // Carrega sessão inicial existente
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncRemoteSession(session.user);
      }
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncRemoteSession(session.user);
      } else {
        setRemoteUser(null);
        setRemoteOrgs([]);
        setRemoteActiveOrgId(null);
        setRemoteBundle(null);
        setWorkspaceMode('public');
        setPublicPage('home');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncRemoteSession]);

  useEffect(() => {
    if (isSupabaseConfigured && remoteActiveOrgId && workspaceMode === 'saas') {
      refreshRemoteData(remoteActiveOrgId);
    }
  }, [isSupabaseConfigured, remoteActiveOrgId, workspaceMode, refreshRemoteData]);

  const currentUser = useMemo<UserProfile | null>(() => {
    if (isSupabaseConfigured) {
      return remoteUser;
    }
    if (!saasDb.currentSessionUserId) return null;
    const found = saasDb.users.find((u) => u.profile.id === saasDb.currentSessionUserId);
    return found ? found.profile : null;
  }, [saasDb, remoteUser]);

  const userOrganizations = useMemo(() => {
    if (isSupabaseConfigured) {
      return remoteOrgs;
    }
    if (!currentUser) return [];
    return getOrganizationsForUser(saasDb, currentUser.id);
  }, [currentUser, remoteOrgs, saasDb]);

  const activeOrganizationId = useMemo<string | null>(() => {
    if (isSupabaseConfigured) {
      return remoteActiveOrgId;
    }
    if (!currentUser || userOrganizations.length === 0) return null;
    const preferred = saasDb.activeOrganizationByUser[currentUser.id];
    if (preferred && userOrganizations.some((o) => o.organization.id === preferred)) {
      return preferred;
    }
    return userOrganizations[0]?.organization.id ?? null;
  }, [currentUser, userOrganizations, saasDb.activeOrganizationByUser, remoteActiveOrgId]);

  const orgBundle = useMemo(() => {
    if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return null;
    if (isSupabaseConfigured) return null;
    try {
      return queryOrganizationData(saasDb, currentUser.id, activeOrganizationId);
    } catch {
      return null;
    }
  }, [workspaceMode, saasDb, currentUser, activeOrganizationId]);

  const activeState = useMemo<AppDataState>(() => {
    if (workspaceMode === 'saas') {
      if (isSupabaseConfigured && remoteBundle) {
        return {
          version: 2,
          equipment: remoteBundle.equipment,
          records: remoteBundle.readings,
          settings: remoteBundle.settings,
          alertStates: remoteBundle.alertStates,
        };
      }
      if (!isSupabaseConfigured && orgBundle) {
        return {
          version: 2,
          equipment: orgBundle.equipment,
          records: orgBundle.readings,
          settings: orgBundle.settings,
          alertStates: orgBundle.alertStates,
        };
      }
    }
    return demoState;
  }, [workspaceMode, remoteBundle, orgBundle, demoState]);

  const filteredRecords = useMemo(() => {
    const sorted = [...activeState.records].sort((a, b) => a.date.localeCompare(b.date));
    if (periodFilter === '7d') return sorted.slice(-7);
    if (periodFilter === '30d') return sorted.slice(-30);
    if (periodFilter === '90d') return sorted.slice(-90);
    if (periodFilter === 'custom') {
      return sorted.filter((r) => {
        if (customDateRange.start && r.date < customDateRange.start) return false;
        if (customDateRange.end && r.date > customDateRange.end) return false;
        return true;
      });
    }
    return sorted;
  }, [activeState.records, periodFilter, customDateRange]);

  const analysis = useMemo(
    () =>
      runEnergyAnalysis(
        activeState.equipment,
        filteredRecords,
        activeState.settings,
        activeState.alertStates ?? {},
      ),
    [activeState.equipment, filteredRecords, activeState.settings, activeState.alertStates],
  );

  const legacyMigrationPreview = useMemo<LegacyMigrationPreview>(() => {
    if (!activeOrganizationId) {
      return {
        hasLegacyData: false,
        alreadyMigratedToCurrentOrg: false,
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
    }
    return getLegacyMigrationPreview(saasDb, activeOrganizationId);
  }, [saasDb, activeOrganizationId]);

  const navigatePublic = useCallback((page: PublicPage) => {
    const authPages = ['login', 'register', 'forgot-password', 'verify-otp', 'reset-password', 'onboarding'];
    if (authPages.includes(page)) {
      setWorkspaceMode('demo');
      setActiveSection('dashboard');
      setSelectedEquipmentId(null);
      return;
    }
    setPublicPage(page);
    setWorkspaceMode('public');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const enterDemoSandbox = useCallback(() => {
    setWorkspaceMode('demo');
    setActiveSection('dashboard');
    setSelectedEquipmentId(null);
    pushToast(
      'info',
      'Modo Demonstração ativo',
      'Explore livremente o cenário simulado (sem necessidade de login ou conexão remota).',
    );
  }, [pushToast]);

  // ==========================================================================
  // Autenticação & Organizações
  // ==========================================================================

  const registerAccount = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      organizationName?: string;
    }) => {
      if (isSupabaseConfigured && supabaseClient) {
        const { data, error } = await supabaseClient.auth.signUp({
          email: input.email.trim().toLowerCase(),
          password: input.password,
          options: {
            data: {
              full_name: input.fullName.trim(),
            },
          },
        });
        if (error) {
          pushToast('error', 'Falha no cadastro', error.message);
          throw error;
        }
        if (!data.session) {
          pushToast(
            'info',
            'Confirmação enviada',
            'Verifique sua caixa de entrada para confirmar seu e-mail antes de acessar.',
          );
          setPublicPage('login');
          return;
        }
        if (input.organizationName) {
          try {
            const newOrgId = await createRemoteOrganization(input.organizationName);
            setRemoteActiveOrgId(newOrgId);
          } catch (orgErr) {
            console.warn('Erro ao criar organização inicial:', orgErr);
          }
        }
        if (data.user) {
          await syncRemoteSession(data.user);
        }
        setWorkspaceMode('saas');
        setActiveSection('dashboard');
        pushToast('success', 'Conta criada no Supabase Cloud', `Bem-vindo ao WattWise, ${input.fullName}!`);
        return;
      }

      try {
        const result = registerUserAccount(saasDb, { ...input });
        setSaasDb({ ...result.db });
        if (result.organization) {
          setWorkspaceMode('saas');
          setActiveSection('dashboard');
          pushToast(
            'success',
            'Conta e organização criadas',
            `Bem-vindo ao WattWise, ${result.user.fullName}!`,
          );
        } else {
          const joinedOrgs = getOrganizationsForUser(result.db, result.user.id);
          if (joinedOrgs.length > 0) {
            setWorkspaceMode('saas');
            setActiveSection('dashboard');
            pushToast('success', 'Conta criada', `Você ingressou em ${joinedOrgs[0].organization.name}.`);
          } else {
            setPublicPage('onboarding');
            setWorkspaceMode('public');
            pushToast('success', 'Conta criada com sucesso', 'Configure sua primeira organização para continuar.');
          }
        }
      } catch (err) {
        pushToast('error', 'Não foi possível criar a conta', (err as Error).message);
        throw err;
      }
    },
    [saasDb, syncRemoteSession, pushToast],
  );

  const loginAccount = useCallback(
    async (input: { email: string; password: string }) => {
      if (isSupabaseConfigured && supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        });
        if (error) {
          pushToast('error', 'Falha na autenticação', error.message);
          throw error;
        }
        if (data.user) {
          await syncRemoteSession(data.user);
        }
        pushToast('success', 'Sessão iniciada via Supabase Cloud', 'Bem-vindo de volta!');
        return;
      }

      try {
        const result = loginUserAccount(saasDb, input);
        setSaasDb({ ...result.db });
        const orgs = getOrganizationsForUser(result.db, result.user.id);
        if (orgs.length === 0) {
          setPublicPage('onboarding');
          setWorkspaceMode('public');
        } else {
          setWorkspaceMode('saas');
          setActiveSection('dashboard');
        }
        pushToast('success', 'Sessão iniciada', `Bem-vindo de volta, ${result.user.fullName}.`);
      } catch (err) {
        pushToast('error', 'Falha na autenticação', (err as Error).message);
        throw err;
      }
    },
    [saasDb, syncRemoteSession, pushToast],
  );

  const resetPassword = useCallback(
    (input: { email: string; newPassword: string }) => {
      try {
        const nextDb = resetUserPassword(saasDb, input);
        setSaasDb({ ...nextDb });
        setPublicPage('login');
        pushToast('success', 'Senha redefinida', 'Você já pode entrar com sua nova senha.');
      } catch (err) {
        pushToast('error', 'Erro ao redefinir senha', (err as Error).message);
        throw err;
      }
    },
    [saasDb, pushToast],
  );

  const requestPasswordResetOtp = useCallback(
    async (email: string) => {
      try {
        const result = await authRequestOtp(email);
        setSaasDb(loadSaasDatabase());
        if (result.mockOtp) {
          pushToast(
            'info',
            'Código OTP gerado (Ambiente Local)',
            `Código para testes: ${result.mockOtp} (válido por 15 min).`,
          );
        } else {
          pushToast(
            'success',
            'Código enviado',
            'Verifique sua caixa de entrada para obter o código de 6 dígitos.',
          );
        }
        return result;
      } catch (err) {
        pushToast('error', 'Falha ao solicitar código', (err as Error).message);
        throw err;
      }
    },
    [pushToast],
  );

  const verifyPasswordResetOtp = useCallback(
    async (email: string, otp: string) => {
      try {
        const result = await authVerifyOtp(email, otp);
        setSaasDb(loadSaasDatabase());
        pushToast('success', 'Código validado', 'Insira sua nova senha para concluir a recuperação.');
        return result;
      } catch (err) {
        pushToast('error', 'Código inválido', (err as Error).message);
        throw err;
      }
    },
    [pushToast],
  );

  const completePasswordReset = useCallback(
    async (newPassword: string, email?: string) => {
      try {
        const result = await authCompleteReset(newPassword, email);
        setSaasDb(loadSaasDatabase());
        setPublicPage('login');
        pushToast('success', 'Senha redefinida com sucesso', 'Você já pode entrar com sua nova senha.');
        return result;
      } catch (err) {
        pushToast('error', 'Erro ao atualizar senha', (err as Error).message);
        throw err;
      }
    },
    [pushToast],
  );

  const logoutAccount = useCallback(async () => {
    if (isSupabaseConfigured && supabaseClient) {
      await supabaseClient.auth.signOut();
      setRemoteUser(null);
      setRemoteOrgs([]);
      setRemoteActiveOrgId(null);
      setRemoteBundle(null);
      setWorkspaceMode('public');
      setPublicPage('home');
      setSelectedEquipmentId(null);
      pushToast('info', 'Sessão encerrada', 'Você saiu da sua conta com segurança.');
      return;
    }
    const nextDb = logoutUserAccount(saasDb);
    setSaasDb({ ...nextDb });
    setWorkspaceMode('public');
    setPublicPage('home');
    setSelectedEquipmentId(null);
    pushToast('info', 'Sessão encerrada', 'Você saiu da sua conta com segurança.');
  }, [saasDb, pushToast]);

  const createOrganization = useCallback(
    async (input: {
      name: string;
      timezone?: string;
      tariffPerKwh?: number;
      anomalyThresholdPercent?: number;
    }) => {
      if (!currentUser) {
        pushToast('error', 'Sessão inválida', 'Faça login para criar uma organização.');
        return;
      }

      if (isSupabaseConfigured) {
        try {
          const newOrgId = await createRemoteOrganization(input.name, undefined, input.timezone);
          const orgs = await fetchRemoteUserOrganizations(currentUser.id);
          setRemoteOrgs(orgs);
          setRemoteActiveOrgId(newOrgId);
          setWorkspaceMode('saas');
          setActiveSection('dashboard');
          pushToast(
            'success',
            'Organização configurada no Supabase',
            `Ambiente de "${input.name}" provisionado no PostgreSQL.`,
          );
        } catch (err) {
          pushToast('error', 'Erro ao criar organização', (err as Error).message);
          throw err;
        }
        return;
      }

      try {
        const cloned = structuredClone(saasDb);
        const result = createOrganizationForUser(cloned, currentUser.id, input);
        setSaasDb({ ...result.db });
        setWorkspaceMode('saas');
        setActiveSection('dashboard');
        pushToast(
          'success',
          'Organização configurada',
          `Ambiente isolado de "${result.organization.name}" pronto para uso.`,
        );
      } catch (err) {
        pushToast('error', 'Erro ao criar organização', (err as Error).message);
        throw err;
      }
    },
    [currentUser, saasDb, pushToast],
  );

  const switchOrganization = useCallback(
    (organizationId: string) => {
      if (isSupabaseConfigured) {
        setRemoteActiveOrgId(organizationId);
        setSelectedEquipmentId(null);
        return;
      }
      if (!currentUser) return;
      const target = userOrganizations.find((o) => o.organization.id === organizationId);
      if (!target) {
        pushToast('error', 'Acesso negado', 'Você não pertence a esta organização.');
        return;
      }
      const nextDb: SaasDatabaseSchema = {
        ...saasDb,
        activeOrganizationByUser: {
          ...saasDb.activeOrganizationByUser,
          [currentUser.id]: organizationId,
        },
      };
      saveSaasDatabase(nextDb);
      setSaasDb(nextDb);
      setSelectedEquipmentId(null);
      pushToast(
        'info',
        'Organização alternada',
        `Ambiente ativo: ${target.organization.name} (${target.role.toUpperCase()}).`,
      );
    },
    [currentUser, userOrganizations, saasDb, pushToast],
  );

  // ==========================================================================
  // Operações CRUD (Supabase Cloud vs Local Multi-Tenant vs Sandbox Demo)
  // ==========================================================================

  const addEquipment = useCallback(
    async (input: EquipmentInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            const inserted = await insertRemoteEquipment(activeOrganizationId, input);
            setRemoteBundle((prev) =>
              prev ? { ...prev, equipment: [inserted, ...prev.equipment] } : null,
            );
            pushToast(
              'success',
              'Equipamento cadastrado no Supabase',
              `"${inserted.name}" salvo no PostgreSQL remoto.`,
            );
          } catch (err) {
            pushToast('error', 'Falha ao salvar equipamento', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const result = createEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, input);
          setSaasDb({ ...result.db });
          pushToast(
            'success',
            'Equipamento cadastrado',
            `"${result.equipment.name}" adicionado à organização.`,
          );
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      const newEquipment: Equipment = {
        id: generateId('eq'),
        name: input.name.trim(),
        category: input.category,
        location: input.location?.trim() || 'Principal',
        powerWatts: input.powerWatts,
        quantity: input.quantity ?? 1,
        dailyUsageHours: input.dailyUsageHours ?? 8,
        status: input.status,
        notes: input.notes?.trim() || undefined,
        isDemo: false,
        updatedAt: new Date().toISOString(),
      };
      setDemoState((prev) => ({
        ...prev,
        equipment: [newEquipment, ...prev.equipment],
      }));
      pushToast('success', 'Equipamento cadastrado', `"${newEquipment.name}" foi adicionado ao inventário.`);
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const updateEquipment = useCallback(
    async (id: string, input: EquipmentInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            const updated = await updateRemoteEquipment(activeOrganizationId, id, input);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    equipment: prev.equipment.map((e) => (e.id === id ? updated : e)),
                  }
                : null,
            );
            pushToast('success', 'Equipamento atualizado no Supabase', `"${input.name.trim()}" salvo com sucesso.`);
          } catch (err) {
            pushToast('error', 'Falha ao atualizar equipamento', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = updateEquipmentInOrg(
            cloned,
            currentUser.id,
            activeOrganizationId,
            id,
            input,
          );
          setSaasDb({ ...nextDb });
          pushToast('success', 'Equipamento atualizado', `"${input.name.trim()}" salvo com sucesso.`);
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((item) =>
          item.id === id
            ? {
                ...item,
                name: input.name.trim(),
                category: input.category,
                location: input.location?.trim() || item.location || 'Principal',
                powerWatts: input.powerWatts,
                quantity: input.quantity ?? item.quantity ?? 1,
                dailyUsageHours: input.dailyUsageHours ?? item.dailyUsageHours ?? 8,
                status: input.status,
                notes: input.notes?.trim() || undefined,
                isDemo: false,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      }));
      pushToast('success', 'Equipamento atualizado', `"${input.name.trim()}" foi salvo com sucesso.`);
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const toggleEquipmentStatus = useCallback(
    async (id: string) => {
      const target = activeState.equipment.find((e) => e.id === id);
      if (!target) return;
      const nextStatus: EquipmentStatus = target.status === 'active' ? 'inactive' : 'active';

      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            const updated = await updateRemoteEquipment(activeOrganizationId, id, {
              name: target.name,
              category: target.category,
              location: target.location,
              powerWatts: target.powerWatts,
              quantity: target.quantity,
              dailyUsageHours: target.dailyUsageHours,
              status: nextStatus,
              notes: target.notes,
            });
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    equipment: prev.equipment.map((e) => (e.id === id ? updated : e)),
                  }
                : null,
            );
            pushToast(
              'info',
              nextStatus === 'active' ? 'Equipamento ativado' : 'Equipamento desativado',
              `"${target.name}" agora está ${nextStatus === 'active' ? 'ativo' : 'inativo'}.`,
            );
          } catch (err) {
            pushToast('error', 'Falha ao alternar status', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = updateEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, id, {
            name: target.name,
            category: target.category,
            location: target.location,
            powerWatts: target.powerWatts,
            quantity: target.quantity,
            dailyUsageHours: target.dailyUsageHours,
            status: nextStatus,
            notes: target.notes,
          });
          setSaasDb({ ...nextDb });
          pushToast(
            'info',
            nextStatus === 'active' ? 'Equipamento ativado' : 'Equipamento desativado',
            `"${target.name}" agora está ${nextStatus === 'active' ? 'ativo' : 'inativo'}.`,
          );
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((item) =>
          item.id === id
            ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
            : item,
        ),
      }));
      pushToast(
        'info',
        nextStatus === 'active' ? 'Equipamento ativado' : 'Equipamento desativado',
        `"${target.name}" agora está ${nextStatus === 'active' ? 'ativo' : 'inativo'} na potência instalada.`,
      );
    },
    [activeState.equipment, workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const deleteEquipment = useCallback(
    async (id: string) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            await deleteRemoteEquipment(activeOrganizationId, id);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    equipment: prev.equipment.filter((e) => e.id !== id),
                  }
                : null,
            );
            if (selectedEquipmentId === id) setSelectedEquipmentId(null);
            pushToast('info', 'Equipamento excluído no Supabase', 'Item removido do PostgreSQL.');
          } catch (err) {
            pushToast('error', 'Falha ao excluir equipamento', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = deleteEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, id);
          setSaasDb({ ...nextDb });
          if (selectedEquipmentId === id) setSelectedEquipmentId(null);
          pushToast('info', 'Equipamento excluído', 'Item removido do inventário da organização.');
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      let deletedName = '';
      setDemoState((prev) => {
        const target = prev.equipment.find((item) => item.id === id);
        if (target) deletedName = target.name;
        return {
          ...prev,
          equipment: prev.equipment.filter((item) => item.id !== id),
        };
      });
      if (selectedEquipmentId === id) setSelectedEquipmentId(null);
      pushToast(
        'info',
        'Equipamento excluído',
        deletedName ? `"${deletedName}" foi removido do inventário.` : 'Item removido.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, selectedEquipmentId, pushToast],
  );

  const addRecord = useCallback(
    async (input: RecordInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            const inserted = await insertRemoteReading(activeOrganizationId, input);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    readings: [...prev.readings, inserted].sort((a, b) => a.date.localeCompare(b.date)),
                  }
                : null,
            );
            pushToast(
              'success',
              'Medição registrada no Supabase',
              `Lançamento de ${inserted.consumptionKwh.toLocaleString('pt-BR')} kWh gravado no PostgreSQL remoto.`,
            );
          } catch (err) {
            pushToast('error', 'Falha ao registrar consumo', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const result = createReadingInOrg(cloned, currentUser.id, activeOrganizationId, input);
          setSaasDb({ ...result.db });
          pushToast(
            'success',
            'Medição registrada',
            `Lançamento de ${result.reading.consumptionKwh.toLocaleString('pt-BR')} kWh salvo.`,
          );
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      const mType: MeasurementType = input.measurementType ?? 'measured';
      const newRecord: ConsumptionRecord = {
        id: generateId('rec'),
        date: input.date,
        consumptionKwh: input.consumptionKwh,
        equipmentId: input.equipmentId || undefined,
        measurementType: mType,
        source: input.source ?? 'manual',
        meterPreviousKwh: input.meterPreviousKwh,
        meterCurrentKwh: input.meterCurrentKwh,
        note: input.note?.trim() ? input.note.trim() : undefined,
        isDemo: mType === 'simulated',
        updatedAt: new Date().toISOString(),
      };
      setDemoState((prev) => ({
        ...prev,
        records: [...prev.records, newRecord],
      }));
      pushToast(
        'success',
        'Consumo registrado',
        `Lançamento de ${input.consumptionKwh.toLocaleString('pt-BR')} kWh salvo.`,
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const updateRecord = useCallback(
    async (id: string, input: RecordInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            const updated = await updateRemoteReading(activeOrganizationId, id, input);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    readings: prev.readings
                      .map((r) => (r.id === id ? updated : r))
                      .sort((a, b) => a.date.localeCompare(b.date)),
                  }
                : null,
            );
            pushToast('success', 'Registro atualizado no Supabase', 'Leitura persistida no PostgreSQL remoto.');
          } catch (err) {
            pushToast('error', 'Falha ao atualizar leitura', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = updateReadingInOrg(cloned, currentUser.id, activeOrganizationId, id, input);
          setSaasDb({ ...nextDb });
          pushToast('success', 'Registro atualizado', 'Os indicadores foram recalculados.');
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        records: prev.records.map((item) =>
          item.id === id
            ? {
                ...item,
                date: input.date,
                consumptionKwh: input.consumptionKwh,
                equipmentId: input.equipmentId || undefined,
                measurementType: input.measurementType ?? item.measurementType ?? 'measured',
                note: input.note?.trim() ? input.note.trim() : undefined,
                isDemo: (input.measurementType ?? item.measurementType) === 'simulated',
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      }));
      pushToast(
        'success',
        'Registro atualizado',
        'Os indicadores e alertas foram recalculados automaticamente.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            await deleteRemoteReading(activeOrganizationId, id);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    readings: prev.readings.filter((r) => r.id !== id),
                  }
                : null,
            );
            pushToast('info', 'Registro excluído no Supabase', 'Leitura removida do PostgreSQL remoto.');
          } catch (err) {
            pushToast('error', 'Falha ao excluir leitura', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = deleteReadingInOrg(cloned, currentUser.id, activeOrganizationId, id);
          setSaasDb({ ...nextDb });
          pushToast('info', 'Registro excluído', 'O histórico da organização foi recalculado.');
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        records: prev.records.filter((item) => item.id !== id),
      }));
      pushToast('info', 'Registro excluído', 'O histórico e a previsão mensal foram recalculados.');
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const updateSettings = useCallback(
    async (input: SettingsInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            await updateRemoteSettings(activeOrganizationId, input);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    settings: {
                      ...prev.settings,
                      establishmentName: input.establishmentName.trim() || prev.settings.establishmentName,
                      tariffPerKwh: input.tariffPerKwh,
                      anomalyThresholdPercent: input.anomalyThresholdPercent,
                      timezone: input.timezone || prev.settings.timezone,
                    },
                  }
                : null,
            );
            pushToast('success', 'Configurações salvas no Supabase', 'Parâmetros atualizados no PostgreSQL.');
          } catch (err) {
            pushToast('error', 'Falha ao salvar configurações', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = updateOrganizationSettingsInOrg(
            cloned,
            currentUser.id,
            activeOrganizationId,
            input,
          );
          setSaasDb({ ...nextDb });
          pushToast('success', 'Configurações salvas', 'Parâmetros da organização atualizados.');
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          establishmentName: input.establishmentName.trim(),
          tariffPerKwh: input.tariffPerKwh,
          anomalyThresholdPercent: input.anomalyThresholdPercent,
          timezone: input.timezone ?? prev.settings.timezone,
          isDemoProfile: false,
        },
      }));
      pushToast('success', 'Configurações salvas', 'Custos estimados e regras de alerta atualizados.');
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const updateAlertStatus = useCallback(
    async (alertId: string, status: AlertStatus) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          try {
            await acknowledgeRemoteAlert(activeOrganizationId, alertId, status, currentUser.id);
            setRemoteBundle((prev) =>
              prev
                ? {
                    ...prev,
                    alertStates: {
                      ...prev.alertStates,
                      [alertId]: {
                        status,
                        acknowledgedBy: currentUser.id,
                        acknowledgedAt: new Date().toISOString(),
                      },
                    },
                  }
                : null,
            );
            pushToast(
              'success',
              status === 'acknowledged'
                ? 'Alerta reconhecido no Supabase'
                : status === 'resolved'
                  ? 'Alerta resolvido no Supabase'
                  : 'Alerta reaberto no Supabase',
              'Status operacional sincronizado com o PostgreSQL.',
            );
          } catch (err) {
            pushToast('error', 'Falha ao atualizar alerta', (err as Error).message);
          }
          return;
        }

        try {
          const cloned = structuredClone(saasDb);
          const nextDb = updateAlertStatusInOrg(
            cloned,
            currentUser.id,
            activeOrganizationId,
            alertId,
            status,
          );
          setSaasDb({ ...nextDb });
          pushToast(
            'success',
            status === 'acknowledged' ? 'Alerta reconhecido' : status === 'resolved' ? 'Alerta resolvido' : 'Alerta reaberto',
            'O status operacional do alerta foi registrado.',
          );
        } catch (err) {
          pushToast('error', 'Operação recusada', (err as Error).message);
        }
        return;
      }

      setDemoState((prev) => ({
        ...prev,
        alertStates: {
          ...(prev.alertStates ?? {}),
          [alertId]: {
            status,
            acknowledgedBy: 'Visitante Demo',
            acknowledgedAt: new Date().toISOString(),
          },
        },
      }));
      pushToast(
        'success',
        status === 'acknowledged' ? 'Alerta reconhecido' : status === 'resolved' ? 'Alerta resolvido' : 'Alerta reaberto',
        'Status atualizado no ambiente demonstrativo.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  // ==========================================================================
  // Equipe, Migração e Demonstração
  // ==========================================================================

  const inviteMember = useCallback(
    (input: { email: string; role: OrgRole }) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) {
        pushToast('info', 'Disponível em conta autenticada', 'Crie uma conta e organização para gerenciar membros.');
        return;
      }
      try {
        const cloned = structuredClone(saasDb);
        const result = inviteMemberToOrganization(cloned, currentUser.id, activeOrganizationId, input);
        setSaasDb({ ...result.db });
        pushToast(
          'success',
          result.addedDirectly ? 'Membro adicionado à equipe' : 'Convite registrado',
          result.addedDirectly
            ? `${input.email} foi vinculado diretamente à organização.`
            : `Convite pendente criado para ${input.email} (vínculo automático ao se cadastrar).`,
        );
      } catch (err) {
        pushToast('error', 'Não foi possível convidar membro', (err as Error).message);
      }
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const updateMemberRole = useCallback(
    (memberId: string, role: OrgRole) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      try {
        const cloned = structuredClone(saasDb);
        const nextDb = updateMemberRoleInOrganization(
          cloned,
          currentUser.id,
          activeOrganizationId,
          memberId,
          role,
        );
        setSaasDb({ ...nextDb });
        pushToast('success', 'Permissão atualizada', `Função alterada para ${role.toUpperCase()}.`);
      } catch (err) {
        pushToast('error', 'Operação recusada', (err as Error).message);
      }
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      try {
        const cloned = structuredClone(saasDb);
        const nextDb = removeMemberFromOrganization(
          cloned,
          currentUser.id,
          activeOrganizationId,
          memberId,
        );
        setSaasDb({ ...nextDb });
        pushToast('info', 'Membro removido', 'O acesso do usuário a esta organização foi revogado.');
      } catch (err) {
        pushToast('error', 'Operação recusada', (err as Error).message);
      }
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const migrateLegacyData = useCallback(
    (options: { includeSimulatedDemoItems: boolean }) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      try {
        const cloned = structuredClone(saasDb);
        const result = migrateLegacyLocalStorageToOrganization(
          cloned,
          currentUser.id,
          activeOrganizationId,
          options,
        );
        setSaasDb({ ...result.db });
        pushToast(
          'success',
          'Migração concluída com sucesso',
          `${result.importedEquipmentCount} equipamento(s) e ${result.importedRecordsCount} registro(s) importados (${result.skippedDuplicateCount} duplicado(s) ignorado(s)).`,
        );
      } catch (err) {
        pushToast('error', 'Falha na migração', (err as Error).message);
      }
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast],
  );

  const restoreDemoData = useCallback(() => {
    const freshDemo = createDemoDataState();
    setDemoState(freshDemo);
    if (workspaceMode !== 'demo') {
      setWorkspaceMode('demo');
    }
    pushToast(
      'success',
      'Ambiente demonstrativo restaurado',
      '16 dias de histórico, 8 equipamentos e 2 anomalias simuladas foram recarregados.',
    );
  }, [workspaceMode, pushToast]);

  const clearOperationalData = useCallback(() => {
    if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
      try {
        const cloned = structuredClone(saasDb);
        cloned.equipment = cloned.equipment.filter((e) => e.organizationId !== activeOrganizationId);
        cloned.readings = cloned.readings.filter((r) => r.organizationId !== activeOrganizationId);
        saveSaasDatabase(cloned);
        setSaasDb(cloned);
        pushToast('info', 'Dados da organização limpos', 'Equipamentos e medições da organização foram removidos.');
      } catch (err) {
        pushToast('error', 'Operação recusada', (err as Error).message);
      }
      return;
    }

    setDemoState((prev) => ({
      ...prev,
      equipment: [],
      records: [],
      settings: {
        ...prev.settings,
        isDemoProfile: false,
      },
    }));
    pushToast(
      'info',
      'Registros e equipamentos limpos',
      'Você pode cadastrar dados agora ou restaurar o ambiente demonstrativo quando quiser.',
    );
  }, [workspaceMode, currentUser, activeOrganizationId, saasDb, pushToast]);

  const value = useMemo<WattWiseContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      workspaceMode,
      setWorkspaceMode,
      publicPage,
      navigatePublic,
      enterDemoSandbox,
      activeSection,
      setActiveSection,
      selectedEquipmentId,
      setSelectedEquipmentId,
      periodFilter,
      setPeriodFilter,
      customDateRange,
      setCustomDateRange,
      currentUser,
      userOrganizations,
      activeOrganization: isSupabaseConfigured
        ? (userOrganizations.find((o) => o.organization.id === activeOrganizationId)?.organization ?? null)
        : (orgBundle?.organization ?? null),
      activeRole: isSupabaseConfigured
        ? (userOrganizations.find((o) => o.organization.id === activeOrganizationId)?.role ?? 'owner')
        : (orgBundle?.role ?? 'owner'),
      members: orgBundle?.members ?? [],
      invitations: orgBundle?.invitations ?? [],
      auditLogs: orgBundle?.auditLogs ?? [],
      legacyMigrationPreview,
      state: activeState,
      analysis,
      storageError,
      toasts,
      pushToast,
      dismissToast,
      registerAccount,
      loginAccount,
      resetPassword,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      completePasswordReset,
      logoutAccount,
      createOrganization,
      switchOrganization,
      addEquipment,
      updateEquipment,
      toggleEquipmentStatus,
      deleteEquipment,
      addRecord,
      updateRecord,
      deleteRecord,
      updateSettings,
      updateAlertStatus,
      inviteMember,
      updateMemberRole,
      removeMember,
      migrateLegacyData,
      restoreDemoData,
      clearOperationalData,
    }),
    [
      theme,
      toggleTheme,
      setTheme,
      workspaceMode,
      publicPage,
      navigatePublic,
      enterDemoSandbox,
      activeSection,
      selectedEquipmentId,
      periodFilter,
      customDateRange,
      currentUser,
      userOrganizations,
      orgBundle,
      legacyMigrationPreview,
      activeState,
      analysis,
      storageError,
      toasts,
      pushToast,
      dismissToast,
      registerAccount,
      loginAccount,
      resetPassword,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      completePasswordReset,
      logoutAccount,
      createOrganization,
      switchOrganization,
      addEquipment,
      updateEquipment,
      toggleEquipmentStatus,
      deleteEquipment,
      addRecord,
      updateRecord,
      deleteRecord,
      updateSettings,
      updateAlertStatus,
      inviteMember,
      updateMemberRole,
      removeMember,
      migrateLegacyData,
      restoreDemoData,
      clearOperationalData,
    ],
  );

  return <WattWiseContext.Provider value={value}>{children}</WattWiseContext.Provider>;
};

export function useWattWise(): WattWiseContextValue {
  const ctx = useContext(WattWiseContext);
  if (!ctx) {
    throw new Error('useWattWise deve ser usado dentro de WattWiseProvider.');
  }
  return ctx;
}
