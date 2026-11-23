import {
  ConsumptionRecord,
  EQUIPMENT_CATEGORIES,
  EquipmentCategory,
  EquipmentStatus,
} from '../types/energy';

export interface EquipmentValidationErrors {
  name?: string;
  category?: string;
  location?: string;
  powerWatts?: string;
  quantity?: string;
  dailyUsageHours?: string;
  status?: string;
}

export interface RecordValidationErrors {
  date?: string;
  consumptionKwh?: string;
  meterReadings?: string;
  note?: string;
}

export interface SettingsValidationErrors {
  establishmentName?: string;
  tariffPerKwh?: string;
  anomalyThresholdPercent?: string;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 2000 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function parseNumericInput(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return Number.NaN;
  return Number(normalized);
}

export function validateEquipmentInput(input: {
  name: string;
  category: string;
  powerWattsRaw: string;
  status: string;
  location?: string;
  quantityRaw?: string;
  dailyUsageHoursRaw?: string;
}): {
  isValid: boolean;
  errors: EquipmentValidationErrors;
  parsedPowerWatts: number;
  parsedQuantity: number;
  parsedDailyUsageHours: number;
} {
  const errors: EquipmentValidationErrors = {};
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    errors.name = 'Informe o nome do equipamento.';
  } else if (trimmedName.length < 2) {
    errors.name = 'O nome deve ter pelo menos 2 caracteres.';
  } else if (trimmedName.length > 80) {
    errors.name = 'O nome pode ter no máximo 80 caracteres.';
  }

  if (!EQUIPMENT_CATEGORIES.includes(input.category as EquipmentCategory)) {
    errors.category = 'Selecione uma categoria válida.';
  }

  const parsedPower = parseNumericInput(input.powerWattsRaw);
  if (Number.isNaN(parsedPower) || !Number.isFinite(parsedPower)) {
    errors.powerWatts = 'Informe uma potência numérica válida em watts.';
  } else if (parsedPower <= 0) {
    errors.powerWatts = 'A potência deve ser maior que 0 W.';
  } else if (parsedPower > 1_000_000) {
    errors.powerWatts = 'Informe uma potência de até 1.000.000 W.';
  }

  let parsedQuantity = 1;
  if (input.quantityRaw !== undefined && input.quantityRaw.trim() !== '') {
    parsedQuantity = parseNumericInput(input.quantityRaw);
    if (
      Number.isNaN(parsedQuantity) ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > 5000
    ) {
      errors.quantity = 'A quantidade deve estar entre 1 e 5.000 unidades.';
    }
  }

  let parsedDailyUsageHours = 8;
  if (input.dailyUsageHoursRaw !== undefined && input.dailyUsageHoursRaw.trim() !== '') {
    parsedDailyUsageHours = parseNumericInput(input.dailyUsageHoursRaw);
    if (
      Number.isNaN(parsedDailyUsageHours) ||
      !Number.isFinite(parsedDailyUsageHours) ||
      parsedDailyUsageHours < 0 ||
      parsedDailyUsageHours > 24
    ) {
      errors.dailyUsageHours = 'As horas de uso diário devem estar entre 0 e 24 h.';
    }
  }

  if (input.status !== 'active' && input.status !== 'inactive') {
    errors.status = 'Selecione um status válido.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    parsedPowerWatts: Math.round(parsedPower),
    parsedQuantity: Math.max(1, Math.round(parsedQuantity || 1)),
    parsedDailyUsageHours: Math.round((parsedDailyUsageHours || 0) * 10) / 10,
  };
}

export function validateRecordInput(
  input: {
    date: string;
    consumptionKwhRaw: string;
    note: string;
    equipmentId?: string;
  },
  existingRecords: ConsumptionRecord[],
  editingRecordId?: string,
): { isValid: boolean; errors: RecordValidationErrors; parsedKwh: number } {
  const errors: RecordValidationErrors = {};
  const trimmedDate = input.date.trim();
  const targetEquipmentId = input.equipmentId || undefined;

  if (!trimmedDate) {
    errors.date = 'Selecione a data do registro.';
  } else if (!isValidIsoDate(trimmedDate)) {
    errors.date = 'Informe uma data válida.';
  } else {
    const duplicate = existingRecords.find(
      (record) =>
        record.date === trimmedDate &&
        (record.equipmentId || undefined) === targetEquipmentId &&
        record.id !== editingRecordId,
    );
    if (duplicate) {
      errors.date =
        'Já existe um registro para esta data. Edite o lançamento existente ou escolha outro dia.';
    }
  }

  const parsedKwh = parseNumericInput(input.consumptionKwhRaw);
  if (Number.isNaN(parsedKwh) || !Number.isFinite(parsedKwh)) {
    errors.consumptionKwh = 'Informe um valor numérico válido em kWh.';
  } else if (parsedKwh < 0) {
    errors.consumptionKwh = 'O consumo não pode ser negativo.';
  } else if (parsedKwh > 100_000) {
    errors.consumptionKwh = 'Informe um consumo diário de até 100.000 kWh.';
  }

  if (input.note.trim().length > 160) {
    errors.note = 'A observação pode ter no máximo 160 caracteres.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    parsedKwh: Math.round(parsedKwh * 100) / 100,
  };
}

export function validateSettingsInput(input: {
  establishmentName: string;
  tariffPerKwhRaw: string;
  anomalyThresholdPercentRaw: string;
}): {
  isValid: boolean;
  errors: SettingsValidationErrors;
  parsedTariff: number;
  parsedThreshold: number;
} {
  const errors: SettingsValidationErrors = {};
  const trimmedName = input.establishmentName.trim();

  if (!trimmedName) {
    errors.establishmentName = 'Informe o nome do estabelecimento.';
  } else if (trimmedName.length < 2) {
    errors.establishmentName = 'O nome deve ter pelo menos 2 caracteres.';
  } else if (trimmedName.length > 80) {
    errors.establishmentName = 'O nome pode ter no máximo 80 caracteres.';
  }

  const parsedTariff = parseNumericInput(input.tariffPerKwhRaw);
  if (Number.isNaN(parsedTariff) || !Number.isFinite(parsedTariff)) {
    errors.tariffPerKwh = 'Informe uma tarifa válida em R$/kWh.';
  } else if (parsedTariff <= 0) {
    errors.tariffPerKwh = 'A tarifa deve ser maior que R$ 0,00.';
  } else if (parsedTariff > 50) {
    errors.tariffPerKwh = 'Informe uma tarifa de até R$ 50,00/kWh.';
  }

  const parsedThreshold = parseNumericInput(input.anomalyThresholdPercentRaw);
  if (Number.isNaN(parsedThreshold) || !Number.isFinite(parsedThreshold)) {
    errors.anomalyThresholdPercent = 'Informe um limite percentual válido.';
  } else if (parsedThreshold < 5 || parsedThreshold > 200) {
    errors.anomalyThresholdPercent = 'O limite deve estar entre 5% e 200%.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    parsedTariff: Math.round(parsedTariff * 1000) / 1000,
    parsedThreshold: Math.round(parsedThreshold * 10) / 10,
  };
}

export function isEquipmentStatus(value: unknown): value is EquipmentStatus {
  return value === 'active' || value === 'inactive';
}
