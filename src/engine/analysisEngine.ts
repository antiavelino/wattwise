import {
  OFFICIAL_EMISSION_REFERENCE,
  OFFICIAL_TARIFF_REFERENCE,
} from '../data/demoData';
import {
  AlertAcknowledgement,
  AnalysisResult,
  AnomalyAlert,
  AppSettings,
  CategoryLoadSummary,
  ChartPoint,
  ConsumptionRecord,
  EnvironmentalImpactSummary,
  Equipment,
  EquipmentCategory,
  EquipmentConsumptionSummary,
  ForecastAnalysis,
  ForecastConfidence,
  MeasurementType,
  MonthlyComparisonPoint,
  PeriodComparisonSummary,
  Recommendation,
  SystemAlert,
} from '../types/energy';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  formatShortDate,
  getTodayIsoDate,
} from '../utils/formatters';

export const MIN_RECORDS_FOR_FORECAST = 3;
export const MIN_BASELINE_DAYS_FOR_ANOMALY = 3;
export const MIN_RECORDS_FOR_ANOMALIES = MIN_BASELINE_DAYS_FOR_ANOMALY + 1;
const ROLLING_BASELINE_WINDOW = 7;
const FORECAST_WINDOW_DAYS = 30;
const DAYS_IN_MONTH = 30;

/**
 * Fator médio anual oficial de emissão de CO2 da matriz elétrica brasileira (SIN),
 * publicado pelo MCTI / SIRENE (0,0385 tCO2/MWh = 0,0385 kg CO2/kWh).
 */
export const BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH =
  OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh;

/**
 * Estima emissões de CO2 (kg CO2) a partir da energia elétrica (kWh).
 */
export function calculateCo2EmissionsKg(
  energyKwh: number,
  emissionFactor = BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
): number {
  if (
    !Number.isFinite(energyKwh) ||
    energyKwh <= 0 ||
    !Number.isFinite(emissionFactor) ||
    emissionFactor <= 0
  ) {
    return 0;
  }
  return roundTo(energyKwh * emissionFactor, 2);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Fórmula física de consumo energético:
 * Consumo (kWh) = (Potência em W ÷ 1000) × Tempo (horas) × Quantidade × Dias × Fator de Operação
 * Diferencia potência nominal instalada (W / kW) de energia efetivamente consumida (kWh).
 */
export function calculateEquipmentEnergyKwh(
  powerWatts: number,
  hoursPerDay: number,
  quantity = 1,
  days = 1,
  usageFactor = 1,
): number {
  if (
    !Number.isFinite(powerWatts) ||
    !Number.isFinite(hoursPerDay) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(days) ||
    !Number.isFinite(usageFactor) ||
    powerWatts <= 0 ||
    hoursPerDay < 0 ||
    quantity <= 0 ||
    days <= 0 ||
    usageFactor <= 0
  ) {
    return 0;
  }
  const safeHours = Math.min(24, Math.max(0, hoursPerDay));
  const safeFactor = Math.min(1, Math.max(0.05, usageFactor));
  return roundTo(((powerWatts / 1000) * safeHours * quantity * days * safeFactor), 2);
}

/**
 * Custo financeiro estimado da energia:
 * Custo estimado (R$) = Consumo (kWh) × Tarifa (R$/kWh)
 */
export function calculateEnergyCostBrl(energyKwh: number, tariffPerKwh: number): number {
  if (
    !Number.isFinite(energyKwh) ||
    !Number.isFinite(tariffPerKwh) ||
    energyKwh < 0 ||
    tariffPerKwh <= 0
  ) {
    return 0;
  }
  return roundTo(energyKwh * tariffPerKwh, 2);
}

/**
 * Calcula o consumo ocorrido entre duas leituras cumulativas de um medidor (kWh).
 * Impede somar leituras acumuladas diretamente como se fossem consumo diário.
 */
export function calculateCumulativeMeterDelta(
  previousReadingKwh: number,
  currentReadingKwh: number,
): { isValid: boolean; deltaKwh: number; error?: string } {
  if (
    !Number.isFinite(previousReadingKwh) ||
    !Number.isFinite(currentReadingKwh) ||
    previousReadingKwh < 0 ||
    currentReadingKwh < 0
  ) {
    return {
      isValid: false,
      deltaKwh: 0,
      error: 'As leituras do medidor devem ser números não negativos.',
    };
  }
  if (currentReadingKwh < previousReadingKwh) {
    return {
      isValid: false,
      deltaKwh: 0,
      error: 'A leitura atual do medidor não pode ser menor que a leitura anterior.',
    };
  }
  return {
    isValid: true,
    deltaKwh: roundTo(currentReadingKwh - previousReadingKwh, 2),
  };
}

export function resolveMeasurementType(record: ConsumptionRecord): MeasurementType {
  if (record.measurementType) return record.measurementType;
  if (record.isDemo || record.source === 'demo_seed') return 'simulated';
  return 'measured';
}

export function sortRecordsChronologically(records: ConsumptionRecord[]): ConsumptionRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, current) => acc + current, 0);
  return total / values.length;
}

export function calculateStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = calculateMean(values);
  if (mean === null) return null;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calcula a inclinação (slope) de tendência linear por mínimos quadrados (kWh/dia).
 */
export function calculateLinearTrendSlope(values: number[]): number | null {
  const n = values.length;
  if (n < 3) return null;
  const meanX = (n - 1) / 2;
  const meanY = calculateMean(values);
  if (meanY === null) return null;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = i - meanX;
    numerator += dx * (values[i] - meanY);
    denominator += dx * dx;
  }
  if (denominator === 0) return 0;
  return roundTo(numerator / denominator, 3);
}

function countCalendarSpanDays(startDateIso: string, endDateIso: string): number {
  const start = new Date(`${startDateIso}T12:00:00`);
  const end = new Date(`${endDateIso}T12:00:00`);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

const MONTH_NAMES_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const MONTH_NAMES_FULL_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function getCalendarDaysInMonth(year: number, month1To12: number): number {
  if (!Number.isFinite(year) || !Number.isFinite(month1To12)) return 30;
  return new Date(year, month1To12, 0).getDate();
}

/**
 * Constrói o Comparativo Mensal Consolidado sem falhas de fuso horário,
 * agrupando estritamente pela competência YYYY-MM da string ISO local,
 * deduplicando registros idênticos, contando dias únicos registrados no mês,
 * calculando projeção mensal proporcional e variações percentuais seguras (sem NaN/Infinity).
 */
export function buildMonthlyComparison(
  records: ConsumptionRecord[],
  tariffPerKwh: number,
): MonthlyComparisonPoint[] {
  const sorted = sortRecordsChronologically(records);
  const map = new Map<
    string,
    {
      totalKwh: number;
      uniqueDates: Set<string>;
      measuredKwh: number;
      estimatedKwh: number;
      simulatedKwh: number;
    }
  >();

  const seenRecordIds = new Set<string>();

  for (const record of sorted) {
    if (!record || typeof record.date !== 'string' || record.date.length < 7) continue;
    if (!Number.isFinite(record.consumptionKwh) || record.consumptionKwh < 0) continue;

    // Evita duplicação caso o mesmo ID apareça duas vezes
    if (record.id && seenRecordIds.has(record.id)) continue;
    if (record.id) seenRecordIds.add(record.id);

    // Extração direta por string ISO (YYYY-MM) imune a deslocamentos de fuso horário UTC
    const monthKey = record.date.slice(0, 7);
    const [yearPart, monthPart] = monthKey.split('-');
    const yearNum = Number(yearPart);
    const monthNum = Number(monthPart);
    if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      continue;
    }

    const mType = resolveMeasurementType(record);
    const current = map.get(monthKey) ?? {
      totalKwh: 0,
      uniqueDates: new Set<string>(),
      measuredKwh: 0,
      estimatedKwh: 0,
      simulatedKwh: 0,
    };

    current.totalKwh += record.consumptionKwh;
    current.uniqueDates.add(record.date.slice(0, 10));

    if (mType === 'measured') current.measuredKwh += record.consumptionKwh;
    else if (mType === 'estimated') current.estimatedKwh += record.consumptionKwh;
    else current.simulatedKwh += record.consumptionKwh;

    map.set(monthKey, current);
  }

  const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  const points: MonthlyComparisonPoint[] = [];

  for (let idx = 0; idx < sortedEntries.length; idx += 1) {
    const [monthKey, item] = sortedEntries[idx];
    const [yearStr, monthStr] = monthKey.split('-');
    const yearNum = Number(yearStr);
    const monthNum = Number(monthStr);
    const monthIdx = Math.max(0, Math.min(11, monthNum - 1));

    const monthLabel = `${MONTH_NAMES_SHORT_PT[monthIdx]}/${yearStr.slice(2)}`;
    const fullMonthName = `${MONTH_NAMES_FULL_PT[monthIdx]} de ${yearStr}`;
    const calendarDaysInMonth = getCalendarDaysInMonth(yearNum, monthNum);
    const daysCount = item.uniqueDates.size;

    const totalKwh = roundTo(item.totalKwh, 2);
    const totalCostBrl = calculateEnergyCostBrl(totalKwh, tariffPerKwh);
    const rawAvgDaily = daysCount > 0 ? item.totalKwh / daysCount : 0;
    const averageDailyKwh = roundTo(rawAvgDaily, 2);
    const averageDailyCostBrl = calculateEnergyCostBrl(averageDailyKwh, tariffPerKwh);

    const isPartialMonth = daysCount < calendarDaysInMonth;
    const projectedFullMonthKwh = isPartialMonth
      ? roundTo(rawAvgDaily * calendarDaysInMonth, 1)
      : roundTo(totalKwh, 1);
    const projectedFullMonthCostBrl = calculateEnergyCostBrl(projectedFullMonthKwh, tariffPerKwh);

    const prevPoint = idx > 0 ? points[idx - 1] : null;
    const previousMonthKey = prevPoint ? prevPoint.monthKey : null;
    const previousMonthLabel = prevPoint ? prevPoint.monthLabel : null;
    const previousMonthTotalKwh = prevPoint ? prevPoint.totalKwh : null;
    const previousMonthAverageDailyKwh = prevPoint ? prevPoint.averageDailyKwh : null;

    // Variação percentual segura: se o período anterior for zero ou inexistente, retorna null (nunca NaN ou Infinity)
    const totalVariationPercent =
      prevPoint && prevPoint.totalKwh > 0
        ? roundTo(((totalKwh - prevPoint.totalKwh) / prevPoint.totalKwh) * 100, 1)
        : null;

    const dailyAvgVariationPercent =
      prevPoint && prevPoint.averageDailyKwh > 0
        ? roundTo(
            ((averageDailyKwh - prevPoint.averageDailyKwh) / prevPoint.averageDailyKwh) * 100,
            1,
          )
        : null;

    points.push({
      monthKey,
      monthLabel,
      fullMonthName,
      totalKwh: roundTo(totalKwh, 1),
      totalCostBrl,
      averageDailyKwh,
      averageDailyCostBrl,
      daysCount,
      calendarDaysInMonth,
      projectedFullMonthKwh,
      projectedFullMonthCostBrl,
      measuredKwh: roundTo(item.measuredKwh, 1),
      estimatedKwh: roundTo(item.estimatedKwh, 1),
      simulatedKwh: roundTo(item.simulatedKwh, 1),
      previousMonthKey,
      previousMonthLabel,
      previousMonthTotalKwh,
      previousMonthAverageDailyKwh,
      totalVariationPercent,
      dailyAvgVariationPercent,
      isPartialMonth,
    });
  }

  return points;
}

export function buildPeriodComparison(
  sortedRecords: ConsumptionRecord[],
  tariffPerKwh: number,
): PeriodComparisonSummary {
  if (sortedRecords.length < 4) {
    const total = roundTo(
      sortedRecords.reduce((acc, r) => acc + r.consumptionKwh, 0),
      1,
    );
    const avg = sortedRecords.length > 0 ? roundTo(total / sortedRecords.length, 2) : 0;
    return {
      currentPeriodKwh: total,
      previousPeriodKwh: 0,
      variationPercent: null,
      currentPeriodCostBrl: calculateEnergyCostBrl(total, tariffPerKwh),
      previousPeriodCostBrl: 0,
      currentPeriodAvgDailyKwh: avg,
      previousPeriodAvgDailyKwh: 0,
      currentDaysCount: sortedRecords.length,
      previousDaysCount: 0,
    };
  }

  const half = Math.floor(sortedRecords.length / 2);
  const previousSlice = sortedRecords.slice(
    sortedRecords.length - half * 2,
    sortedRecords.length - half,
  );
  const currentSlice = sortedRecords.slice(sortedRecords.length - half);

  const previousPeriodKwh = roundTo(
    previousSlice.reduce((acc, r) => acc + r.consumptionKwh, 0),
    1,
  );
  const currentPeriodKwh = roundTo(
    currentSlice.reduce((acc, r) => acc + r.consumptionKwh, 0),
    1,
  );
  const variationPercent =
    previousPeriodKwh > 0
      ? roundTo(((currentPeriodKwh - previousPeriodKwh) / previousPeriodKwh) * 100, 1)
      : null;

  return {
    currentPeriodKwh,
    previousPeriodKwh,
    variationPercent,
    currentPeriodCostBrl: calculateEnergyCostBrl(currentPeriodKwh, tariffPerKwh),
    previousPeriodCostBrl: calculateEnergyCostBrl(previousPeriodKwh, tariffPerKwh),
    currentPeriodAvgDailyKwh: half > 0 ? roundTo(currentPeriodKwh / half, 2) : 0,
    previousPeriodAvgDailyKwh: half > 0 ? roundTo(previousPeriodKwh / half, 2) : 0,
    currentDaysCount: currentSlice.length,
    previousDaysCount: previousSlice.length,
  };
}

/**
 * Motor de análise energética 100% local e determinístico em TypeScript.
 * Independente de interface e livre de APIs externas de IA.
 */
export function runEnergyAnalysis(
  equipment: Equipment[],
  records: ConsumptionRecord[],
  settings: AppSettings,
  alertStates: Record<string, AlertAcknowledgement> = {},
  allScenarioRecords?: ConsumptionRecord[],
): AnalysisResult {
  const sortedRecords = sortRecordsChronologically(records);
  const totalRecords = sortedRecords.length;

  const latestRecord = totalRecords > 0 ? sortedRecords[totalRecords - 1] : null;
  const previousRecord = totalRecords > 1 ? sortedRecords[totalRecords - 2] : null;

  const dailyVariationPercent =
    latestRecord && previousRecord && previousRecord.consumptionKwh > 0
      ? roundTo(
          ((latestRecord.consumptionKwh - previousRecord.consumptionKwh) /
            previousRecord.consumptionKwh) *
            100,
          1,
        )
      : null;

  let measuredTotalKwh = 0;
  let estimatedTotalKwh = 0;
  let simulatedTotalKwh = 0;

  for (const r of sortedRecords) {
    const mType = resolveMeasurementType(r);
    if (mType === 'measured') measuredTotalKwh += r.consumptionKwh;
    else if (mType === 'estimated') estimatedTotalKwh += r.consumptionKwh;
    else simulatedTotalKwh += r.consumptionKwh;
  }

  measuredTotalKwh = roundTo(measuredTotalKwh, 2);
  estimatedTotalKwh = roundTo(estimatedTotalKwh, 2);
  simulatedTotalKwh = roundTo(simulatedTotalKwh, 2);

  const periodTotalKwh = roundTo(
    sortedRecords.reduce((acc, r) => acc + r.consumptionKwh, 0),
    1,
  );
  const periodTotalCostBrl = calculateEnergyCostBrl(periodTotalKwh, settings.tariffPerKwh);

  const rawHistoricalAverage = calculateMean(sortedRecords.map((r) => r.consumptionKwh));
  const historicalAverageKwh =
    rawHistoricalAverage !== null ? roundTo(rawHistoricalAverage, 2) : null;

  // Previsão mensal estatística com análise de tendência, lacunas e grau de confiança
  const hasEnoughDataForForecast = totalRecords >= MIN_RECORDS_FOR_FORECAST;
  const recordsNeededForForecast = Math.max(0, MIN_RECORDS_FOR_FORECAST - totalRecords);

  const forecastWindow = sortedRecords.slice(-FORECAST_WINDOW_DAYS);
  const forecastBasisDays = forecastWindow.length;
  const forecastValues = forecastWindow.map((r) => r.consumptionKwh);
  const rawForecastBasisAverage = hasEnoughDataForForecast ? calculateMean(forecastValues) : null;
  const forecastBasisAverageKwh =
    rawForecastBasisAverage !== null ? roundTo(rawForecastBasisAverage, 2) : null;

  const trendSlope = hasEnoughDataForForecast ? calculateLinearTrendSlope(forecastValues) : null;
  const stdDev = hasEnoughDataForForecast ? calculateStandardDeviation(forecastValues) : null;
  const variationCoefficientPercent =
    stdDev !== null && rawForecastBasisAverage && rawForecastBasisAverage > 0
      ? roundTo((stdDev / rawForecastBasisAverage) * 100, 1)
      : null;

  const calendarSpan =
    forecastWindow.length >= 2
      ? countCalendarSpanDays(
          forecastWindow[0].date,
          forecastWindow[forecastWindow.length - 1].date,
        )
      : forecastWindow.length;
  const missingDaysInWindow = Math.max(0, calendarSpan - forecastWindow.length);

  let confidence: ForecastConfidence = 'insufficient';
  if (hasEnoughDataForForecast) {
    if (forecastBasisDays >= 14 && missingDaysInWindow <= 2) {
      confidence = 'high';
    } else if (forecastBasisDays >= 7) {
      confidence = 'moderate';
    } else {
      confidence = 'low';
    }
  }

  let trendDirection: ForecastAnalysis['trendDirection'] = 'unknown';
  if (trendSlope !== null && rawForecastBasisAverage && rawForecastBasisAverage > 0) {
    const relativeSlopePct = (trendSlope / rawForecastBasisAverage) * 100;
    if (relativeSlopePct >= 1.2) trendDirection = 'rising';
    else if (relativeSlopePct <= -1.2) trendDirection = 'falling';
    else trendDirection = 'stable';
  }

  const monthlyForecastKwh =
    rawForecastBasisAverage !== null ? roundTo(rawForecastBasisAverage * DAYS_IN_MONTH, 1) : null;

  const estimatedMonthlyCostBrl =
    monthlyForecastKwh !== null
      ? calculateEnergyCostBrl(monthlyForecastKwh, settings.tariffPerKwh)
      : null;

  const estimatedDailyCostBrl =
    latestRecord !== null
      ? calculateEnergyCostBrl(latestRecord.consumptionKwh, settings.tariffPerKwh)
      : null;

  const forecast: ForecastAnalysis = {
    estimatedMonthlyKwh: monthlyForecastKwh,
    estimatedMonthlyCostBrl,
    dailyBasisAverageKwh: forecastBasisAverageKwh,
    trendSlopeKwhPerDay: trendSlope,
    trendDirection,
    variationCoefficientPercent,
    sampleDaysCount: forecastBasisDays,
    missingDaysInWindow,
    confidence,
    methodology: hasEnoughDataForForecast
      ? `Projeção linear de 30 dias baseada na média diária de ${forecastBasisDays} amostra(s) (${formatKwh(forecastBasisAverageKwh ?? 0, 2)}/dia) e regressão de tendência (${trendSlope !== null ? `${trendSlope >= 0 ? '+' : ''}${trendSlope.toFixed(2).replace('.', ',')} kWh/dia` : 'estável'}).`
      : 'Aguardando o mínimo de 3 registros diários para habilitar a projeção estatística mensal.',
    limitations: !hasEnoughDataForForecast
      ? `Base insuficiente: faltam ${recordsNeededForForecast} dia(s) de medição.`
      : missingDaysInWindow > 0
        ? `Estimativa sujeita a variação: há ${missingDaysInWindow} dia(s) sem leitura no intervalo analisado e coeficiente de variação diária de ${variationCoefficientPercent ?? 0}%. Não representa valor exato de fatura.`
        : `Estimativa estatística com coeficiente de variação diária de ${variationCoefficientPercent ?? 0}%. Mudanças de turno, clima, tributos ou bandeira tarifária alteram o valor final da fatura.`,
  };

  // Potência nominal instalada × Consumo estimado de equipamentos
  const activeEquipment = equipment.filter((item) => item.status === 'active');
  const inactiveEquipment = equipment.filter((item) => item.status === 'inactive');

  const getEquipmentTotalWatts = (eq: Equipment) =>
    eq.powerWatts * Math.max(1, eq.quantity ?? 1);

  const activeInstalledPowerWatts = activeEquipment.reduce(
    (sum, item) => sum + getEquipmentTotalWatts(item),
    0,
  );
  const inactiveInstalledPowerWatts = inactiveEquipment.reduce(
    (sum, item) => sum + getEquipmentTotalWatts(item),
    0,
  );

  // Resumo individual por equipamento (diferenciando potência nominal, consumo calculado com fator de ciclo e consumo medido vinculado)
  const measuredByEquipmentId = new Map<string, { kwh: number; count: number }>();
  for (const r of sortedRecords) {
    if (!r.equipmentId) continue;
    const prev = measuredByEquipmentId.get(r.equipmentId) ?? { kwh: 0, count: 0 };
    measuredByEquipmentId.set(r.equipmentId, {
      kwh: prev.kwh + r.consumptionKwh,
      count: prev.count + 1,
    });
  }

  const rawEquipmentSummaries = equipment.map((eq) => {
    const qty = Math.max(1, eq.quantity ?? 1);
    const hours = eq.dailyUsageHours ?? 8;
    const effectiveUsageFactor =
      typeof eq.usageFactor === 'number' && eq.usageFactor > 0 && eq.usageFactor <= 1
        ? eq.usageFactor
        : 1;
    const totalRatedPowerWatts = eq.powerWatts * qty;
    const isAct = eq.status === 'active';

    const estimatedDailyKwh = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, 1, effectiveUsageFactor)
      : 0;
    const estimatedMonthlyKwh = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, DAYS_IN_MONTH, effectiveUsageFactor)
      : 0;
    const nominalDailyKwhWithoutFactor = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, 1, 1)
      : 0;
    const nominalMonthlyKwhWithoutFactor = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, DAYS_IN_MONTH, 1)
      : 0;

    const estimatedMonthlyCostBrl = calculateEnergyCostBrl(
      estimatedMonthlyKwh,
      settings.tariffPerKwh,
    );
    const measuredStats = measuredByEquipmentId.get(eq.id) ?? { kwh: 0, count: 0 };

    return {
      equipment: eq,
      totalRatedPowerWatts,
      effectiveUsageFactor,
      estimatedDailyKwh,
      estimatedMonthlyKwh,
      estimatedMonthlyCostBrl,
      nominalDailyKwhWithoutFactor,
      nominalMonthlyKwhWithoutFactor,
      measuredPeriodKwh: roundTo(measuredStats.kwh, 2),
      measuredReadingsCount: measuredStats.count,
    };
  });

  const estimatedEquipmentDailyKwh = roundTo(
    rawEquipmentSummaries.reduce((acc, item) => acc + item.estimatedDailyKwh, 0),
    2,
  );
  const estimatedEquipmentMonthlyKwh = roundTo(
    rawEquipmentSummaries.reduce((acc, item) => acc + item.estimatedMonthlyKwh, 0),
    1,
  );
  const estimatedEquipmentMonthlyCostBrl = calculateEnergyCostBrl(
    estimatedEquipmentMonthlyKwh,
    settings.tariffPerKwh,
  );

  const equipmentSummaries: EquipmentConsumptionSummary[] = rawEquipmentSummaries
    .map((item) => ({
      ...item,
      shareOfInstalledPowerPercent:
        item.equipment.status === 'active' && activeInstalledPowerWatts > 0
          ? roundTo((item.totalRatedPowerWatts / activeInstalledPowerWatts) * 100, 1)
          : 0,
      shareOfEstimatedEnergyPercent:
        item.equipment.status === 'active' && estimatedEquipmentMonthlyKwh > 0
          ? roundTo((item.estimatedMonthlyKwh / estimatedEquipmentMonthlyKwh) * 100, 1)
          : 0,
    }))
    .sort((a, b) => b.estimatedMonthlyKwh - a.estimatedMonthlyKwh || b.totalRatedPowerWatts - a.totalRatedPowerWatts);

  // Distribuição de potência ativa e consumo estimado por categoria
  const categoryMap = new Map<
    EquipmentCategory,
    { powerWatts: number; estimatedDailyKwh: number; estimatedMonthlyKwh: number; activeCount: number }
  >();
  for (const summary of equipmentSummaries) {
    if (summary.equipment.status !== 'active') continue;
    const cat = summary.equipment.category;
    const existing = categoryMap.get(cat) ?? {
      powerWatts: 0,
      estimatedDailyKwh: 0,
      estimatedMonthlyKwh: 0,
      activeCount: 0,
    };
    categoryMap.set(cat, {
      powerWatts: existing.powerWatts + summary.totalRatedPowerWatts,
      estimatedDailyKwh: existing.estimatedDailyKwh + summary.estimatedDailyKwh,
      estimatedMonthlyKwh: existing.estimatedMonthlyKwh + summary.estimatedMonthlyKwh,
      activeCount: existing.activeCount + 1,
    });
  }

  const categoryLoads: CategoryLoadSummary[] = Array.from(categoryMap.entries())
    .map(([category, data]) => {
      const estKwh = roundTo(data.estimatedMonthlyKwh, 1);
      return {
        category,
        powerWatts: data.powerWatts,
        estimatedDailyKwh: roundTo(data.estimatedDailyKwh, 2),
        estimatedMonthlyKwh: estKwh,
        estimatedMonthlyCostBrl: calculateEnergyCostBrl(estKwh, settings.tariffPerKwh),
        activeCount: data.activeCount,
        percentage:
          activeInstalledPowerWatts > 0
            ? roundTo((data.powerWatts / activeInstalledPowerWatts) * 100, 1)
            : 0,
        energyPercentage:
          estimatedEquipmentMonthlyKwh > 0
            ? roundTo((estKwh / estimatedEquipmentMonthlyKwh) * 100, 1)
            : 0,
      };
    })
    .sort((a, b) => b.estimatedMonthlyKwh - a.estimatedMonthlyKwh || b.powerWatts - a.powerWatts);

  const topActiveEquipment = [...activeEquipment]
    .sort((a, b) => getEquipmentTotalWatts(b) - getEquipmentTotalWatts(a))
    .slice(0, 5);

  // Detecção de anomalias: compara cada dia (a partir do 4º) com a média móvel anterior (até 7 dias)
  const hasEnoughDataForAnomalies = totalRecords >= MIN_RECORDS_FOR_ANOMALIES;
  const recordsNeededForAnomalies = Math.max(0, MIN_RECORDS_FOR_ANOMALIES - totalRecords);

  const anomalies: AnomalyAlert[] = [];
  const chartData: ChartPoint[] = [];
  const eqNameById = new Map(equipment.map((e) => [e.id, e.name]));

  for (let i = 0; i < sortedRecords.length; i += 1) {
    const record = sortedRecords[i];
    const mType = resolveMeasurementType(record);
    const estimatedCostBrl = calculateEnergyCostBrl(record.consumptionKwh, settings.tariffPerKwh);

    let baselineAverageKwh: number | null = null;
    let deviationPercent: number | null = null;
    let isAnomaly = false;
    let anomalySeverity: AnomalyAlert['severity'] | undefined;

    if (i >= MIN_BASELINE_DAYS_FOR_ANOMALY) {
      const priorStart = Math.max(0, i - ROLLING_BASELINE_WINDOW);
      const priorSlice = sortedRecords.slice(priorStart, i);
      const rawBaseline = calculateMean(priorSlice.map((item) => item.consumptionKwh));

      if (rawBaseline !== null && rawBaseline > 0) {
        baselineAverageKwh = roundTo(rawBaseline, 2);
        deviationPercent = roundTo(((record.consumptionKwh - rawBaseline) / rawBaseline) * 100, 1);

        if (deviationPercent >= settings.anomalyThresholdPercent) {
          isAnomaly = true;
          const excessKwh = roundTo(record.consumptionKwh - rawBaseline, 1);
          const estimatedExcessCostBrl = calculateEnergyCostBrl(excessKwh, settings.tariffPerKwh);
          anomalySeverity =
            deviationPercent >= settings.anomalyThresholdPercent * 1.5 ? 'critical' : 'warning';

          const alertId = `anomaly_${record.id}`;
          const savedAck = alertStates[alertId];
          const linkedEqName = record.equipmentId ? eqNameById.get(record.equipmentId) : undefined;

          anomalies.push({
            id: alertId,
            recordId: record.id,
            organizationId: record.organizationId,
            equipmentId: record.equipmentId,
            date: record.date,
            consumptionKwh: record.consumptionKwh,
            baselineAverageKwh,
            baselineDaysCount: priorSlice.length,
            deviationPercent,
            excessKwh,
            estimatedExcessCostBrl,
            severity: anomalySeverity,
            measurementType: mType,
            status: savedAck?.status ?? 'open',
            acknowledgedBy: savedAck?.acknowledgedBy,
            acknowledgedAt: savedAck?.acknowledgedAt,
            isDemo: record.isDemo,
            alertCategory: 'anomaly',
            title:
              anomalySeverity === 'critical'
                ? `Pico crítico de consumo em ${formatFullDate(record.date)}`
                : `Consumo acima da média histórica em ${formatFullDate(record.date)}`,
            description: `${formatKwh(record.consumptionKwh)} registrados (${formatPercent(deviationPercent, true)} acima da linha de base de ${formatKwh(baselineAverageKwh)}). Excedente de +${formatKwh(excessKwh)} (${formatCurrencyBRL(estimatedExcessCostBrl)}).`,
            explanation: `O consumo registrado em ${formatFullDate(record.date)} (${formatKwh(record.consumptionKwh)}) superou em ${formatPercent(deviationPercent)} a média móvel dos ${priorSlice.length} dias imediatamente anteriores (${formatKwh(baselineAverageKwh)}), ultrapassando o limite configurado de +${formatPercent(settings.anomalyThresholdPercent)}.`,
            reason: `Ultrapassagem do limite estatístico de +${formatPercent(settings.anomalyThresholdPercent)} sobre a média móvel anterior.`,
            dataContext: `Medição de ${formatKwh(record.consumptionKwh)} (${mType === 'measured' ? 'Medido' : mType === 'estimated' ? 'Estimado' : 'Simulado'}) vs. média de ${priorSlice.length} dias (${formatKwh(baselineAverageKwh)})${linkedEqName ? ` · Associado a: ${linkedEqName}` : ''}.`,
            recommendedAction: linkedEqName
              ? `Verificar tempo de funcionamento, termostato e regime de operação de "${linkedEqName}" nesta data.`
              : 'Conferir se equipamentos térmicos ou de climatização permaneceram acionados fora do horário comercial.',
          });
        }
      }
    }

    chartData.push({
      id: record.id,
      date: record.date,
      shortDate: formatShortDate(record.date),
      fullDate: formatFullDate(record.date),
      consumptionKwh: record.consumptionKwh,
      measuredKwh: mType === 'measured' ? record.consumptionKwh : null,
      estimatedKwh: mType === 'estimated' ? record.consumptionKwh : null,
      simulatedKwh: mType === 'simulated' ? record.consumptionKwh : null,
      estimatedCostBrl,
      baselineAverageKwh,
      deviationPercent,
      isAnomaly,
      anomalySeverity,
      measurementType: mType,
      equipmentId: record.equipmentId,
      note: record.note,
      isDemo: record.isDemo,
    });
  }

  const sortedAnomalies = [...anomalies].sort((a, b) => b.date.localeCompare(a.date));
  const periodComparison = buildPeriodComparison(sortedRecords, settings.tariffPerKwh);

  // Para o Comparativo Mensal Consolidado, se todos os registros do cenário foram fornecidos e o filtro não é custom,
  // garantimos que todos os meses consolidados do histórico sejam agrupados sem truncar meses pela metade.
  const recordsForMonthly =
    allScenarioRecords && allScenarioRecords.length >= sortedRecords.length
      ? allScenarioRecords
      : sortedRecords;
  const monthlyComparison = buildMonthlyComparison(recordsForMonthly, settings.tariffPerKwh);

  const effectiveEmissionFactor =
    typeof settings.emissionFactorKgPerKwh === 'number' && settings.emissionFactorKgPerKwh > 0
      ? settings.emissionFactorKgPerKwh
      : BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH;

  const emissionFactorSource =
    settings.emissionFactorSource ?? OFFICIAL_EMISSION_REFERENCE.emissionFactorSource;
  const emissionFactorYear =
    settings.emissionFactorYear ?? OFFICIAL_EMISSION_REFERENCE.emissionFactorYear;

  const periodCo2Kg = calculateCo2EmissionsKg(periodTotalKwh, effectiveEmissionFactor);
  const monthlyForecastCo2Kg =
    monthlyForecastKwh !== null
      ? calculateCo2EmissionsKg(monthlyForecastKwh, effectiveEmissionFactor)
      : null;
  const tenPercentAnnualCo2SavedKg =
    monthlyForecastCo2Kg !== null ? roundTo(monthlyForecastCo2Kg * 0.1 * 12, 2) : null;
  const tenPercentAnnualCostSavedBrl =
    estimatedMonthlyCostBrl !== null ? roundTo(estimatedMonthlyCostBrl * 0.1 * 12, 2) : null;

  const environmentalImpact: EnvironmentalImpactSummary = {
    emissionFactorKgPerKwh: effectiveEmissionFactor,
    emissionFactorSource,
    emissionFactorYear,
    periodCo2Kg,
    monthlyForecastCo2Kg,
    tenPercentAnnualCo2SavedKg,
    tenPercentAnnualCostSavedBrl,
    methodologyNote: `Estimativa indireta (Escopo 2) calculada pela fórmula: Emissões (kg CO₂) = Consumo (kWh) × ${effectiveEmissionFactor.toFixed(4).replace('.', ',')} kg CO₂/kWh. Fonte: ${emissionFactorSource} (${emissionFactorYear}). Não representa medição direta de gases.`,
  };

  // Construção unificada de SystemAlerts (Item 7.5: anomalias, aumento entre períodos, equipamento de alta potência, projeção de custo superior e dados insuficientes)
  const systemAlerts = buildSystemAlerts({
    sortedRecords,
    anomalies: sortedAnomalies,
    periodComparison,
    equipmentSummaries,
    activeInstalledPowerWatts,
    monthlyForecastKwh,
    estimatedMonthlyCostBrl,
    estimatedEquipmentMonthlyKwh,
    estimatedEquipmentMonthlyCostBrl,
    hasEnoughDataForAnomalies,
    recordsNeededForAnomalies,
    settings,
    alertStates,
  });

  const recommendations = buildRecommendations({
    sortedRecords,
    latestRecord,
    historicalAverageKwh,
    monthlyForecastKwh,
    estimatedMonthlyCostBrl,
    estimatedEquipmentMonthlyKwh,
    hasEnoughDataForForecast,
    hasEnoughDataForAnomalies,
    recordsNeededForAnomalies,
    activeEquipment,
    activeInstalledPowerWatts,
    categoryLoads,
    equipmentSummaries,
    topActiveEquipment,
    anomalies: sortedAnomalies,
    settings,
  });

  const demoRecordsCount = records.filter(
    (r) => r.isDemo || r.measurementType === 'simulated',
  ).length;
  const demoEquipmentCount = equipment.filter((e) => e.isDemo).length;
  const hasDemoData =
    demoRecordsCount > 0 || demoEquipmentCount > 0 || Boolean(settings.isDemoProfile);

  return {
    sortedRecords,
    totalRecords,
    latestRecord,
    previousRecord,
    dailyVariationPercent,
    periodTotalKwh,
    periodTotalCostBrl,
    measuredTotalKwh,
    estimatedTotalKwh,
    simulatedTotalKwh,
    historicalAverageKwh,
    forecastBasisAverageKwh,
    forecastBasisDays,
    monthlyForecastKwh,
    estimatedMonthlyCostBrl,
    estimatedDailyCostBrl,
    estimatedEquipmentDailyKwh,
    estimatedEquipmentMonthlyKwh,
    estimatedEquipmentMonthlyCostBrl,
    forecast,
    environmentalImpact,
    periodComparison,
    monthlyComparison,
    hasEnoughDataForForecast,
    hasEnoughDataForAnomalies,
    recordsNeededForForecast,
    recordsNeededForAnomalies,
    activeInstalledPowerWatts,
    inactiveInstalledPowerWatts,
    activeEquipmentCount: activeEquipment.length,
    totalEquipmentCount: equipment.length,
    categoryLoads,
    equipmentSummaries,
    topActiveEquipment,
    anomalies: sortedAnomalies,
    systemAlerts,
    recommendations,
    chartData,
    hasDemoData,
    demoRecordsCount,
    demoEquipmentCount,
  };
}

interface BuildSystemAlertsInput {
  sortedRecords: ConsumptionRecord[];
  anomalies: AnomalyAlert[];
  periodComparison: PeriodComparisonSummary;
  equipmentSummaries: EquipmentConsumptionSummary[];
  activeInstalledPowerWatts: number;
  monthlyForecastKwh: number | null;
  estimatedMonthlyCostBrl: number | null;
  estimatedEquipmentMonthlyKwh: number;
  estimatedEquipmentMonthlyCostBrl: number;
  hasEnoughDataForAnomalies: boolean;
  recordsNeededForAnomalies: number;
  settings: AppSettings;
  alertStates: Record<string, AlertAcknowledgement>;
}

function buildSystemAlerts(input: BuildSystemAlertsInput): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const {
    sortedRecords,
    anomalies,
    periodComparison,
    equipmentSummaries,
    activeInstalledPowerWatts,
    monthlyForecastKwh,
    estimatedMonthlyCostBrl,
    estimatedEquipmentMonthlyKwh,
    estimatedEquipmentMonthlyCostBrl,
    hasEnoughDataForAnomalies,
    recordsNeededForAnomalies,
    settings,
    alertStates,
  } = input;

  const latestDate =
    sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].date : getTodayIsoDate();

  // 1. Condição: Dados insuficientes para análise confiável
  if (!hasEnoughDataForAnomalies) {
    const id = 'sys_insufficient_data';
    const ack = alertStates[id];
    alerts.push({
      id,
      title: 'Dados insuficientes para detecção estatística confiável',
      priority: 'info',
      category: 'insufficient_data',
      description:
        sortedRecords.length === 0
          ? 'Nenhum registro diário de consumo foi encontrado neste cenário.'
          : `Apenas ${sortedRecords.length} dia(s) registrado(s). São necessários ao menos ${MIN_RECORDS_FOR_ANOMALIES} dias para estabelecer a média móvel de referência.`,
      reason: `O motor estatístico exige no mínimo ${MIN_BASELINE_DAYS_FOR_ANOMALY} dias anteriores de linha de base + 1 dia avaliado.`,
      date: latestDate,
      dataContext: `Amostra atual: ${sortedRecords.length} de ${MIN_RECORDS_FOR_ANOMALIES} registros mínimos (faltam ${recordsNeededForAnomalies}).`,
      recommendedAction:
        'Adicione novos registros diários na página de Registros ou restaure os dados demonstrativos do cenário.',
      status: ack?.status ?? 'open',
      acknowledgedBy: ack?.acknowledgedBy,
      acknowledgedAt: ack?.acknowledgedAt,
    });
  }

  // 2. Condição: Consumo diário acima da média histórica (Anomalias detectadas)
  for (const anomaly of anomalies) {
    alerts.push({
      id: anomaly.id,
      title: anomaly.title,
      priority: anomaly.severity === 'critical' ? 'critical' : 'warning',
      category: 'anomaly',
      description: anomaly.description,
      reason:
        anomaly.reason ??
        `Consumo diário superou em ${formatPercent(anomaly.deviationPercent)} a média móvel anterior (limite: +${formatPercent(settings.anomalyThresholdPercent)}).`,
      date: anomaly.date,
      dataContext:
        anomaly.dataContext ??
        `Leitura: ${formatKwh(anomaly.consumptionKwh)} · Média base (${anomaly.baselineDaysCount}d): ${formatKwh(anomaly.baselineAverageKwh)} · Excedente: +${formatKwh(anomaly.excessKwh)}.`,
      recommendedAction:
        anomaly.recommendedAction ??
        'Revisar operação de equipamentos térmicos e climatização nesta data.',
      status: anomaly.status,
      acknowledgedBy: anomaly.acknowledgedBy,
      acknowledgedAt: anomaly.acknowledgedAt,
      measurementType: anomaly.measurementType,
      deviationPercent: anomaly.deviationPercent,
      excessKwh: anomaly.excessKwh,
      estimatedExcessCostBrl: anomaly.estimatedExcessCostBrl,
      equipmentId: anomaly.equipmentId,
      recordId: anomaly.recordId,
    });
  }

  // 3. Condição: Aumento significativo em relação a períodos anteriores
  if (
    periodComparison.variationPercent !== null &&
    periodComparison.variationPercent >= 6 &&
    sortedRecords.length >= 8
  ) {
    const id = 'sys_period_increase';
    const ack = alertStates[id];
    const diffKwh = roundTo(
      periodComparison.currentPeriodKwh - periodComparison.previousPeriodKwh,
      1,
    );
    const diffCost = calculateEnergyCostBrl(Math.max(0, diffKwh), settings.tariffPerKwh);

    alerts.push({
      id,
      title: `Aumento de ${formatPercent(periodComparison.variationPercent, true)} no período recente`,
      priority: periodComparison.variationPercent >= 15 ? 'critical' : 'warning',
      category: 'period_increase',
      description: `A metade mais recente do período analisado (${periodComparison.currentDaysCount} dias) acumulou ${formatKwh(periodComparison.currentPeriodKwh)}, contra ${formatKwh(periodComparison.previousPeriodKwh)} na metade anterior.`,
      reason:
        'Elevação consistente da média diária entre duas janelas consecutivas de mesma duração.',
      date: latestDate,
      dataContext: `Média recente: ${formatKwh(periodComparison.currentPeriodAvgDailyKwh, 2)}/dia vs. Média anterior: ${formatKwh(periodComparison.previousPeriodAvgDailyKwh, 2)}/dia (+${formatKwh(diffKwh)} / +${formatCurrencyBRL(diffCost)}).`,
      recommendedAction:
        'Compare os meses na página de Análises e verifique se houve ampliação de turno ou mudança na regulagem de termostatos.',
      status: ack?.status ?? 'open',
      acknowledgedBy: ack?.acknowledgedBy,
      acknowledgedAt: ack?.acknowledgedAt,
      deviationPercent: periodComparison.variationPercent,
      excessKwh: diffKwh,
      estimatedExcessCostBrl: diffCost,
    });
  }

  // 4. Condição: Equipamento com potência elevada / concentração crítica de carga
  const activeSummaries = equipmentSummaries.filter((s) => s.equipment.status === 'active');
  if (activeSummaries.length > 0 && activeInstalledPowerWatts > 0) {
    const highestPowerEq = [...activeSummaries].sort(
      (a, b) => b.totalRatedPowerWatts - a.totalRatedPowerWatts,
    )[0];

    if (
      highestPowerEq &&
      (highestPowerEq.shareOfInstalledPowerPercent >= 35 ||
        highestPowerEq.totalRatedPowerWatts >= 2500)
    ) {
      const id = `sys_high_power_${highestPowerEq.equipment.id}`;
      const ack = alertStates[id];
      const eq = highestPowerEq.equipment;

      alerts.push({
        id,
        title: `Equipamento de alta potência: ${eq.name}`,
        priority: highestPowerEq.shareOfInstalledPowerPercent >= 50 ? 'warning' : 'info',
        category: 'high_power_equipment',
        description: `"${eq.name}" (${eq.manufacturer ? `${eq.manufacturer} ${eq.model ?? ''}` : eq.category}) concentra ${formatPower(highestPowerEq.totalRatedPowerWatts)} (${formatPercent(highestPowerEq.shareOfInstalledPowerPercent)} da potência ativa instalada).`,
        reason:
          'Concentração igual ou superior a 35% da potência nominal instalada ou carga superior a 2,5 kW.',
        date: latestDate,
        dataContext: `Potência total: ${formatPower(highestPowerEq.totalRatedPowerWatts)} (${eq.quantity ?? 1}x ${eq.powerWatts} W) · Uso: ${eq.dailyUsageHours ?? 8}h/dia (fator ${Math.round(highestPowerEq.effectiveUsageFactor * 100)}%) · Estimativa: ${formatKwh(highestPowerEq.estimatedMonthlyKwh)}/mês (${formatCurrencyBRL(highestPowerEq.estimatedMonthlyCostBrl)}).`,
        recommendedAction:
          'Evitar acionamento simultâneo com outras cargas térmicas pesadas e revisar o tempo de pré-aquecimento ou ociosidade.',
        status: ack?.status ?? 'open',
        acknowledgedBy: ack?.acknowledgedBy,
        acknowledgedAt: ack?.acknowledgedAt,
        equipmentId: eq.id,
      });
    }
  }

  // 5. Condição: Projeção de custo superior ao padrão estimado pelo inventário
  if (
    monthlyForecastKwh !== null &&
    estimatedMonthlyCostBrl !== null &&
    estimatedEquipmentMonthlyKwh > 0
  ) {
    const ratioPct = roundTo(
      ((monthlyForecastKwh - estimatedEquipmentMonthlyKwh) / estimatedEquipmentMonthlyKwh) * 100,
      1,
    );
    if (ratioPct >= 10) {
      const id = 'sys_cost_projection_above_inventory';
      const ack = alertStates[id];
      const diffKwh = roundTo(monthlyForecastKwh - estimatedEquipmentMonthlyKwh, 1);
      const diffBrl = roundTo(estimatedMonthlyCostBrl - estimatedEquipmentMonthlyCostBrl, 2);

      alerts.push({
        id,
        title: `Projeção mensal (${formatCurrencyBRL(estimatedMonthlyCostBrl)}) supera estimativa do inventário em ${formatPercent(ratioPct, true)}`,
        priority: ratioPct >= 25 ? 'critical' : 'warning',
        category: 'cost_projection',
        description: `O ritmo das leituras diárias projeta ${formatKwh(monthlyForecastKwh)}/mês (${formatCurrencyBRL(estimatedMonthlyCostBrl)}), superando o consumo estimado pelos equipamentos cadastrados (${formatKwh(estimatedEquipmentMonthlyKwh)}/mês · ${formatCurrencyBRL(estimatedEquipmentMonthlyCostBrl)}).`,
        reason:
          'As medições diárias estão acima da soma teórica das horas e fatores de uso cadastrados no inventário.',
        date: latestDate,
        dataContext: `Diferença projetada: +${formatKwh(diffKwh)}/mês (+${formatCurrencyBRL(diffBrl)}/mês) considerando a tarifa de ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh.`,
        recommendedAction:
          'Verifique se há equipamentos operando por mais horas que o previsto ou se existem cargas não cadastradas no inventário.',
        status: ack?.status ?? 'open',
        acknowledgedBy: ack?.acknowledgedBy,
        acknowledgedAt: ack?.acknowledgedAt,
        deviationPercent: ratioPct,
        excessKwh: diffKwh,
        estimatedExcessCostBrl: diffBrl,
      });
    }
  }

  return alerts;
}

interface RecommendationInput {
  sortedRecords: ConsumptionRecord[];
  latestRecord: ConsumptionRecord | null;
  historicalAverageKwh: number | null;
  monthlyForecastKwh: number | null;
  estimatedMonthlyCostBrl: number | null;
  estimatedEquipmentMonthlyKwh: number;
  hasEnoughDataForForecast: boolean;
  hasEnoughDataForAnomalies: boolean;
  recordsNeededForAnomalies: number;
  activeEquipment: Equipment[];
  activeInstalledPowerWatts: number;
  categoryLoads: CategoryLoadSummary[];
  equipmentSummaries: EquipmentConsumptionSummary[];
  topActiveEquipment: Equipment[];
  anomalies: AnomalyAlert[];
  settings: AppSettings;
}

function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    sortedRecords,
    latestRecord,
    estimatedMonthlyCostBrl,
    hasEnoughDataForForecast,
    hasEnoughDataForAnomalies,
    recordsNeededForAnomalies,
    activeEquipment,
    activeInstalledPowerWatts,
    categoryLoads,
    equipmentSummaries,
    topActiveEquipment,
    anomalies,
    settings,
  } = input;

  // Regra 1: Dados insuficientes para análise completa
  if (!hasEnoughDataForAnomalies) {
    recommendations.push({
      id: 'rec_insufficient_history',
      priority: 'info',
      category: 'Base de dados',
      title: 'Amplie o histórico diário para ativar a detecção estatística completa',
      description:
        sortedRecords.length === 0
          ? 'Nenhum consumo diário registrado até o momento. Adicione pelo menos 4 dias de leitura para habilitar média histórica, projeção mensal e detecção automática de anomalias.'
          : `Você possui ${sortedRecords.length} registro(s). Faltam ${recordsNeededForAnomalies} dia(s) para o motor local comparar o consumo diário com a média móvel anterior.`,
      reason: 'A janela mínima de comparação estatística exige 3 dias anteriores de base e 1 dia analisado.',
      evidence: `${sortedRecords.length} de ${MIN_RECORDS_FOR_ANOMALIES} leituras diárias mínimas registradas.`,
      estimatedImpact: 'Habilita alertas automáticos de variação atípica e projeção mensal de custos.',
      suggestedAction: 'Inserir leituras diárias na página de Registros ou selecionar um cenário demonstrativo completo.',
      metricBadge: `${sortedRecords.length}/${MIN_RECORDS_FOR_ANOMALIES} dias`,
      actionTarget: 'records',
      actionLabel: 'Registrar consumo',
    });
  }

  // Regra 2: Sem equipamentos ativos cadastrados
  if (activeEquipment.length === 0) {
    recommendations.push({
      id: 'rec_no_active_equipment',
      priority: 'info',
      category: 'Inventário',
      title: 'Cadastre os equipamentos ativos para mapear a potência instalada',
      description:
        'Com a potência nominal (W) e as horas de uso cadastradas, o WattWise identifica quais equipamentos concentram maior demanda e explica a composição do consumo.',
      reason: 'Não há equipamentos com status ativo neste cenário.',
      evidence: '0 W de potência nominal ativa instalada.',
      estimatedImpact: 'Permite cruzar potência nominal (kW) com consumo mensal estimado (kWh).',
      suggestedAction: 'Cadastrar os principais equipamentos elétricos com fabricante, modelo, potência (W), quantidade e horas de uso.',
      metricBadge: '0 W ativos',
      actionTarget: 'equipment',
      actionLabel: 'Cadastrar equipamentos',
    });
  }

  // Regra 3: Anomalia no registro mais recente ou nos últimos registros
  if (anomalies.length > 0 && latestRecord) {
    const latestAnomaly = anomalies[0];
    const isMostRecentDay = latestAnomaly.date === latestRecord.date;
    const topConsumer = equipmentSummaries.find((s) => s.equipment.status === 'active');

    recommendations.push({
      id: 'rec_recent_anomaly',
      priority: 'high',
      category: 'Anomalia detectada',
      title: isMostRecentDay
        ? `Investigue o pico registrado em ${formatFullDate(latestAnomaly.date)}`
        : `Revise o desvio atípico de ${formatFullDate(latestAnomaly.date)}`,
      description: topConsumer
        ? `O consumo atingiu ${formatKwh(latestAnomaly.consumptionKwh)} (${formatPercent(latestAnomaly.deviationPercent, true)} acima da base). Verifique o tempo de operação de cargas principais como "${topConsumer.equipment.name}" (${formatPower(topConsumer.totalRatedPowerWatts)}).`
        : `O consumo atingiu ${formatKwh(latestAnomaly.consumptionKwh)} (${formatPercent(latestAnomaly.deviationPercent, true)} acima da base), gerando excedente estimado de ${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)}.`,
      reason: `O consumo diário superou o limite de alerta configurado (+${formatPercent(settings.anomalyThresholdPercent)} sobre a média móvel de ${latestAnomaly.baselineDaysCount} dias).`,
      evidence: `Leitura de ${formatKwh(latestAnomaly.consumptionKwh)} em ${formatFullDate(latestAnomaly.date)} contra média anterior de ${formatKwh(latestAnomaly.baselineAverageKwh)} (+${formatKwh(latestAnomaly.excessKwh)}).`,
      estimatedImpact: `Excedente estimado neste evento: ${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)} (baseado na tarifa de ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh).`,
      suggestedAction: topConsumer
        ? `Auditar regime de funcionamento de "${topConsumer.equipment.name}" e registrar tratativa na página de Alertas.`
        : 'Auditar cargas acionadas fora do expediente e registrar tratativa na página de Alertas.',
      metricBadge: `+${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)}`,
      actionTarget: 'alerts',
      actionLabel: 'Ver detalhes nos Alertas',
    });
  }

  // Regra 4: Equipamento de maior consumo mensal estimado no inventário
  const topEnergySummary = equipmentSummaries.find((s) => s.equipment.status === 'active');
  if (topEnergySummary && topEnergySummary.estimatedMonthlyKwh > 0) {
    const eq = topEnergySummary.equipment;
    recommendations.push({
      id: `rec_top_equipment_${eq.id}`,
      priority: 'medium',
      category: eq.category,
      title: `Acompanhe o regime de uso de "${eq.name}"`,
      description: `Este equipamento lidera o consumo estimado do estabelecimento com ${formatKwh(topEnergySummary.estimatedMonthlyKwh)}/mês (${formatPercent(topEnergySummary.shareOfEstimatedEnergyPercent)} do total estimado pelo inventário), considerando ${eq.dailyUsageHours ?? 8}h/dia e fator de ciclo de ${Math.round(topEnergySummary.effectiveUsageFactor * 100)}%.`,
      reason: `Maior participação individual no consumo mensal estimado (${formatPercent(topEnergySummary.shareOfEstimatedEnergyPercent)}).`,
      evidence: `${eq.quantity ?? 1}x ${eq.powerWatts} W (${formatPower(topEnergySummary.totalRatedPowerWatts)}) × ${eq.dailyUsageHours ?? 8}h/dia × fator ${topEnergySummary.effectiveUsageFactor} = ${formatKwh(topEnergySummary.estimatedDailyKwh, 2)}/dia.`,
      estimatedImpact: `Representa custo estimado de ${formatCurrencyBRL(topEnergySummary.estimatedMonthlyCostBrl)}/mês na tarifa atual (sem prometer percentual fixo de redução).`,
      suggestedAction:
        'Evitar funcionamento em vazio (sem carga de produção/atendimento) e manter manutenção preventiva em dia.',
      metricBadge: `${formatKwh(topEnergySummary.estimatedMonthlyKwh)}/mês`,
      actionTarget: 'equipment',
      actionLabel: 'Inspecionar equipamento',
    });
  }

  // Regra 5: Concentração em Climatização ou Refrigeração
  const thermalLoad = categoryLoads.find(
    (c) => (c.category === 'Climatização' || c.category === 'Refrigeração') && c.energyPercentage >= 22,
  );
  if (thermalLoad) {
    recommendations.push({
      id: `rec_thermal_${thermalLoad.category}`,
      priority: 'medium',
      category: thermalLoad.category,
      title: `Boas práticas térmicas em ${thermalLoad.category}`,
      description: `A categoria ${thermalLoad.category} responde por ${formatPercent(thermalLoad.energyPercentage)} do consumo estimado (${formatKwh(thermalLoad.estimatedMonthlyKwh)}/mês) e ${formatPower(thermalLoad.powerWatts)} de potência instalada.`,
      reason: `Participação relevante (${formatPercent(thermalLoad.energyPercentage)}) de sistemas de troca térmica no balanço energético.`,
      evidence: `${thermalLoad.activeCount} equipamento(s) ativo(s) somando ${formatPower(thermalLoad.powerWatts)} e ${formatKwh(thermalLoad.estimatedDailyKwh, 2)}/dia.`,
      estimatedImpact: `Custo operacional estimado da categoria: ${formatCurrencyBRL(thermalLoad.estimatedMonthlyCostBrl)}/mês.`,
      suggestedAction:
        thermalLoad.category === 'Climatização'
          ? 'Manter filtros limpos, portas/janelas vedadas e regular o setpoint entre 23 °C e 24 °C.'
          : 'Verificar borrachas de vedação das portas, afastamento das grades traseiras e evitar inserir produtos quentes.',
      metricBadge: `${formatPercent(thermalLoad.energyPercentage)} do consumo`,
      actionTarget: 'analysis',
      actionLabel: 'Ver distribuição por categoria',
    });
  }

  // Regra 6: Contextualização tarifária e simulação de sensibilidade
  if (hasEnoughDataForForecast && estimatedMonthlyCostBrl !== null && estimatedMonthlyCostBrl > 0) {
    recommendations.push({
      id: 'rec_tariff_reference_context',
      priority: 'info',
      category: 'Gestão Tarifária',
      title: 'Verifique a adequação da tarifa e bandeira tarifária na fatura',
      description: `Os custos exibidos utilizam a tarifa configurada de ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh (${settings.referenceLocation ?? OFFICIAL_TARIFF_REFERENCE.referenceLocation}). Tributos variáveis (ICMS, PIS/COFINS), bandeiras tarifárias e CIP alteram o valor final faturado.`,
      reason: 'Transparência metodológica entre estimativa energética (kWh × R$/kWh) e fatura real da distribuidora.',
      evidence: `Previsão atual de ${formatKwh(input.monthlyForecastKwh ?? 0)} × ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh = ${formatCurrencyBRL(estimatedMonthlyCostBrl)}/mês.`,
      estimatedImpact: 'Permite ajustar a tarifa em Configurações para refletir a tarifa efetiva com tributos da sua conta de luz.',
      suggestedAction: 'Consultar o valor do kWh faturado na conta de energia do estabelecimento e atualizar em Configurações.',
      metricBadge: `${formatCurrencyBRL(settings.tariffPerKwh)}/kWh`,
      actionTarget: 'settings',
      actionLabel: 'Configurar tarifa',
    });
  }

  // Regra 7: Operação estável sem anomalias
  if (hasEnoughDataForAnomalies && anomalies.length === 0) {
    recommendations.push({
      id: 'rec_stable_operation',
      priority: 'positive',
      category: 'Operação estável',
      title: 'Consumo diário dentro da faixa estatística esperada',
      description: `Nenhum dia avaliado excedeu o limite configurado de +${formatPercent(settings.anomalyThresholdPercent)} sobre a média móvel anterior.`,
      reason: 'Todas as leituras do período permaneceram dentro do padrão histórico do estabelecimento.',
      evidence: `0 anomalias acima de +${formatPercent(settings.anomalyThresholdPercent)} em ${sortedRecords.length} dias analisados.`,
      estimatedImpact: 'Estabilidade operacional sem picos atípicos identificados no período.',
      suggestedAction: 'Manter a rotina de acompanhamento diário na página de Registros.',
      metricBadge: `Limite: +${formatPercent(settings.anomalyThresholdPercent)}`,
    });
  }

  if (activeInstalledPowerWatts > 0 && recommendations.length === 0) {
    const topEq = topActiveEquipment[0];
    recommendations.push({
      id: 'rec_general_monitoring',
      priority: 'info',
      category: 'Monitoramento',
      title: 'Inventário elétrico mapeado e pronto para análise',
      description: `${activeEquipment.length} equipamento(s) ativo(s) totalizando ${formatPower(activeInstalledPowerWatts)}${topEq ? `, liderados por "${topEq.name}"` : ''}.`,
      reason: 'Inventário de equipamentos configurado para cruzamento com leituras diárias.',
      evidence: `${activeEquipment.length} equipamento(s) ativo(s) (${formatPower(activeInstalledPowerWatts)}).`,
      estimatedImpact: 'Permite rastrear desvios entre potência instalada e consumo registrado.',
      suggestedAction: 'Registrar leituras diárias na página de Registros.',
      metricBadge: formatPower(activeInstalledPowerWatts),
    });
  }

  return recommendations;
}
