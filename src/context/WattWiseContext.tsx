import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_SCENARIOS } from '../data/demoData';
import { runEnergyAnalysis } from '../engine/analysisEngine';
import {
  completePasswordReset as authCompleteReset,
  requestPasswordResetOtp as authRequestOtp,
  verifyPasswordResetOtp as authVerifyOtp,
} from '../lib/authService';
import { isSupabaseConfigured, supabaseClient } from '../lib/supabase';
import {
  acknowledgeRemoteAlert,
  deleteRemoteEquipment,
  deleteRemoteReading,
  fetchRemoteOrganizationData,
  insertRemoteEquipment,
  insertRemoteReading,
  RemoteOrgBundle,
  RemoteUserOrg,
  updateRemoteEquipment,
  updateRemoteReading,
  updateRemoteSettings,
} from '../lib/supabaseService';
import {
  loadActiveScenarioIdFromStorage,
  loadScenarioStateFromStorage,
  restoreScenarioInStorage,
  saveActiveScenarioIdToStorage,
  saveScenarioStateToStorage,
} from '../storage/localStorage';
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
  DemoScenarioId,
  DemoScenarioMeta,
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
  manufacturer?: string;
  model?: string;
  category: EquipmentCategory;
  location?: string;
  powerWatts: number;
  quantity?: number;
  dailyUsageHours?: number;
  usageFactor?: number;
  status: EquipmentStatus;
  technicalSource?: string;
  sourceUrl?: string;
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
  establishmentDescription?: string;
  tariffPerKwh: number;
  referenceLocation?: string;
  consumerClass?: string;
  tariffSource?: string;
  tariffReferenceDate?: string;
  tariffTaxNote?: string;
  anomalyThresholdPercent: number;
  timezone?: string;
}

export const SECTION_TO_PATH: Record<NavSection, string> = {
  dashboard: '/dashboard',
  demos: '/demonstracoes',
  equipment: '/equipamentos',
  records: '/registros',
  analysis: '/analises',
  alerts: '/alertas',
  reports: '/relatorios',
  about: '/sobre',
  settings: '/configuracoes',
  organization: '/organizacao',
  team: '/equipe',
};

export const PUBLIC_PAGE_TO_PATH: Record<PublicPage, string> = {
  home: '/',
  features: '/recursos',
  about: '/sobre',
  terms: '/termos',
  privacy: '/privacidade',
  login: '/dashboard',
  register: '/dashboard',
  'forgot-password': '/dashboard',
  'verify-otp': '/dashboard',
  'reset-password': '/dashboard',
  onboarding: '/dashboard',
};

const SECTION_PAGE_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard — WattWise',
  demos: 'Cenários de Demonstração — WattWise',
  equipment: 'Equipamentos e Potências — WattWise',
  records: 'Registros de Consumo — WattWise',
  analysis: 'Análises Energéticas — WattWise',
  alerts: 'Alertas e Recomendações — WattWise',
  reports: 'Relatórios e Exportação — WattWise',
  about: 'Sobre o Projeto e Guia Técnico — WattWise',
  settings: 'Configurações e Tarifas — WattWise',
  organization: 'Organização — WattWise',
  team: 'Equipe — WattWise',
};

export function resolveRouteFromPathname(pathname: string): {
  mode: WorkspaceMode;
  publicPage: PublicPage;
  section: NavSection;
} {
  const clean = pathname.replace(/\/+$/, '').toLowerCase() || '/';

  switch (clean) {
    case '/':
      return { mode: 'public', publicPage: 'home', section: 'dashboard' };
    case '/recursos':
      return { mode: 'public', publicPage: 'features', section: 'dashboard' };
    case '/termos':
      return { mode: 'public', publicPage: 'terms', section: 'dashboard' };
    case '/privacidade':
      return { mode: 'public', publicPage: 'privacy', section: 'dashboard' };
    case '/demonstracoes':
    case '/cenarios':
      return { mode: 'demo', publicPage: 'home', section: 'demos' };
    case '/dashboard':
      return { mode: 'demo', publicPage: 'home', section: 'dashboard' };
    case '/equipamentos':
      return { mode: 'demo', publicPage: 'home', section: 'equipment' };
    case '/registros':
      return { mode: 'demo', publicPage: 'home', section: 'records' };
    case '/analises':
      return { mode: 'demo', publicPage: 'home', section: 'analysis' };
    case '/alertas':
      return { mode: 'demo', publicPage: 'home', section: 'alerts' };
    case '/relatorios':
      return { mode: 'demo', publicPage: 'home', section: 'reports' };
    case '/configuracoes':
      return { mode: 'demo', publicPage: 'home', section: 'settings' };
    case '/sobre':
      return { mode: 'demo', publicPage: 'about', section: 'about' };
    default:
      return { mode: 'public', publicPage: 'home', section: 'dashboard' };
  }
}

interface WattWiseContextValue {
  // Tema Visual
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Cenários Demonstrativos Isolados
  activeScenarioId: DemoScenarioId;
  activeScenarioMeta: DemoScenarioMeta;
  switchScenario: (scenarioId: DemoScenarioId, navigateToSection?: NavSection) => void;
  restoreScenarioData: (scenarioId?: DemoScenarioId) => void;
  getScenarioSummary: (scenarioId: DemoScenarioId) => {
    meta: DemoScenarioMeta;
    state: AppDataState;
    analysis: AnalysisResult;
  };

  // Navegação e Roteamento Real
  currentPath: string;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  publicPage: PublicPage;
  navigatePublic: (page: PublicPage) => void;
  enterDemoSandbox: (scenarioId?: DemoScenarioId | unknown, targetSection?: NavSection) => void;
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
  requestPasswordResetOtp: (
    email: string,
  ) => Promise<{ ok: boolean; message: string; mockOtp?: string }>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<{ ok: boolean; message: string }>;
  completePasswordReset: (
    newPassword: string,
    email?: string,
  ) => Promise<{ ok: boolean; message: string }>;
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

  // Cenários Demonstrativos Isolados (4 cenários independentes no LocalStorage)
  const [activeScenarioId, setActiveScenarioId] = useState<DemoScenarioId>(() =>
    loadActiveScenarioIdFromStorage(),
  );

  const [scenarioStates, setScenarioStates] = useState<Record<DemoScenarioId, AppDataState>>(() => ({
    cafeteria: loadScenarioStateFromStorage('cafeteria').state,
    mercado: loadScenarioStateFromStorage('mercado').state,
    barbearia: loadScenarioStateFromStorage('barbearia').state,
    padaria: loadScenarioStateFromStorage('padaria').state,
  }));

  const demoState = scenarioStates[activeScenarioId];

  const updateCurrentScenarioState = useCallback(
    (updater: (prev: AppDataState) => AppDataState) => {
      setScenarioStates((prevMap) => {
        const current = prevMap[activeScenarioId];
        const next = updater(current);
        return {
          ...prevMap,
          [activeScenarioId]: next,
        };
      });
    },
    [activeScenarioId],
  );

  const [saasDb, setSaasDb] = useState<SaasDatabaseSchema>(() => loadSaasDatabase());

  // Inicialização baseada na URL real do navegador
  const initialRoute = useMemo(() => {
    if (typeof window !== 'undefined' && window.location) {
      return resolveRouteFromPathname(window.location.pathname);
    }
    return { mode: 'public' as WorkspaceMode, publicPage: 'home' as PublicPage, section: 'dashboard' as NavSection };
  }, []);

  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialRoute.mode);
  const [publicPage, setPublicPage] = useState<PublicPage>(initialRoute.publicPage);
  const [activeSection, setActiveSectionState] = useState<NavSection>(initialRoute.section);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  const [storageError, setStorageError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listener de popstate para botões Voltar / Avançar do navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const route = resolveRouteFromPathname(window.location.pathname);
      setCurrentPath(window.location.pathname);
      setWorkspaceMode(route.mode);
      setPublicPage(route.publicPage);
      setActiveSectionState(route.section);
      setSelectedEquipmentId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Atualiza document.title conforme a rota ativa
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (workspaceMode === 'public') {
      document.title = 'WattWise — Transformando dados de consumo em decisões mais inteligentes';
    } else {
      const baseTitle = SECTION_PAGE_TITLES[activeSection] ?? 'WattWise';
      const scenarioLabel = DEMO_SCENARIOS[activeScenarioId]?.shortLabel;
      document.title = scenarioLabel ? `${baseTitle} (${scenarioLabel})` : baseTitle;
    }
  }, [workspaceMode, activeSection, activeScenarioId]);

  const setActiveSection = useCallback((section: NavSection) => {
    setActiveSectionState(section);
    setWorkspaceMode('demo');
    setSelectedEquipmentId(null);
    const nextPath = SECTION_TO_PATH[section] ?? '/dashboard';
    setCurrentPath(nextPath);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({ section }, '', nextPath);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

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

  // Persiste automaticamente o estado do cenário ativo em sua própria chave isolada do LocalStorage
  useEffect(() => {
    const result = saveScenarioStateToStorage(activeScenarioId, demoState);
    if (!result.ok) {
      setStorageError(result.error ?? 'Erro ao salvar dados no LocalStorage.');
    } else {
      setStorageError(null);
    }
  }, [activeScenarioId, demoState]);

  const switchScenario = useCallback(
    (scenarioId: DemoScenarioId, navigateToSection?: NavSection) => {
      if (!DEMO_SCENARIOS[scenarioId]) return;
      setActiveScenarioId(scenarioId);
      saveActiveScenarioIdToStorage(scenarioId);
      setSelectedEquipmentId(null);

      if (navigateToSection) {
        setActiveSection(navigateToSection);
      }

      const meta = DEMO_SCENARIOS[scenarioId];
      pushToast(
        'info',
        `Cenário: ${meta.shortLabel}`,
        `Exibindo dados isolados de "${meta.name}".`,
      );
    },
    [setActiveSection, pushToast],
  );

  const restoreScenarioData = useCallback(
    (targetScenarioId?: DemoScenarioId) => {
      const idToRestore = targetScenarioId ?? activeScenarioId;
      const fresh = restoreScenarioInStorage(idToRestore);
      setScenarioStates((prev) => ({
        ...prev,
        [idToRestore]: fresh,
      }));
      setSelectedEquipmentId(null);
      const meta = DEMO_SCENARIOS[idToRestore];
      pushToast(
        'success',
        `Cenário ${meta.shortLabel} restaurado`,
        `Os equipamentos, registros e tarifa originais de "${meta.name}" foram restaurados sem alterar os demais cenários.`,
      );
    },
    [activeScenarioId, pushToast],
  );

  const getScenarioSummary = useCallback(
    (scenarioId: DemoScenarioId) => {
      const meta = DEMO_SCENARIOS[scenarioId];
      const st = scenarioStates[scenarioId];
      const an = runEnergyAnalysis(st.equipment, st.records, st.settings, st.alertStates ?? {}, st.records);
      return { meta, state: st, analysis: an };
    },
    [scenarioStates],
  );

  // Estados para sincronização remota com Supabase Cloud (mantidos para compatibilidade de arquitetura)
  const [remoteUser] = useState<UserProfile | null>(null);
  const [remoteOrgs] = useState<RemoteUserOrg[]>([]);
  const [remoteActiveOrgId, setRemoteActiveOrgId] = useState<string | null>(null);
  const [remoteBundle, setRemoteBundle] = useState<RemoteOrgBundle | null>(null);

  const refreshRemoteData = useCallback(
    async (orgId: string) => {
      try {
        const bundle = await fetchRemoteOrganizationData(orgId);
        setRemoteBundle(bundle);
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
        pushToast('error', 'Falha ao sincronizar dados', (err as Error).message);
      }
    },
    [pushToast],
  );

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
          version: 3,
          equipment: remoteBundle.equipment,
          records: remoteBundle.readings,
          settings: remoteBundle.settings,
          alertStates: remoteBundle.alertStates,
        };
      }
      if (!isSupabaseConfigured && orgBundle) {
        return {
          version: 3,
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
        periodFilter === 'custom' ? filteredRecords : activeState.records,
      ),
    [
      activeState.equipment,
      filteredRecords,
      activeState.settings,
      activeState.alertStates,
      activeState.records,
      periodFilter,
    ],
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
        tariffPerKwh: 0.79,
        anomalyThresholdPercent: 20,
        sampleEquipment: [],
        sampleRecords: [],
      };
    }
    return getLegacyMigrationPreview(saasDb, activeOrganizationId);
  }, [saasDb, activeOrganizationId]);

  const navigatePublic = useCallback(
    (page: PublicPage) => {
      const authPages = [
        'login',
        'register',
        'forgot-password',
        'verify-otp',
        'reset-password',
        'onboarding',
      ];
      if (authPages.includes(page)) {
        setActiveSection('dashboard');
        return;
      }
      if (page === 'about') {
        setActiveSection('about');
        return;
      }
      setPublicPage(page);
      setWorkspaceMode('public');
      const nextPath = PUBLIC_PAGE_TO_PATH[page] ?? '/';
      setCurrentPath(nextPath);
      if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
        window.history.pushState({ publicPage: page }, '', nextPath);
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setActiveSection],
  );

  const enterDemoSandbox = useCallback(
    (scenarioId?: DemoScenarioId | unknown, targetSection: NavSection = 'dashboard') => {
      if (typeof scenarioId === 'string' && scenarioId in DEMO_SCENARIOS) {
        const validId = scenarioId as DemoScenarioId;
        setActiveScenarioId(validId);
        saveActiveScenarioIdToStorage(validId);
      }
      setActiveSection(targetSection);
    },
    [setActiveSection],
  );

  // ==========================================================================
  // Autenticação & Organizações (mantidos apenas por compatibilidade interna)
  // ==========================================================================

  const registerAccount = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      organizationName?: string;
    }) => {
      const result = registerUserAccount(saasDb, { ...input });
      setSaasDb({ ...result.db });
      setActiveSection('dashboard');
    },
    [saasDb, setActiveSection],
  );

  const loginAccount = useCallback(
    async (input: { email: string; password: string }) => {
      const result = loginUserAccount(saasDb, input);
      setSaasDb({ ...result.db });
      setActiveSection('dashboard');
    },
    [saasDb, setActiveSection],
  );

  const resetPassword = useCallback(
    (input: { email: string; newPassword: string }) => {
      const nextDb = resetUserPassword(saasDb, input);
      setSaasDb({ ...nextDb });
    },
    [saasDb],
  );

  const requestPasswordResetOtp = useCallback(async (email: string) => {
    return authRequestOtp(email);
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email: string, otp: string) => {
    return authVerifyOtp(email, otp);
  }, []);

  const completePasswordReset = useCallback(async (newPassword: string, email?: string) => {
    return authCompleteReset(newPassword, email);
  }, []);

  const logoutAccount = useCallback(async () => {
    if (isSupabaseConfigured && supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    const nextDb = logoutUserAccount(saasDb);
    setSaasDb({ ...nextDb });
    navigatePublic('home');
  }, [saasDb, navigatePublic]);

  const createOrganization = useCallback(
    async (input: {
      name: string;
      timezone?: string;
      tariffPerKwh?: number;
      anomalyThresholdPercent?: number;
    }) => {
      if (!currentUser) return;
      const cloned = structuredClone(saasDb);
      const result = createOrganizationForUser(cloned, currentUser.id, input);
      setSaasDb({ ...result.db });
    },
    [currentUser, saasDb],
  );

  const switchOrganization = useCallback((organizationId: string) => {
    setRemoteActiveOrgId(organizationId);
    setSelectedEquipmentId(null);
  }, []);

  // ==========================================================================
  // Operações CRUD Isoladas por Cenário
  // ==========================================================================

  const addEquipment = useCallback(
    async (input: EquipmentInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          const inserted = await insertRemoteEquipment(activeOrganizationId, input);
          setRemoteBundle((prev) =>
            prev ? { ...prev, equipment: [inserted, ...prev.equipment] } : null,
          );
          return;
        }
        const cloned = structuredClone(saasDb);
        const result = createEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, input);
        setSaasDb({ ...result.db });
        return;
      }

      const newEquipment: Equipment = {
        id: generateId(`${activeScenarioId}_eq`),
        name: input.name.trim(),
        manufacturer: input.manufacturer?.trim() || undefined,
        model: input.model?.trim() || undefined,
        category: input.category,
        location: input.location?.trim() || 'Principal',
        powerWatts: input.powerWatts,
        quantity: input.quantity ?? 1,
        dailyUsageHours: input.dailyUsageHours ?? 8,
        usageFactor: input.usageFactor ?? 1,
        status: input.status,
        technicalSource: input.technicalSource?.trim() || undefined,
        sourceUrl: input.sourceUrl?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        isDemo: false,
        updatedAt: new Date().toISOString(),
      };
      updateCurrentScenarioState((prev) => ({
        ...prev,
        equipment: [newEquipment, ...prev.equipment],
      }));
      pushToast(
        'success',
        'Equipamento cadastrado',
        `"${newEquipment.name}" foi adicionado ao cenário ${DEMO_SCENARIOS[activeScenarioId].shortLabel}.`,
      );
    },
    [
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      activeScenarioId,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const updateEquipment = useCallback(
    async (id: string, input: EquipmentInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          const updated = await updateRemoteEquipment(activeOrganizationId, id, input);
          setRemoteBundle((prev) =>
            prev
              ? {
                  ...prev,
                  equipment: prev.equipment.map((e) => (e.id === id ? updated : e)),
                }
              : null,
          );
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = updateEquipmentInOrg(
          cloned,
          currentUser.id,
          activeOrganizationId,
          id,
          input,
        );
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((item) =>
          item.id === id
            ? {
                ...item,
                name: input.name.trim(),
                manufacturer: input.manufacturer?.trim() || undefined,
                model: input.model?.trim() || undefined,
                category: input.category,
                location: input.location?.trim() || item.location || 'Principal',
                powerWatts: input.powerWatts,
                quantity: input.quantity ?? item.quantity ?? 1,
                dailyUsageHours: input.dailyUsageHours ?? item.dailyUsageHours ?? 8,
                usageFactor: input.usageFactor ?? item.usageFactor ?? 1,
                status: input.status,
                technicalSource: input.technicalSource?.trim() || undefined,
                sourceUrl: input.sourceUrl?.trim() || undefined,
                notes: input.notes?.trim() || undefined,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      }));
      pushToast('success', 'Equipamento atualizado', `"${input.name.trim()}" foi salvo com sucesso.`);
    },
    [
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const toggleEquipmentStatus = useCallback(
    async (id: string) => {
      const target = activeState.equipment.find((e) => e.id === id);
      if (!target) return;
      const nextStatus: EquipmentStatus = target.status === 'active' ? 'inactive' : 'active';

      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          const updated = await updateRemoteEquipment(activeOrganizationId, id, {
            ...target,
            status: nextStatus,
          });
          setRemoteBundle((prev) =>
            prev
              ? {
                  ...prev,
                  equipment: prev.equipment.map((e) => (e.id === id ? updated : e)),
                }
              : null,
          );
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = updateEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, id, {
          ...target,
          status: nextStatus,
        });
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
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
    [
      activeState.equipment,
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const deleteEquipment = useCallback(
    async (id: string) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          await deleteRemoteEquipment(activeOrganizationId, id);
          setRemoteBundle((prev) =>
            prev ? { ...prev, equipment: prev.equipment.filter((e) => e.id !== id) } : null,
          );
          if (selectedEquipmentId === id) setSelectedEquipmentId(null);
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = deleteEquipmentInOrg(cloned, currentUser.id, activeOrganizationId, id);
        setSaasDb({ ...nextDb });
        if (selectedEquipmentId === id) setSelectedEquipmentId(null);
        return;
      }

      let deletedName = '';
      updateCurrentScenarioState((prev) => {
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
    [
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      selectedEquipmentId,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const addRecord = useCallback(
    async (input: RecordInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          const inserted = await insertRemoteReading(activeOrganizationId, input);
          setRemoteBundle((prev) =>
            prev
              ? {
                  ...prev,
                  readings: [...prev.readings, inserted].sort((a, b) =>
                    a.date.localeCompare(b.date),
                  ),
                }
              : null,
          );
          return;
        }
        const cloned = structuredClone(saasDb);
        const result = createReadingInOrg(cloned, currentUser.id, activeOrganizationId, input);
        setSaasDb({ ...result.db });
        return;
      }

      const mType: MeasurementType = input.measurementType ?? 'measured';
      const newRecord: ConsumptionRecord = {
        id: generateId(`${activeScenarioId}_rec`),
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
      updateCurrentScenarioState((prev) => ({
        ...prev,
        records: [...prev.records, newRecord],
      }));
      pushToast(
        'success',
        'Consumo registrado',
        `Lançamento de ${input.consumptionKwh.toLocaleString('pt-BR')} kWh salvo em ${DEMO_SCENARIOS[activeScenarioId].shortLabel}.`,
      );
    },
    [
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      activeScenarioId,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const updateRecord = useCallback(
    async (id: string, input: RecordInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
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
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = updateReadingInOrg(cloned, currentUser.id, activeOrganizationId, id, input);
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
        ...prev,
        records: prev.records.map((item) =>
          item.id === id
            ? {
                ...item,
                date: input.date,
                consumptionKwh: input.consumptionKwh,
                equipmentId: input.equipmentId || undefined,
                measurementType: input.measurementType ?? item.measurementType ?? 'measured',
                source: input.source ?? item.source ?? 'manual',
                meterPreviousKwh: input.meterPreviousKwh,
                meterCurrentKwh: input.meterCurrentKwh,
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
        'Os indicadores, comparativo mensal e alertas foram recalculados automaticamente.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, updateCurrentScenarioState, pushToast],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          await deleteRemoteReading(activeOrganizationId, id);
          setRemoteBundle((prev) =>
            prev ? { ...prev, readings: prev.readings.filter((r) => r.id !== id) } : null,
          );
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = deleteReadingInOrg(cloned, currentUser.id, activeOrganizationId, id);
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
        ...prev,
        records: prev.records.filter((item) => item.id !== id),
      }));
      pushToast(
        'info',
        'Registro excluído',
        'O histórico, o comparativo mensal e a previsão foram recalculados.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, updateCurrentScenarioState, pushToast],
  );

  const updateSettings = useCallback(
    async (input: SettingsInput) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          await updateRemoteSettings(activeOrganizationId, input);
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = updateOrganizationSettingsInOrg(
          cloned,
          currentUser.id,
          activeOrganizationId,
          input,
        );
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          establishmentName: input.establishmentName.trim(),
          establishmentDescription:
            input.establishmentDescription !== undefined
              ? input.establishmentDescription.trim()
              : prev.settings.establishmentDescription,
          tariffPerKwh: input.tariffPerKwh,
          referenceLocation:
            input.referenceLocation !== undefined
              ? input.referenceLocation.trim()
              : prev.settings.referenceLocation,
          consumerClass:
            input.consumerClass !== undefined
              ? input.consumerClass.trim()
              : prev.settings.consumerClass,
          tariffSource:
            input.tariffSource !== undefined
              ? input.tariffSource.trim()
              : prev.settings.tariffSource,
          tariffReferenceDate:
            input.tariffReferenceDate !== undefined
              ? input.tariffReferenceDate.trim()
              : prev.settings.tariffReferenceDate,
          tariffTaxNote:
            input.tariffTaxNote !== undefined
              ? input.tariffTaxNote.trim()
              : prev.settings.tariffTaxNote,
          anomalyThresholdPercent: input.anomalyThresholdPercent,
          timezone: input.timezone ?? prev.settings.timezone,
        },
      }));
      pushToast(
        'success',
        'Configurações atualizadas',
        `Tarifa e parâmetros aplicados ao cenário ${DEMO_SCENARIOS[activeScenarioId].shortLabel}.`,
      );
    },
    [
      workspaceMode,
      currentUser,
      activeOrganizationId,
      saasDb,
      activeScenarioId,
      updateCurrentScenarioState,
      pushToast,
    ],
  );

  const updateAlertStatus = useCallback(
    async (alertId: string, status: AlertStatus) => {
      if (workspaceMode === 'saas' && currentUser && activeOrganizationId) {
        if (isSupabaseConfigured) {
          await acknowledgeRemoteAlert(activeOrganizationId, alertId, status, currentUser.id);
          return;
        }
        const cloned = structuredClone(saasDb);
        const nextDb = updateAlertStatusInOrg(
          cloned,
          currentUser.id,
          activeOrganizationId,
          alertId,
          status,
        );
        setSaasDb({ ...nextDb });
        return;
      }

      updateCurrentScenarioState((prev) => ({
        ...prev,
        alertStates: {
          ...(prev.alertStates ?? {}),
          [alertId]: {
            status,
            acknowledgedBy: 'Operador do Cenário',
            acknowledgedAt: new Date().toISOString(),
          },
        },
      }));
      pushToast(
        'success',
        status === 'acknowledged'
          ? 'Alerta reconhecido'
          : status === 'resolved'
            ? 'Alerta resolvido'
            : 'Alerta reaberto',
        'Status operacional atualizado neste cenário.',
      );
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb, updateCurrentScenarioState, pushToast],
  );

  // ==========================================================================
  // Equipe, Migração e Restauração
  // ==========================================================================

  const inviteMember = useCallback(
    (input: { email: string; role: OrgRole }) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      const cloned = structuredClone(saasDb);
      const result = inviteMemberToOrganization(cloned, currentUser.id, activeOrganizationId, input);
      setSaasDb({ ...result.db });
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb],
  );

  const updateMemberRole = useCallback(
    (memberId: string, role: OrgRole) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      const cloned = structuredClone(saasDb);
      const nextDb = updateMemberRoleInOrganization(
        cloned,
        currentUser.id,
        activeOrganizationId,
        memberId,
        role,
      );
      setSaasDb({ ...nextDb });
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      const cloned = structuredClone(saasDb);
      const nextDb = removeMemberFromOrganization(
        cloned,
        currentUser.id,
        activeOrganizationId,
        memberId,
      );
      setSaasDb({ ...nextDb });
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb],
  );

  const migrateLegacyData = useCallback(
    (options: { includeSimulatedDemoItems: boolean }) => {
      if (workspaceMode !== 'saas' || !currentUser || !activeOrganizationId) return;
      const cloned = structuredClone(saasDb);
      const result = migrateLegacyLocalStorageToOrganization(
        cloned,
        currentUser.id,
        activeOrganizationId,
        options,
      );
      setSaasDb({ ...result.db });
    },
    [workspaceMode, currentUser, activeOrganizationId, saasDb],
  );

  const restoreDemoData = useCallback(() => {
    restoreScenarioData(activeScenarioId);
  }, [restoreScenarioData, activeScenarioId]);

  const clearOperationalData = useCallback(() => {
    updateCurrentScenarioState((prev) => ({
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
      `Os dados do cenário ${DEMO_SCENARIOS[activeScenarioId].shortLabel} foram limpos. Os demais cenários permanecem intactos.`,
    );
  }, [updateCurrentScenarioState, activeScenarioId, pushToast]);

  const activeScenarioMeta = DEMO_SCENARIOS[activeScenarioId];

  const value = useMemo<WattWiseContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      activeScenarioId,
      activeScenarioMeta,
      switchScenario,
      restoreScenarioData,
      getScenarioSummary,
      currentPath,
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
        ? (userOrganizations.find((o) => o.organization.id === activeOrganizationId)
            ?.organization ?? null)
        : (orgBundle?.organization ?? null),
      activeRole: isSupabaseConfigured
        ? (userOrganizations.find((o) => o.organization.id === activeOrganizationId)?.role ??
          'owner')
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
      activeScenarioId,
      activeScenarioMeta,
      switchScenario,
      restoreScenarioData,
      getScenarioSummary,
      currentPath,
      workspaceMode,
      publicPage,
      navigatePublic,
      enterDemoSandbox,
      activeSection,
      setActiveSection,
      selectedEquipmentId,
      periodFilter,
      customDateRange,
      currentUser,
      userOrganizations,
      activeOrganizationId,
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
