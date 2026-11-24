export const EQUIPMENT_CATEGORIES = [
  'Climatização',
  'Refrigeração',
  'Cocção e Aquecimento',
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

export type DemoScenarioId = 'cafeteria' | 'mercado' | 'barbearia' | 'padaria';

export interface DemoScenarioMeta {
  id: DemoScenarioId;
  name: string;
  shortLabel: string;
  segment: string;
  description: string;
  operatingHoursSummary: string;
  floorAreaM2: number;
  highlightNote: string;
}

export interface Equipment {
  id: string;
  organizationId?: string;
  name: string;
  manufacturer?: string;
  model?: string;
  category: EquipmentCategory;
  location?: string;
  powerWatts: number;
  quantity?: number;
  dailyUsageHours?: number;
  /**
   * Fator de utilização / ciclo de operação (0.05 a 1.0).
   * Ex.: geladeira/freezer com termostato = 0.55; forno com termostato = 0.65; iluminação contínua = 1.0.
   */
  usageFactor?: number;
  status: EquipmentStatus;
  technicalSource?: string;
  sourceUrl?: string;
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
  establishmentDescription?: string;
  scenarioId?: DemoScenarioId;
  tariffPerKwh: number;
  referenceLocation?: string;
  consumerClass?: string;
  tariffSource?: string;
  tariffReferenceDate?: string;
  tariffTaxNote?: string;
  anomalyThresholdPercent: number;
  emissionFactorKgPerKwh?: number;
  emissionFactorSource?: string;
  emissionFactorYear?: string;
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
  scenarioId?: DemoScenarioId;
  equipment: Equipment[];
  records: ConsumptionRecord[];
  settings: AppSettings;
  alertStates?: Record<string, AlertAcknowledgement>;
}

export type NavSection =
  | 'dashboard'
  | 'demos'
  | 'equipment'
  | 'records'
  | 'analysis'
  | 'alerts'
  | 'reports'
  | 'about'
  | 'organization'
  | 'team'
  | 'settings';

export type PublicPage =
  | 'home'
  | 'features'
  | 'about'
  | 'terms'
  | 'privacy'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-otp'
  | 'reset-password'
  | 'onboarding';

export type AnomalySeverity = 'warning' | 'critical';

export type SystemAlertCategory =
  | 'anomaly'
  | 'period_increase'
  | 'high_power_equipment'
  | 'cost_projection'
  | 'insufficient_data';

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
  reason?: string;
  dataContext?: string;
  recommendedAction?: string;
  alertCategory?: SystemAlertCategory;
}

export interface SystemAlert {
  id: string;
  title: string;
  priority: 'critical' | 'warning' | 'info';
  category: SystemAlertCategory;
  description: string;
  reason: string;
  date: string;
  dataContext: string;
  recommendedAction: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  measurementType?: MeasurementType;
  deviationPercent?: number;
  excessKwh?: number;
  estimatedExcessCostBrl?: number;
  equipmentId?: string;
  recordId?: string;
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
  estimatedDailyKwh: number;
  estimatedMonthlyKwh: number;
  estimatedMonthlyCostBrl: number;
  percentage: number;
  energyPercentage: number;
  activeCount: number;
}

export interface EquipmentConsumptionSummary {
  equipment: Equipment;
  totalRatedPowerWatts: number;
  effectiveUsageFactor: number;
  estimatedDailyKwh: number;
  estimatedMonthlyKwh: number;
  estimatedMonthlyCostBrl: number;
  nominalDailyKwhWithoutFactor: number;
  nominalMonthlyKwhWithoutFactor: number;
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
  emissionFactorSource: string;
  emissionFactorYear: string;
  periodCo2Kg: number;
  monthlyForecastCo2Kg: number | null;
  tenPercentAnnualCo2SavedKg: number | null;
  tenPercentAnnualCostSavedBrl: number | null;
  methodologyNote: string;
}

export interface MonthlyComparisonPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // Nov/26
  fullMonthName: string; // Novembro de 2026
  totalKwh: number;
  totalCostBrl: number;
  averageDailyKwh: number;
  averageDailyCostBrl: number;
  daysCount: number;
  calendarDaysInMonth: number;
  projectedFullMonthKwh: number;
  projectedFullMonthCostBrl: number;
  measuredKwh: number;
  estimatedKwh: number;
  simulatedKwh: number;
  previousMonthKey: string | null;
  previousMonthLabel: string | null;
  previousMonthTotalKwh: number | null;
  previousMonthAverageDailyKwh: number | null;
  totalVariationPercent: number | null;
  dailyAvgVariationPercent: number | null;
  isPartialMonth: boolean;
}

export interface PeriodComparisonSummary {
  currentPeriodKwh: number;
  previousPeriodKwh: number;
  variationPercent: number | null;
  currentPeriodCostBrl: number;
  previousPeriodCostBrl: number;
  currentPeriodAvgDailyKwh: number;
  previousPeriodAvgDailyKwh: number;
  currentDaysCount: number;
  previousDaysCount: number;
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
  estimatedEquipmentDailyKwh: number;
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
  systemAlerts: SystemAlert[];
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
