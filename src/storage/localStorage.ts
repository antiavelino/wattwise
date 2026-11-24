import {
  createDemoDataState,
  createScenarioDefaultSettings,
  DATA_SCHEMA_VERSION,
  DEFAULT_DEMO_SCENARIO_ID,
  DEMO_SCENARIOS,
} from '../data/demoData';
import {
  AlertAcknowledgement,
  AlertStatus,
  AppDataState,
  ConsumptionRecord,
  DemoScenarioId,
  EQUIPMENT_CATEGORIES,
  Equipment,
  EquipmentCategory,
  MeasurementType,
  ReadingSource,
} from '../types/energy';
import { isEquipmentStatus, isValidIsoDate } from '../utils/validators';

export const STORAGE_KEY = 'wattwise_state_v1';
export const ACTIVE_SCENARIO_STORAGE_KEY = 'wattwise_v3_active_scenario';
export const SCENARIO_STORAGE_PREFIX = 'wattwise_v3_scenario_';

export interface StorageLoadResult {
  state: AppDataState;
  recoveredFromError: boolean;
  errorMessage?: string;
}

export function isValidScenarioId(value: unknown): value is DemoScenarioId {
  return (
    typeof value === 'string' &&
    (value === 'cafeteria' || value === 'mercado' || value === 'barbearia' || value === 'padaria')
  );
}

export function getScenarioStorageKey(scenarioId: DemoScenarioId): string {
  return `${SCENARIO_STORAGE_PREFIX}${scenarioId}`;
}

export function loadActiveScenarioIdFromStorage(): DemoScenarioId {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ACTIVE_SCENARIO_STORAGE_KEY);
      if (isValidScenarioId(saved)) {
        return saved;
      }
    }
  } catch {}
  return DEFAULT_DEMO_SCENARIO_ID;
}

export function saveActiveScenarioIdToStorage(scenarioId: DemoScenarioId): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_SCENARIO_STORAGE_KEY, scenarioId);
    }
  } catch {}
}

function sanitizeEquipmentList(raw: unknown): Equipment[] | null {
  if (!Array.isArray(raw)) return null;
  const sanitized: Equipment[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : null;
    const name =
      typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : null;
    const category = EQUIPMENT_CATEGORIES.includes(candidate.category as EquipmentCategory)
      ? (candidate.category as EquipmentCategory)
      : 'Outros';
    const powerWatts =
      typeof candidate.powerWatts === 'number' &&
      Number.isFinite(candidate.powerWatts) &&
      candidate.powerWatts > 0
        ? Math.round(candidate.powerWatts)
        : null;
    const status = isEquipmentStatus(candidate.status) ? candidate.status : 'active';

    if (!id || !name || powerWatts === null) continue;

    const quantity =
      typeof candidate.quantity === 'number' &&
      Number.isFinite(candidate.quantity) &&
      candidate.quantity >= 1
        ? Math.round(candidate.quantity)
        : 1;

    const dailyUsageHours =
      typeof candidate.dailyUsageHours === 'number' &&
      Number.isFinite(candidate.dailyUsageHours) &&
      candidate.dailyUsageHours >= 0 &&
      candidate.dailyUsageHours <= 24
        ? candidate.dailyUsageHours
        : 8;

    const usageFactor =
      typeof candidate.usageFactor === 'number' &&
      Number.isFinite(candidate.usageFactor) &&
      candidate.usageFactor > 0 &&
      candidate.usageFactor <= 1
        ? candidate.usageFactor
        : 1;

    sanitized.push({
      id,
      name,
      manufacturer:
        typeof candidate.manufacturer === 'string' && candidate.manufacturer.trim()
          ? candidate.manufacturer.trim()
          : undefined,
      model:
        typeof candidate.model === 'string' && candidate.model.trim()
          ? candidate.model.trim()
          : undefined,
      category,
      location:
        typeof candidate.location === 'string' && candidate.location.trim()
          ? candidate.location.trim()
          : 'Principal',
      powerWatts,
      quantity,
      dailyUsageHours,
      usageFactor,
      status,
      technicalSource:
        typeof candidate.technicalSource === 'string' && candidate.technicalSource.trim()
          ? candidate.technicalSource.trim()
          : undefined,
      sourceUrl:
        typeof candidate.sourceUrl === 'string' && candidate.sourceUrl.trim()
          ? candidate.sourceUrl.trim()
          : undefined,
      notes:
        typeof candidate.notes === 'string' && candidate.notes.trim()
          ? candidate.notes.trim()
          : undefined,
      isDemo: Boolean(candidate.isDemo),
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    });
  }

  return sanitized;
}

function isMeasurementType(val: unknown): val is MeasurementType {
  return val === 'measured' || val === 'estimated' || val === 'simulated';
}

function isReadingSource(val: unknown): val is ReadingSource {
  return (
    val === 'manual' ||
    val === 'meter_cumulative' ||
    val === 'local_migration' ||
    val === 'demo_seed'
  );
}

function sanitizeRecordsList(raw: unknown): ConsumptionRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const sanitized: ConsumptionRecord[] = [];
  const seenKeySet = new Set<string>();

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : null;
    const date =
      typeof candidate.date === 'string' && isValidIsoDate(candidate.date) ? candidate.date : null;
    const consumptionKwh =
      typeof candidate.consumptionKwh === 'number' &&
      Number.isFinite(candidate.consumptionKwh) &&
      candidate.consumptionKwh >= 0
        ? Math.round(candidate.consumptionKwh * 100) / 100
        : null;

    const equipmentId =
      typeof candidate.equipmentId === 'string' && candidate.equipmentId.trim()
        ? candidate.equipmentId.trim()
        : undefined;

    const dedupKey = `${date}::${equipmentId ?? 'general'}`;
    if (!id || !date || consumptionKwh === null || seenKeySet.has(dedupKey)) continue;
    seenKeySet.add(dedupKey);

    const isDemo = Boolean(candidate.isDemo);
    const measurementType: MeasurementType = isMeasurementType(candidate.measurementType)
      ? candidate.measurementType
      : isDemo
        ? 'simulated'
        : 'measured';

    const source: ReadingSource = isReadingSource(candidate.source)
      ? candidate.source
      : isDemo
        ? 'demo_seed'
        : 'manual';

    const meterPreviousKwh =
      typeof candidate.meterPreviousKwh === 'number' &&
      Number.isFinite(candidate.meterPreviousKwh) &&
      candidate.meterPreviousKwh >= 0
        ? candidate.meterPreviousKwh
        : undefined;

    const meterCurrentKwh =
      typeof candidate.meterCurrentKwh === 'number' &&
      Number.isFinite(candidate.meterCurrentKwh) &&
      candidate.meterCurrentKwh >= 0
        ? candidate.meterCurrentKwh
        : undefined;

    sanitized.push({
      id,
      date,
      consumptionKwh,
      equipmentId,
      measurementType,
      source,
      meterPreviousKwh,
      meterCurrentKwh,
      note:
        typeof candidate.note === 'string' && candidate.note.trim()
          ? candidate.note.trim()
          : undefined,
      isDemo,
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    });
  }

  return sanitized;
}

function sanitizeAlertStates(raw: unknown): Record<string, AlertAcknowledgement> {
  if (typeof raw !== 'object' || raw === null) return {};
  const result: Record<string, AlertAcknowledgement> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val !== 'object' || val === null) continue;
    const item = val as Record<string, unknown>;
    const status: AlertStatus =
      item.status === 'acknowledged' || item.status === 'resolved' ? item.status : 'open';
    result[key] = {
      status,
      acknowledgedBy: typeof item.acknowledgedBy === 'string' ? item.acknowledgedBy : undefined,
      acknowledgedAt: typeof item.acknowledgedAt === 'string' ? item.acknowledgedAt : undefined,
    };
  }
  return result;
}

export function loadScenarioStateFromStorage(
  scenarioId: DemoScenarioId = DEFAULT_DEMO_SCENARIO_ID,
): StorageLoadResult {
  const validScenario: DemoScenarioId = DEMO_SCENARIOS[scenarioId]
    ? scenarioId
    : DEFAULT_DEMO_SCENARIO_ID;
  const key = getScenarioStorageKey(validScenario);

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      const demo = createDemoDataState(validScenario);
      saveScenarioStateToStorage(validScenario, demo);
      return { state: demo, recoveredFromError: false };
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Estrutura de dados inválida no armazenamento local.');
    }

    const obj = parsed as Record<string, unknown>;
    const equipment = sanitizeEquipmentList(obj.equipment);
    const records = sanitizeRecordsList(obj.records);
    const rawSettings = obj.settings as Record<string, unknown> | undefined;

    if (!equipment || !records || !rawSettings || typeof rawSettings !== 'object') {
      throw new Error('Dados armazenados incompletos ou corrompidos.');
    }

    const defaultSettings = createScenarioDefaultSettings(validScenario);

    const establishmentName =
      typeof rawSettings.establishmentName === 'string' && rawSettings.establishmentName.trim()
        ? rawSettings.establishmentName.trim()
        : defaultSettings.establishmentName;
    const tariffPerKwh =
      typeof rawSettings.tariffPerKwh === 'number' &&
      Number.isFinite(rawSettings.tariffPerKwh) &&
      rawSettings.tariffPerKwh > 0
        ? rawSettings.tariffPerKwh
        : defaultSettings.tariffPerKwh;
    const anomalyThresholdPercent =
      typeof rawSettings.anomalyThresholdPercent === 'number' &&
      Number.isFinite(rawSettings.anomalyThresholdPercent) &&
      rawSettings.anomalyThresholdPercent >= 5 &&
      rawSettings.anomalyThresholdPercent <= 200
        ? rawSettings.anomalyThresholdPercent
        : defaultSettings.anomalyThresholdPercent;

    return {
      state: {
        version: DATA_SCHEMA_VERSION,
        scenarioId: validScenario,
        equipment,
        records,
        settings: {
          ...defaultSettings,
          establishmentName,
          establishmentDescription:
            typeof rawSettings.establishmentDescription === 'string' &&
            rawSettings.establishmentDescription.trim()
              ? rawSettings.establishmentDescription.trim()
              : defaultSettings.establishmentDescription,
          tariffPerKwh,
          referenceLocation:
            typeof rawSettings.referenceLocation === 'string' &&
            rawSettings.referenceLocation.trim()
              ? rawSettings.referenceLocation.trim()
              : defaultSettings.referenceLocation,
          consumerClass:
            typeof rawSettings.consumerClass === 'string' && rawSettings.consumerClass.trim()
              ? rawSettings.consumerClass.trim()
              : defaultSettings.consumerClass,
          tariffSource:
            typeof rawSettings.tariffSource === 'string' && rawSettings.tariffSource.trim()
              ? rawSettings.tariffSource.trim()
              : defaultSettings.tariffSource,
          tariffReferenceDate:
            typeof rawSettings.tariffReferenceDate === 'string' &&
            rawSettings.tariffReferenceDate.trim()
              ? rawSettings.tariffReferenceDate.trim()
              : defaultSettings.tariffReferenceDate,
          tariffTaxNote:
            typeof rawSettings.tariffTaxNote === 'string' && rawSettings.tariffTaxNote.trim()
              ? rawSettings.tariffTaxNote.trim()
              : defaultSettings.tariffTaxNote,
          anomalyThresholdPercent,
          isDemoProfile:
            rawSettings.isDemoProfile !== undefined ? Boolean(rawSettings.isDemoProfile) : true,
        },
        alertStates: sanitizeAlertStates(obj.alertStates),
      },
      recoveredFromError: false,
    };
  } catch {
    const demo = createDemoDataState(validScenario);
    saveScenarioStateToStorage(validScenario, demo);
    return {
      state: demo,
      recoveredFromError: true,
      errorMessage:
        'Os dados locais deste cenário estavam corrompidos ou indisponíveis. O cenário demonstrativo foi restaurado automaticamente.',
    };
  }
}

export function saveScenarioStateToStorage(
  scenarioId: DemoScenarioId,
  state: AppDataState,
): { ok: boolean; error?: string } {
  const key = getScenarioStorageKey(scenarioId);
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...state, scenarioId }));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Não foi possível salvar no armazenamento local do navegador (verifique permissões ou limite de espaço).',
    };
  }
}

export function restoreScenarioInStorage(scenarioId: DemoScenarioId): AppDataState {
  const fresh = createDemoDataState(scenarioId);
  saveScenarioStateToStorage(scenarioId, fresh);
  return fresh;
}

export function loadStateFromStorage(): StorageLoadResult {
  const activeScenario = loadActiveScenarioIdFromStorage();
  return loadScenarioStateFromStorage(activeScenario);
}

export function saveStateToStorage(state: AppDataState): { ok: boolean; error?: string } {
  const scenarioId = state.scenarioId ?? loadActiveScenarioIdFromStorage();
  return saveScenarioStateToStorage(scenarioId, state);
}
