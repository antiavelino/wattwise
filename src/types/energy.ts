export const EQUIPMENT_CATEGORIES = [
  'Climatização',
  'Refrigeração',
  'Maquinário',
  'Iluminação',
  'TI e Escritório',
  'Outros',
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export type EquipmentStatus = 'active' | 'inactive';

export type MeasurementType = 'measured' | 'estimated' | 'simulated';

export type ReadingSource =
  | 'manual'
  | 'meter_cumulative'
  | 'local_migration'
  | 'demo_seed';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export type OrgRole = 'owner' | 'admin' | 'operator' | 'viewer';

export type PeriodFilter = '7d' | '30d' | '90d' | 'custom' | 'all';

export interface Equipment {
  id: string;
  organizationId?: string;
  name: string;
  category: EquipmentCategory;
  location?: string;
  powerWatts: number;
  quantity?: number;
  dailyUsageHours?: number;
  status: EquipmentStatus;
  notes?: string;
  isDemo?: boolean;
  updatedAt: string;
}

export interface ConsumptionRecord {
  id: string;
  organizationId?: string;
  equipmentId?: string;
  date: string; // YYYY-MM-DD
  consumptionKwh: number;
  measurementType?: MeasurementType;
  source?: ReadingSource;
  meterPreviousKwh?: number;
  meterCurrentKwh?: number;
  note?: string;
  isDemo?: boolean;
  createdBy?: string;
  updatedAt: string;
}

export interface AppSettings {
  establishmentName: string;
  tariffPerKwh: number;
  anomalyThresholdPercent: number;
  preferredCurrency?: string;
  timezone?: string;
  isDemoProfile?: boolean;
}

export interface AlertAcknowledgement {
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AppDataState {
  version: number;
  equipment: Equipment[];
  records: ConsumptionRecord[];
  settings: AppSettings;
  alertStates?: Record<string, AlertAcknowledgement>;
}

export type NavSection =
  | 'dashboard'
  | 'equipment'
  | 'records'
  | 'analysis'
  | 'alerts'
  | 'reports'
  | 'organization'
  | 'team'
  | 'settings';

export type PublicPage =
  | 'home'
  | 'features'
  | 'terms'
  | 'privacy'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-otp'
  | 'reset-password'
  | 'onboarding';

export type AnomalySeverity = 'warning' | 'critical';

export interface AnomalyAlert {
  id: string;
  recordId: string;
  organizationId?: string;
  equipmentId?: string;
  date: string;
  consumptionKwh: number;
  baselineAverageKwh: number;
  baselineDaysCount: number;
  deviationPercent: number;
  excessKwh: number;
  estimatedExcessCostBrl: number;
  severity: AnomalySeverity;
  measurementType: MeasurementType;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  isDemo?: boolean;
  title: string;
  description: string;
  explanation: string;
}

export type RecommendationPriority = 'high' | 'medium' | 'info' | 'positive';

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  category: string;
  title: string;
  description: string;
  reason: string;
  evidence: string;
  estimatedImpact: string;
  suggestedAction: string;
  metricBadge?: string;
  actionTarget?: NavSection;
  actionLabel?: string;
}

export interface ChartPoint {
  id: string;
  date: string;
  shortDate: string;
  fullDate: string;
  consumptionKwh: number;
  measuredKwh: number | null;
  estimatedKwh: number | null;
  simulatedKwh: number | null;
  estimatedCostBrl: number;
  baselineAverageKwh: number | null;
  deviationPercent: number | null;
  isAnomaly: boolean;
  anomalySeverity?: AnomalySeverity;
  measurementType: MeasurementType;
  equipmentId?: string;
  note?: string;
  isDemo?: boolean;
}

export interface CategoryLoadSummary {
  category: EquipmentCategory;
  powerWatts: number;
  estimatedMonthlyKwh: number;
  estimatedMonthlyCostBrl: number;
  percentage: number;
  activeCount: number;
}

export interface EquipmentConsumptionSummary {
  equipment: Equipment;
  totalRatedPowerWatts: number;
  estimatedDailyKwh: number;
  estimatedMonthlyKwh: number;
  estimatedMonthlyCostBrl: number;
  measuredPeriodKwh: number;
  measuredReadingsCount: number;
  shareOfInstalledPowerPercent: number;
  shareOfEstimatedEnergyPercent: number;
}

export type ForecastConfidence = 'insufficient' | 'low' | 'moderate' | 'high';

export interface ForecastAnalysis {
  estimatedMonthlyKwh: number | null;
  estimatedMonthlyCostBrl: number | null;
  dailyBasisAverageKwh: number | null;
  trendSlopeKwhPerDay: number | null;
  trendDirection: 'rising' | 'stable' | 'falling' | 'unknown';
  variationCoefficientPercent: number | null;
  sampleDaysCount: number;
  missingDaysInWindow: number;
  confidence: ForecastConfidence;
  methodology: string;
  limitations: string;
}

export interface EnvironmentalImpactSummary {
  emissionFactorKgPerKwh: number;
  periodCo2Kg: number;
  monthlyForecastCo2Kg: number | null;
  tenPercentAnnualCo2SavedKg: number | null;
  tenPercentAnnualCostSavedBrl: number | null;
  methodologyNote: string;
}

export interface MonthlyComparisonPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  totalKwh: number;
  totalCostBrl: number;
  averageDailyKwh: number;
  daysCount: number;
  measuredKwh: number;
  estimatedKwh: number;
  simulatedKwh: number;
}

export interface PeriodComparisonSummary {
  currentPeriodKwh: number;
  previousPeriodKwh: number;
  variationPercent: number | null;
  currentPeriodCostBrl: number;
  previousPeriodCostBrl: number;
}

export interface AnalysisResult {
  sortedRecords: ConsumptionRecord[];
  totalRecords: number;
  latestRecord: ConsumptionRecord | null;
  previousRecord: ConsumptionRecord | null;
  dailyVariationPercent: number | null;
  periodTotalKwh: number;
  periodTotalCostBrl: number;
  measuredTotalKwh: number;
  estimatedTotalKwh: number;
  simulatedTotalKwh: number;
  historicalAverageKwh: number | null;
  forecastBasisAverageKwh: number | null;
  forecastBasisDays: number;
  monthlyForecastKwh: number | null;
  estimatedMonthlyCostBrl: number | null;
  estimatedDailyCostBrl: number | null;
  estimatedEquipmentMonthlyKwh: number;
  estimatedEquipmentMonthlyCostBrl: number;
  forecast: ForecastAnalysis;
  environmentalImpact: EnvironmentalImpactSummary;
  periodComparison: PeriodComparisonSummary;
  monthlyComparison: MonthlyComparisonPoint[];
  hasEnoughDataForForecast: boolean;
  hasEnoughDataForAnomalies: boolean;
  recordsNeededForForecast: number;
  recordsNeededForAnomalies: number;
  activeInstalledPowerWatts: number;
  inactiveInstalledPowerWatts: number;
  activeEquipmentCount: number;
  totalEquipmentCount: number;
  categoryLoads: CategoryLoadSummary[];
  equipmentSummaries: EquipmentConsumptionSummary[];
  topActiveEquipment: Equipment[];
  anomalies: AnomalyAlert[];
  recommendations: Recommendation[];
  chartData: ChartPoint[];
  hasDemoData: boolean;
  demoRecordsCount: number;
  demoEquipmentCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  fullName: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'revoked';
  emailSent: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface LegacyMigrationPreview {
  hasLegacyData: boolean;
  alreadyMigratedToCurrentOrg: boolean;
  equipmentCount: number;
  recordsCount: number;
  realEquipmentCount: number;
  realRecordsCount: number;
  demoEquipmentCount: number;
  demoRecordsCount: number;
  establishmentName: string;
  tariffPerKwh: number;
  anomalyThresholdPercent: number;
  sampleEquipment: Equipment[];
  sampleRecords: ConsumptionRecord[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
