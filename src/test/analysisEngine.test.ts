import { describe, expect, it } from 'vitest';
import {
  BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
  calculateCo2EmissionsKg,
  calculateCumulativeMeterDelta,
  calculateEnergyCostBrl,
  calculateEquipmentEnergyKwh,
  calculateLinearTrendSlope,
  calculateMean,
  calculateStandardDeviation,
  MIN_RECORDS_FOR_ANOMALIES,
  MIN_RECORDS_FOR_FORECAST,
  runEnergyAnalysis,
} from '../engine/analysisEngine';
import {
  AlertAcknowledgement,
  AppSettings,
  ConsumptionRecord,
  Equipment,
} from '../types/energy';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  formatShortDate,
  formatWatts,
} from '../utils/formatters';
import {
  isValidIsoDate,
  parseNumericInput,
  validateEquipmentInput,
  validateRecordInput,
  validateSettingsInput,
} from '../utils/validators';

const DEFAULT_SETTINGS: AppSettings = {
  establishmentName: 'Centro Automotivo Modelo',
  tariffPerKwh: 1.0,
  anomalyThresholdPercent: 20,
  preferredCurrency: 'BRL',
  timezone: 'America/Sao_Paulo',
  isDemoProfile: false,
};

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: overrides.id ?? 'eq_1',
    name: overrides.name ?? 'Ar-Condicionado Inverter 18000 BTUs',
    category: overrides.category ?? 'Climatização',
    powerWatts: overrides.powerWatts ?? 1500,
    quantity: overrides.quantity ?? 2,
    dailyUsageHours: overrides.dailyUsageHours ?? 8,
    status: overrides.status ?? 'active',
    updatedAt: overrides.updatedAt ?? '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<ConsumptionRecord> = {}): ConsumptionRecord {
  return {
    id: overrides.id ?? 'rec_1',
    date: overrides.date ?? '2026-03-01',
    consumptionKwh: overrides.consumptionKwh ?? 20,
    measurementType: overrides.measurementType ?? 'measured',
    source: overrides.source ?? 'manual',
    updatedAt: overrides.updatedAt ?? '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('Motor de Análise Energética — Fórmulas Físicas e Financeiras', () => {
  it('calcula corretamente o consumo energético kWh = (W * horas * quantidade * dias) / 1000', () => {
    // 1500 W * 8h * 2 un * 1 dia / 1000 = 24 kWh
    expect(calculateEquipmentEnergyKwh(1500, 8, 2, 1)).toBe(24);
    // 1500 W * 8h * 2 un * 30 dias / 1000 = 720 kWh
    expect(calculateEquipmentEnergyKwh(1500, 8, 2, 30)).toBe(720);
    // 250 W * 10h * 1 un * 1 dia / 1000 = 2.5 kWh
    expect(calculateEquipmentEnergyKwh(250, 10)).toBe(2.5);
  });

  it('trata casos extremos e faz clamping de horas diárias em calculateEquipmentEnergyKwh', () => {
    expect(calculateEquipmentEnergyKwh(0, 8, 1, 1)).toBe(0);
    expect(calculateEquipmentEnergyKwh(-500, 8, 1, 1)).toBe(0);
    expect(calculateEquipmentEnergyKwh(1000, -2, 1, 1)).toBe(0);
    expect(calculateEquipmentEnergyKwh(1000, 0, 1, 1)).toBe(0);
    expect(calculateEquipmentEnergyKwh(1000, 8, 0, 1)).toBe(0);
    expect(calculateEquipmentEnergyKwh(1000, 8, 1, 0)).toBe(0);
    expect(calculateEquipmentEnergyKwh(Number.NaN, 8, 1, 1)).toBe(0);
    // Clamping > 24h para 24h: 1000 W * 24h * 1 * 1 / 1000 = 24 kWh
    expect(calculateEquipmentEnergyKwh(1000, 36, 1, 1)).toBe(24);
  });

  it('diferencia potência nominal instalada (W/kW) de energia consumida (kWh)', () => {
    const eqHighPowerLowUsage = makeEquipment({
      id: 'eq_high_w',
      name: 'Compressor Trifásico',
      category: 'Maquinário',
      powerWatts: 5000, // 5 kW nominal
      quantity: 1,
      dailyUsageHours: 1, // apenas 1h/dia => 5 kWh/dia (150 kWh/mês)
      status: 'active',
    });
    const eqLowerPowerContinuous = makeEquipment({
      id: 'eq_cont',
      name: 'Câmara Fria',
      category: 'Refrigeração',
      powerWatts: 1000, // 1 kW nominal
      quantity: 1,
      dailyUsageHours: 24, // 24h/dia => 24 kWh/dia (720 kWh/mês)
      status: 'active',
    });

    const result = runEnergyAnalysis(
      [eqHighPowerLowUsage, eqLowerPowerContinuous],
      [],
      DEFAULT_SETTINGS,
    );

    // Potência nominal instalada total = 5000 W + 1000 W = 6000 W
    expect(result.activeInstalledPowerWatts).toBe(6000);
    // Energia mensal estimada dos equipamentos = 150 kWh + 720 kWh = 870 kWh
    expect(result.estimatedEquipmentMonthlyKwh).toBe(870);

    const compressorSummary = result.equipmentSummaries.find(
      (s) => s.equipment.id === 'eq_high_w',
    )!;
    const fridgeSummary = result.equipmentSummaries.find((s) => s.equipment.id === 'eq_cont')!;

    expect(compressorSummary.totalRatedPowerWatts).toBe(5000);
    expect(compressorSummary.estimatedDailyKwh).toBe(5);
    expect(compressorSummary.estimatedMonthlyKwh).toBe(150);

    expect(fridgeSummary.totalRatedPowerWatts).toBe(1000);
    expect(fridgeSummary.estimatedDailyKwh).toBe(24);
    expect(fridgeSummary.estimatedMonthlyKwh).toBe(720);
  });

  it('calcula o custo financeiro calculateEnergyCostBrl com arredondamento e trata valores inválidos', () => {
    expect(calculateEnergyCostBrl(100, 0.92)).toBe(92);
    expect(calculateEnergyCostBrl(15.55, 0.95)).toBe(14.77);
    expect(calculateEnergyCostBrl(0, 0.92)).toBe(0);
    expect(calculateEnergyCostBrl(-10, 0.92)).toBe(0);
    expect(calculateEnergyCostBrl(100, 0)).toBe(0);
    expect(calculateEnergyCostBrl(100, -0.5)).toBe(0);
    expect(calculateEnergyCostBrl(Number.NaN, 0.92)).toBe(0);
  });

  it('calcula o delta de leituras cumulativas do medidor e rejeita leituras regressivas ou negativas', () => {
    const valid = calculateCumulativeMeterDelta(1250.4, 1285.9);
    expect(valid.isValid).toBe(true);
    expect(valid.deltaKwh).toBe(35.5);

    const zeroDelta = calculateCumulativeMeterDelta(500, 500);
    expect(zeroDelta.isValid).toBe(true);
    expect(zeroDelta.deltaKwh).toBe(0);

    const regressive = calculateCumulativeMeterDelta(1300, 1290);
    expect(regressive.isValid).toBe(false);
    expect(regressive.error).toContain('não pode ser menor');

    const negative = calculateCumulativeMeterDelta(-10, 50);
    expect(negative.isValid).toBe(false);
    expect(negative.error).toContain('não negativos');
  });

  it('calcula média, desvio padrão e inclinação de tendência linear corretamente', () => {
    expect(calculateMean([])).toBeNull();
    expect(calculateMean([10, 20, 30])).toBe(20);

    expect(calculateStandardDeviation([10])).toBeNull();
    expect(calculateStandardDeviation([10, 10, 10])).toBe(0);
    expect(calculateStandardDeviation([10, 20])).toBe(5);

    expect(calculateLinearTrendSlope([10, 20])).toBeNull();
    // Crescimento linear de +5 kWh por dia
    expect(calculateLinearTrendSlope([10, 15, 20, 25, 30])).toBe(5);
    // Decréscimo linear de -2 kWh por dia
    expect(calculateLinearTrendSlope([20, 18, 16, 14])).toBe(-2);
    // Estável
    expect(calculateLinearTrendSlope([15, 15, 15, 15])).toBe(0);
  });
});

describe('runEnergyAnalysis — Previsão, Anomalias, Estados de Alerta e Recomendações', () => {
  it('sinaliza dados insuficientes quando há < 3 registros para previsão e < 4 para anomalias', () => {
    const twoRecords = [
      makeRecord({ id: 'r1', date: '2026-03-01', consumptionKwh: 20 }),
      makeRecord({ id: 'r2', date: '2026-03-02', consumptionKwh: 22 }),
    ];

    const res2 = runEnergyAnalysis([], twoRecords, DEFAULT_SETTINGS);
    expect(res2.hasEnoughDataForForecast).toBe(false);
    expect(res2.recordsNeededForForecast).toBe(MIN_RECORDS_FOR_FORECAST - 2);
    expect(res2.monthlyForecastKwh).toBeNull();
    expect(res2.estimatedMonthlyCostBrl).toBeNull();
    expect(res2.forecast.confidence).toBe('insufficient');

    expect(res2.hasEnoughDataForAnomalies).toBe(false);
    expect(res2.recordsNeededForAnomalies).toBe(MIN_RECORDS_FOR_ANOMALIES - 2);
    expect(res2.anomalies).toHaveLength(0);

    // Com 3 registros: previsão habilitada, mas anomalias ainda exigem 4 registros
    const threeRecords = [
      ...twoRecords,
      makeRecord({ id: 'r3', date: '2026-03-03', consumptionKwh: 24 }),
    ];
    const res3 = runEnergyAnalysis([], threeRecords, DEFAULT_SETTINGS);
    expect(res3.hasEnoughDataForForecast).toBe(true);
    expect(res3.recordsNeededForForecast).toBe(0);
    expect(res3.historicalAverageKwh).toBe(22);
    expect(res3.monthlyForecastKwh).toBe(660); // 22 kWh/dia * 30 dias
    expect(res3.estimatedMonthlyCostBrl).toBe(660); // tarifa R$ 1,00

    expect(res3.hasEnoughDataForAnomalies).toBe(false);
    expect(res3.recordsNeededForAnomalies).toBe(1);
  });

  it('detecta anomalias usando janela móvel anterior de até 7 dias com severidade warning vs critical e sensibilidade ao threshold', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'd1', date: '2026-03-01', consumptionKwh: 20 }),
      makeRecord({ id: 'd2', date: '2026-03-02', consumptionKwh: 20 }),
      makeRecord({ id: 'd3', date: '2026-03-03', consumptionKwh: 20 }),
      // Dia 4: 25 kWh => +25% sobre base de 20 kWh (threshold 20% => warning, pois < 30%)
      makeRecord({ id: 'd4', date: '2026-03-04', consumptionKwh: 25 }),
      makeRecord({ id: 'd5', date: '2026-03-05', consumptionKwh: 20 }),
      makeRecord({ id: 'd6', date: '2026-03-06', consumptionKwh: 20 }),
      makeRecord({ id: 'd7', date: '2026-03-07', consumptionKwh: 20 }),
      // Dia 8: janela anterior d1..d7 tem soma = 145, média = 20.714 kWh.
      // Com 30 kWh => desvio +44.8% (>= 20% * 1.5 = 30% => critical)
      makeRecord({ id: 'd8', date: '2026-03-08', consumptionKwh: 30 }),
    ];

    const analysis20 = runEnergyAnalysis([], records, {
      ...DEFAULT_SETTINGS,
      anomalyThresholdPercent: 20,
    });

    expect(analysis20.hasEnoughDataForAnomalies).toBe(true);
    expect(analysis20.anomalies).toHaveLength(2);

    const warningAlert = analysis20.anomalies.find((a) => a.recordId === 'd4')!;
    const criticalAlert = analysis20.anomalies.find((a) => a.recordId === 'd8')!;

    expect(warningAlert.severity).toBe('warning');
    expect(warningAlert.deviationPercent).toBe(25);
    expect(warningAlert.baselineDaysCount).toBe(3);

    expect(criticalAlert.severity).toBe('critical');
    expect(criticalAlert.baselineDaysCount).toBe(7);
    expect(criticalAlert.deviationPercent).toBeGreaterThanOrEqual(30);

    // Aumentando o threshold para 50%, nenhuma das leituras deve disparar anomalia
    const analysis50 = runEnergyAnalysis([], records, {
      ...DEFAULT_SETTINGS,
      anomalyThresholdPercent: 50,
    });
    expect(analysis50.anomalies).toHaveLength(0);
  });

  it('preserva o ciclo de vida e estados de reconhecimento dos alertas (open, acknowledged, resolved)', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'd1', date: '2026-03-01', consumptionKwh: 10 }),
      makeRecord({ id: 'd2', date: '2026-03-02', consumptionKwh: 10 }),
      makeRecord({ id: 'd3', date: '2026-03-03', consumptionKwh: 10 }),
      makeRecord({ id: 'd4', date: '2026-03-04', consumptionKwh: 15 }), // anomaly_d4
      makeRecord({ id: 'd5', date: '2026-03-05', consumptionKwh: 18 }), // anomaly_d5
    ];

    const alertStates: Record<string, AlertAcknowledgement> = {
      anomaly_d4: {
        status: 'acknowledged',
        acknowledgedBy: 'Maria Operadora',
        acknowledgedAt: '2026-03-04T15:00:00.000Z',
      },
      anomaly_d5: {
        status: 'resolved',
        acknowledgedBy: 'Carlos Admin',
        acknowledgedAt: '2026-03-05T18:00:00.000Z',
      },
    };

    const resDefault = runEnergyAnalysis([], records, DEFAULT_SETTINGS, {});
    expect(resDefault.anomalies.every((a) => a.status === 'open')).toBe(true);

    const resWithAck = runEnergyAnalysis([], records, DEFAULT_SETTINGS, alertStates);
    const alertD4 = resWithAck.anomalies.find((a) => a.id === 'anomaly_d4')!;
    const alertD5 = resWithAck.anomalies.find((a) => a.id === 'anomaly_d5')!;

    expect(alertD4.status).toBe('acknowledged');
    expect(alertD4.acknowledgedBy).toBe('Maria Operadora');
    expect(alertD5.status).toBe('resolved');
    expect(alertD5.acknowledgedBy).toBe('Carlos Admin');
  });

  it('separa estritamente os totais measured, estimated e simulated', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({
        id: 'm1',
        date: '2026-03-01',
        consumptionKwh: 30.5,
        measurementType: 'measured',
      }),
      makeRecord({
        id: 'e1',
        date: '2026-03-02',
        consumptionKwh: 15.25,
        measurementType: 'estimated',
      }),
      makeRecord({
        id: 's1',
        date: '2026-03-03',
        consumptionKwh: 10.75,
        measurementType: 'simulated',
        isDemo: true,
      }),
    ];

    const result = runEnergyAnalysis([], records, DEFAULT_SETTINGS);
    expect(result.measuredTotalKwh).toBe(30.5);
    expect(result.estimatedTotalKwh).toBe(15.25);
    expect(result.simulatedTotalKwh).toBe(10.75);
    expect(result.periodTotalKwh).toBe(56.5);
    expect(result.hasDemoData).toBe(true);
    expect(result.demoRecordsCount).toBe(1);
  });

  it('gera recomendações estruturadas com reason, evidence, estimatedImpact e suggestedAction', () => {
    const equipment = [
      makeEquipment({
        id: 'eq_hvac',
        name: 'Split Cassete 36000 BTUs',
        category: 'Climatização',
        powerWatts: 3500,
        quantity: 2,
        dailyUsageHours: 10,
        status: 'active',
      }),
    ];
    const records = [
      makeRecord({ id: 'r1', date: '2026-03-01', consumptionKwh: 20 }),
      makeRecord({ id: 'r2', date: '2026-03-02', consumptionKwh: 20 }),
      makeRecord({ id: 'r3', date: '2026-03-03', consumptionKwh: 20 }),
      makeRecord({ id: 'r4', date: '2026-03-04', consumptionKwh: 32 }),
    ];

    const result = runEnergyAnalysis(equipment, records, DEFAULT_SETTINGS);
    expect(result.recommendations.length).toBeGreaterThan(0);

    for (const rec of result.recommendations) {
      expect(rec.reason.trim().length).toBeGreaterThan(5);
      expect(rec.evidence.trim().length).toBeGreaterThan(5);
      expect(rec.estimatedImpact.trim().length).toBeGreaterThan(5);
      expect(rec.suggestedAction.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('Formatadores e Validadores (validators.ts & formatters.ts)', () => {
  it('formata potência em W ou kW, energia em kWh, moeda em BRL e datas corretamente', () => {
    expect(formatPower(750)).toBe('750 W');
    expect(formatPower(1500)).toContain('1,50 kW');
    expect(formatWatts(1500)).toContain('1.500 W');
    expect(formatKwh(24.5, 1)).toContain('24,5 kWh');
    expect(formatKwh(24.56, 2)).toContain('24,56 kWh');
    expect(formatCurrencyBRL(125.5)).toMatch(/R\$\s*125,50/);
    expect(formatPercent(15.4, true)).toBe('+15,4%');
    expect(formatPercent(-8.2, true)).toBe('-8,2%');
    expect(formatShortDate('2026-03-15')).toBe('15/03');
    expect(formatFullDate('2026-03-15')).toBe('15/03/2026');
  });

  it('valida entrada de equipamentos (validateEquipmentInput)', () => {
    const valid = validateEquipmentInput({
      name: 'Compressor Rotativo',
      category: 'Maquinário',
      powerWattsRaw: '2200',
      status: 'active',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.parsedPowerWatts).toBe(2200);

    const invalid = validateEquipmentInput({
      name: 'A',
      category: 'Categoria Inexistente',
      powerWattsRaw: '-50',
      status: 'broken',
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.name).toBeDefined();
    expect(invalid.errors.category).toBeDefined();
    expect(invalid.errors.powerWatts).toBeDefined();
    expect(invalid.errors.status).toBeDefined();
  });

  it('valida entrada de registros diários e impede datas duplicadas (validateRecordInput)', () => {
    const existing: ConsumptionRecord[] = [
      makeRecord({ id: 'rec_existing', date: '2026-03-10', consumptionKwh: 30 }),
    ];

    const valid = validateRecordInput(
      { date: '2026-03-11', consumptionKwhRaw: '28,45', note: 'Operação normal' },
      existing,
    );
    expect(valid.isValid).toBe(true);
    expect(valid.parsedKwh).toBe(28.45);

    const duplicateDate = validateRecordInput(
      { date: '2026-03-10', consumptionKwhRaw: '31', note: '' },
      existing,
    );
    expect(duplicateDate.isValid).toBe(false);
    expect(duplicateDate.errors.date).toContain('Já existe um registro');

    // Permitido quando estamos editando o próprio registro
    const editingSame = validateRecordInput(
      { date: '2026-03-10', consumptionKwhRaw: '31', note: '' },
      existing,
      'rec_existing',
    );
    expect(editingSame.isValid).toBe(true);

    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-03-15')).toBe(true);
    expect(parseNumericInput('14,75')).toBe(14.75);
  });

  it('valida configurações de tarifa e limite de anomalia (validateSettingsInput)', () => {
    const valid = validateSettingsInput({
      establishmentName: 'Unidade Matriz',
      tariffPerKwhRaw: '0,94',
      anomalyThresholdPercentRaw: '25',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.parsedTariff).toBe(0.94);
    expect(valid.parsedThreshold).toBe(25);

    const invalid = validateSettingsInput({
      establishmentName: '',
      tariffPerKwhRaw: '0',
      anomalyThresholdPercentRaw: '3',
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.establishmentName).toBeDefined();
    expect(invalid.errors.tariffPerKwh).toBeDefined();
    expect(invalid.errors.anomalyThresholdPercent).toBeDefined();
  });

  it('calcula impacto ambiental (kg CO2e) e potencial anual de redução de 10%', () => {
    expect(calculateCo2EmissionsKg(100)).toBe(8.17);
    expect(calculateCo2EmissionsKg(0)).toBe(0);
    expect(calculateCo2EmissionsKg(-50)).toBe(0);

    const records = [
      makeRecord({ id: 'c1', date: '2026-03-01', consumptionKwh: 50 }),
      makeRecord({ id: 'c2', date: '2026-03-02', consumptionKwh: 50 }),
      makeRecord({ id: 'c3', date: '2026-03-03', consumptionKwh: 50 }),
    ];
    const result = runEnergyAnalysis([], records, DEFAULT_SETTINGS);
    expect(result.environmentalImpact.emissionFactorKgPerKwh).toBe(
      BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
    );
    expect(result.environmentalImpact.periodCo2Kg).toBe(12.26); // 150 * 0.0817 = 12.255 -> 12.26
    expect(result.environmentalImpact.monthlyForecastCo2Kg).toBe(122.55); // 1500 * 0.0817
    expect(result.environmentalImpact.tenPercentAnnualCo2SavedKg).toBe(147.06); // 122.55 * 0.1 * 12
  });
});
