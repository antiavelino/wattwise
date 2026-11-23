import { createDemoDataState, DATA_SCHEMA_VERSION } from '../data/demoData';
import {
  AppDataState,
  ConsumptionRecord,
  EQUIPMENT_CATEGORIES,
  Equipment,
  EquipmentCategory,
} from '../types/energy';
import { isEquipmentStatus, isValidIsoDate } from '../utils/validators';

export const STORAGE_KEY = 'wattwise_state_v1';

export interface StorageLoadResult {
  state: AppDataState;
  recoveredFromError: boolean;
  errorMessage?: string;
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

    sanitized.push({
      id,
      name,
      category,
      powerWatts,
      status,
      isDemo: Boolean(candidate.isDemo),
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    });
  }

  return sanitized;
}

function sanitizeRecordsList(raw: unknown): ConsumptionRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const sanitized: ConsumptionRecord[] = [];
  const seenDates = new Set<string>();

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

    if (!id || !date || consumptionKwh === null || seenDates.has(date)) continue;
    seenDates.add(date);

    sanitized.push({
      id,
      date,
      consumptionKwh,
      note: typeof candidate.note === 'string' && candidate.note.trim() ? candidate.note.trim() : undefined,
      isDemo: Boolean(candidate.isDemo),
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    });
  }

  return sanitized;
}

export function loadStateFromStorage(): StorageLoadResult {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = createDemoDataState();
      saveStateToStorage(demo);
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

    const establishmentName =
      typeof rawSettings.establishmentName === 'string' && rawSettings.establishmentName.trim()
        ? rawSettings.establishmentName.trim()
        : 'Estabelecimento sem nome';
    const tariffPerKwh =
      typeof rawSettings.tariffPerKwh === 'number' &&
      Number.isFinite(rawSettings.tariffPerKwh) &&
      rawSettings.tariffPerKwh > 0
        ? rawSettings.tariffPerKwh
        : 0.92;
    const anomalyThresholdPercent =
      typeof rawSettings.anomalyThresholdPercent === 'number' &&
      Number.isFinite(rawSettings.anomalyThresholdPercent) &&
      rawSettings.anomalyThresholdPercent >= 5 &&
      rawSettings.anomalyThresholdPercent <= 200
        ? rawSettings.anomalyThresholdPercent
        : 20;

    return {
      state: {
        version: DATA_SCHEMA_VERSION,
        equipment,
        records,
        settings: {
          establishmentName,
          tariffPerKwh,
          anomalyThresholdPercent,
          isDemoProfile: Boolean(rawSettings.isDemoProfile),
        },
      },
      recoveredFromError: false,
    };
  } catch {
    const demo = createDemoDataState();
    saveStateToStorage(demo);
    return {
      state: demo,
      recoveredFromError: true,
      errorMessage:
        'Os dados locais estavam corrompidos ou indisponíveis. O ambiente demonstrativo foi restaurado automaticamente.',
    };
  }
}

export function saveStateToStorage(state: AppDataState): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Não foi possível salvar no armazenamento local do navegador (verifique permissões ou limite de espaço).',
    };
  }
}
