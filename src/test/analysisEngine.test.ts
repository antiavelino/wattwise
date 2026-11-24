import { describe, expect, it } from 'vitest';
import {
  createDemoDataState,
  DEMO_SCENARIO_LIST,
  OFFICIAL_EMISSION_REFERENCE,
  OFFICIAL_TARIFF_REFERENCE,
} from '../data/demoData';
import {
  BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
  buildMonthlyComparison,
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
} from '../utils/validators';

const DEFAULT_SETTINGS: AppSettings = {
  establishmentName: 'Cafeteria Grão & Vapor',
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
    usageFactor: overrides.usageFactor ?? 1,
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
  it('calcula corretamente o consumo energético kWh = (W / 1000) * horas * quantidade * dias * fator', () => {
    // 1500 W * 8h * 2 un * 1 dia / 1000 = 24 kWh
    expect(calculateEquipmentEnergyKwh(1500, 8, 2, 1)).toBe(24);
    // 1500 W * 8h * 2 un * 30 dias / 1000 = 720 kWh
    expect(calculateEquipmentEnergyKwh(1500, 8, 2, 30)).toBe(720);
    // Com fator de operação 0.5 (50%): 1500 W * 8h * 2 un * 30 dias * 0.5 / 1000 = 360 kWh
    expect(calculateEquipmentEnergyKwh(1500, 8, 2, 30, 0.5)).toBe(360);
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
      name: 'Forno Turbo',
      category: 'Cocção e Aquecimento',
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

    expect(result.activeInstalledPowerWatts).toBe(6000);
    expect(result.estimatedEquipmentMonthlyKwh).toBe(870);

    const ovenSummary = result.equipmentSummaries.find(
      (s) => s.equipment.id === 'eq_high_w',
    )!;
    const fridgeSummary = result.equipmentSummaries.find((s) => s.equipment.id === 'eq_cont')!;

    expect(ovenSummary.totalRatedPowerWatts).toBe(5000);
    expect(ovenSummary.estimatedDailyKwh).toBe(5);
    expect(ovenSummary.estimatedMonthlyKwh).toBe(150);

    expect(fridgeSummary.totalRatedPowerWatts).toBe(1000);
    expect(fridgeSummary.estimatedDailyKwh).toBe(24);
    expect(fridgeSummary.estimatedMonthlyKwh).toBe(720);
  });

  it('calcula o custo financeiro calculateEnergyCostBrl com arredondamento e trata valores inválidos', () => {
    expect(calculateEnergyCostBrl(100, 0.79)).toBe(79);
    expect(calculateEnergyCostBrl(15.55, 0.95)).toBe(14.77);
    expect(calculateEnergyCostBrl(0, 0.79)).toBe(0);
    expect(calculateEnergyCostBrl(-10, 0.79)).toBe(0);
    expect(calculateEnergyCostBrl(100, 0)).toBe(0);
    expect(calculateEnergyCostBrl(100, -0.5)).toBe(0);
    expect(calculateEnergyCostBrl(Number.NaN, 0.79)).toBe(0);
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
    expect(calculateLinearTrendSlope([10, 15, 20, 25, 30])).toBe(5);
    expect(calculateLinearTrendSlope([20, 18, 16, 14])).toBe(-2);
    expect(calculateLinearTrendSlope([15, 15, 15, 15])).toBe(0);
  });
});

describe('Comparativo Mensal Consolidado (buildMonthlyComparison) — Correção de Bugs e Precisão', () => {
  it('agrupa registros por YYYY-MM sem erro de fuso horário nos dias 01 e 31, ordena cronologicamente e deduplica IDs', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'nov_1', date: '2026-11-01', consumptionKwh: 50 }),
      makeRecord({ id: 'sep_1', date: '2026-09-01', consumptionKwh: 40 }),
      makeRecord({ id: 'oct_1', date: '2026-10-01', consumptionKwh: 45 }),
      makeRecord({ id: 'oct_31', date: '2026-10-31', consumptionKwh: 55 }),
      // Duplicata exata do mesmo ID deve ser ignorada
      makeRecord({ id: 'oct_31', date: '2026-10-31', consumptionKwh: 55 }),
    ];

    const monthly = buildMonthlyComparison(records, 1.0);
    expect(monthly).toHaveLength(3);

    expect(monthly[0].monthKey).toBe('2026-09');
    expect(monthly[0].monthLabel).toBe('Set/26');
    expect(monthly[0].totalKwh).toBe(40);
    expect(monthly[0].daysCount).toBe(1);
    expect(monthly[0].totalVariationPercent).toBeNull();
    expect(monthly[0].dailyAvgVariationPercent).toBeNull();

    expect(monthly[1].monthKey).toBe('2026-10');
    expect(monthly[1].monthLabel).toBe('Out/26');
    expect(monthly[1].totalKwh).toBe(100); // 45 + 55
    expect(monthly[1].daysCount).toBe(2);
    expect(monthly[1].averageDailyKwh).toBe(50);
    expect(monthly[1].previousMonthKey).toBe('2026-09');
    expect(monthly[1].totalVariationPercent).toBe(150); // (100 - 40) / 40 * 100
    expect(monthly[1].dailyAvgVariationPercent).toBe(25); // (50 - 40) / 40 * 100

    expect(monthly[2].monthKey).toBe('2026-11');
    expect(monthly[2].monthLabel).toBe('Nov/26');
    expect(monthly[2].totalKwh).toBe(50);
    expect(monthly[2].daysCount).toBe(1);
    expect(monthly[2].averageDailyKwh).toBe(50);
    expect(monthly[2].dailyAvgVariationPercent).toBe(0); // 50 vs 50
    expect(monthly[2].totalVariationPercent).toBe(-50); // 50 vs 100
  });

  it('não gera NaN nem Infinity quando o mês anterior tem consumo zero', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'm_zero', date: '2026-08-10', consumptionKwh: 0 }),
      makeRecord({ id: 'm_pos', date: '2026-09-10', consumptionKwh: 45 }),
    ];

    const monthly = buildMonthlyComparison(records, 0.79);
    expect(monthly).toHaveLength(2);
    expect(monthly[0].totalKwh).toBe(0);
    expect(monthly[1].totalKwh).toBe(45);
    expect(monthly[1].totalVariationPercent).toBeNull();
    expect(monthly[1].dailyAvgVariationPercent).toBeNull();
  });

  it('conta dias únicos corretamente quando há múltiplos registros na mesma data (ex.: geral + equipamento)', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'r_gen', date: '2026-10-15', consumptionKwh: 30 }),
      makeRecord({ id: 'r_eq', date: '2026-10-15', consumptionKwh: 10, equipmentId: 'eq_1' }),
      makeRecord({ id: 'r_next', date: '2026-10-16', consumptionKwh: 40 }),
    ];

    const monthly = buildMonthlyComparison(records, 1.0);
    expect(monthly).toHaveLength(1);
    expect(monthly[0].totalKwh).toBe(80);
    expect(monthly[0].daysCount).toBe(2); // Apenas 2 dias únicos (15/10 e 16/10)
    expect(monthly[0].averageDailyKwh).toBe(40); // 80 / 2 dias
  });
});

describe('Cenários Demonstrativos Reais (Cafeteria, Mercado, Barbearia, Padaria)', () => {
  it('valida que os 4 cenários possuem equipamentos reais verificados, tarifa ANEEL e 65 dias simulados em múltiplos meses', () => {
    expect(DEMO_SCENARIO_LIST).toHaveLength(4);

    for (const meta of DEMO_SCENARIO_LIST) {
      const state = createDemoDataState(meta.id);
      expect(state.scenarioId).toBe(meta.id);
      expect(state.settings.tariffPerKwh).toBe(OFFICIAL_TARIFF_REFERENCE.tariffPerKwh);
      expect(state.settings.emissionFactorKgPerKwh).toBe(
        OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh,
      );
      expect(state.equipment.length).toBeGreaterThanOrEqual(6);
      expect(state.records).toHaveLength(65);

      for (const eq of state.equipment) {
        expect(eq.manufacturer?.trim().length).toBeGreaterThan(1);
        expect(eq.model?.trim().length).toBeGreaterThan(1);
        expect(eq.powerWatts).toBeGreaterThan(0);
        expect(eq.technicalSource?.trim().length).toBeGreaterThan(5);
        expect(eq.sourceUrl).toMatch(/^https?:\/\//);
      }

      const analysis = runEnergyAnalysis(
        state.equipment,
        state.records,
        state.settings,
        state.alertStates,
        state.records,
      );
      expect(analysis.monthlyComparison.length).toBeGreaterThanOrEqual(2);
      expect(analysis.anomalies.length).toBeGreaterThanOrEqual(2);
      expect(analysis.systemAlerts.length).toBeGreaterThanOrEqual(2);
    }
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
    expect(res2.systemAlerts.some((a) => a.category === 'insufficient_data')).toBe(true);

    const threeRecords = [
      ...twoRecords,
      makeRecord({ id: 'r3', date: '2026-03-03', consumptionKwh: 24 }),
    ];
    const res3 = runEnergyAnalysis([], threeRecords, DEFAULT_SETTINGS);
    expect(res3.hasEnoughDataForForecast).toBe(true);
    expect(res3.recordsNeededForForecast).toBe(0);
    expect(res3.historicalAverageKwh).toBe(22);
    expect(res3.monthlyForecastKwh).toBe(660);
    expect(res3.estimatedMonthlyCostBrl).toBe(660);

    expect(res3.hasEnoughDataForAnomalies).toBe(false);
    expect(res3.recordsNeededForAnomalies).toBe(1);
  });

  it('detecta anomalias usando janela móvel anterior de até 7 dias com severidade warning vs critical', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'd1', date: '2026-03-01', consumptionKwh: 20 }),
      makeRecord({ id: 'd2', date: '2026-03-02', consumptionKwh: 20 }),
      makeRecord({ id: 'd3', date: '2026-03-03', consumptionKwh: 20 }),
      makeRecord({ id: 'd4', date: '2026-03-04', consumptionKwh: 25 }),
      makeRecord({ id: 'd5', date: '2026-03-05', consumptionKwh: 20 }),
      makeRecord({ id: 'd6', date: '2026-03-06', consumptionKwh: 20 }),
      makeRecord({ id: 'd7', date: '2026-03-07', consumptionKwh: 20 }),
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
  });

  it('preserva o ciclo de vida e estados de reconhecimento dos alertas (open, acknowledged, resolved)', () => {
    const records: ConsumptionRecord[] = [
      makeRecord({ id: 'd1', date: '2026-03-01', consumptionKwh: 10 }),
      makeRecord({ id: 'd2', date: '2026-03-02', consumptionKwh: 10 }),
      makeRecord({ id: 'd3', date: '2026-03-03', consumptionKwh: 10 }),
      makeRecord({ id: 'd4', date: '2026-03-04', consumptionKwh: 15 }),
      makeRecord({ id: 'd5', date: '2026-03-05', consumptionKwh: 18 }),
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

    const resWithAck = runEnergyAnalysis([], records, DEFAULT_SETTINGS, alertStates);
    const alertD4 = resWithAck.anomalies.find((a) => a.id === 'anomaly_d4')!;
    const alertD5 = resWithAck.anomalies.find((a) => a.id === 'anomaly_d5')!;

    expect(alertD4.status).toBe('acknowledged');
    expect(alertD5.status).toBe('resolved');
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

  it('valida entrada de equipamentos com fator de operação (validateEquipmentInput)', () => {
    const valid = validateEquipmentInput({
      name: 'Forno Prática Miniconv',
      category: 'Cocção e Aquecimento',
      powerWattsRaw: '2560',
      usageFactorRaw: '0,65',
      status: 'active',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.parsedPowerWatts).toBe(2560);
    expect(valid.parsedUsageFactor).toBe(0.65);

    const invalid = validateEquipmentInput({
      name: 'A',
      category: 'Categoria Inexistente',
      powerWattsRaw: '-50',
      usageFactorRaw: '1.5',
      status: 'broken',
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.name).toBeDefined();
    expect(invalid.errors.category).toBeDefined();
    expect(invalid.errors.powerWatts).toBeDefined();
    expect(invalid.errors.usageFactor).toBeDefined();
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

    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-03-15')).toBe(true);
    expect(parseNumericInput('14,75')).toBe(14.75);
  });

  it('calcula impacto ambiental com fator oficial SIN/MCTI (0,0385 kg CO2/kWh) e potencial anual de 10%', () => {
    expect(calculateCo2EmissionsKg(100)).toBe(3.85);
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
    expect(result.environmentalImpact.periodCo2Kg).toBe(5.78); // 150 * 0.0385 = 5.775 -> 5.78
    expect(result.environmentalImpact.monthlyForecastCo2Kg).toBe(57.75); // 1500 * 0.0385
    expect(result.environmentalImpact.tenPercentAnnualCo2SavedKg).toBe(69.3); // 57.75 * 0.1 * 12
  });
});
