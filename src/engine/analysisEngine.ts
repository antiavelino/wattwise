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
} from '../types/energy';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  formatShortDate,
} from '../utils/formatters';

export const MIN_RECORDS_FOR_FORECAST = 3;
export const MIN_BASELINE_DAYS_FOR_ANOMALY = 3;
export const MIN_RECORDS_FOR_ANOMALIES = MIN_BASELINE_DAYS_FOR_ANOMALY + 1;
const ROLLING_BASELINE_WINDOW = 7;
const FORECAST_WINDOW_DAYS = 30;
const DAYS_IN_MONTH = 30;

/**
 * Fator médio de emissão de referência da matriz elétrica brasileira (SIN),
 * em kg CO2e por kWh consumido, utilizado para estimar o impacto ambiental.
 */
export const BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.0817;

/**
 * Estima emissões de CO2 equivalente (kg CO2e) a partir da energia elétrica (kWh).
 */
export function calculateCo2EmissionsKg(
  energyKwh: number,
  emissionFactor = BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
): number {
  if (!Number.isFinite(energyKwh) || energyKwh <= 0 || !Number.isFinite(emissionFactor) || emissionFactor <= 0) {
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
 * kWh = (Potência em W × horas de utilização × quantidade × dias) / 1000
 * Diferencia potência nominal (W / kW) de energia consumida (kWh).
 */
export function calculateEquipmentEnergyKwh(
  powerWatts: number,
  hoursPerDay: number,
  quantity = 1,
  days = 1,
): number {
  if (
    !Number.isFinite(powerWatts) ||
    !Number.isFinite(hoursPerDay) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(days) ||
    powerWatts <= 0 ||
    hoursPerDay < 0 ||
    quantity <= 0 ||
    days <= 0
  ) {
    return 0;
  }
  const safeHours = Math.min(24, Math.max(0, hoursPerDay));
  return roundTo((powerWatts * safeHours * quantity * days) / 1000, 2);
}

/**
 * Custo financeiro da energia:
 * Custo (R$) = Energia (kWh) × Tarifa (R$/kWh)
 */
export function calculateEnergyCostBrl(energyKwh: number, tariffPerKwh: number): number {
  if (!Number.isFinite(energyKwh) || !Number.isFinite(tariffPerKwh) || energyKwh < 0 || tariffPerKwh <= 0) {
    return 0;
  }
  return roundTo(energyKwh * tariffPerKwh, 2);
}

/**
 * Calcula o consumo ocorrido entre duas leituras cumulativas de um medidor (kWh).
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

const MONTH_NAMES_PT = [
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

function buildMonthlyComparison(
  sortedRecords: ConsumptionRecord[],
  tariffPerKwh: number,
): MonthlyComparisonPoint[] {
  const map = new Map<
    string,
    {
      totalKwh: number;
      daysCount: number;
      measuredKwh: number;
      estimatedKwh: number;
      simulatedKwh: number;
    }
  >();

  for (const record of sortedRecords) {
    const monthKey = record.date.slice(0, 7);
    const mType = resolveMeasurementType(record);
    const current = map.get(monthKey) ?? {
      totalKwh: 0,
      daysCount: 0,
      measuredKwh: 0,
      estimatedKwh: 0,
      simulatedKwh: 0,
    };
    current.totalKwh += record.consumptionKwh;
    current.daysCount += 1;
    if (mType === 'measured') current.measuredKwh += record.consumptionKwh;
    else if (mType === 'estimated') current.estimatedKwh += record.consumptionKwh;
    else current.simulatedKwh += record.consumptionKwh;
    map.set(monthKey, current);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, item]) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const monthIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
      const monthLabel = `${MONTH_NAMES_PT[monthIdx]}/${yearStr.slice(2)}`;
      const totalKwh = roundTo(item.totalKwh, 1);
      return {
        monthKey,
        monthLabel,
        totalKwh,
        totalCostBrl: calculateEnergyCostBrl(totalKwh, tariffPerKwh),
        averageDailyKwh: item.daysCount > 0 ? roundTo(item.totalKwh / item.daysCount, 2) : 0,
        daysCount: item.daysCount,
        measuredKwh: roundTo(item.measuredKwh, 1),
        estimatedKwh: roundTo(item.estimatedKwh, 1),
        simulatedKwh: roundTo(item.simulatedKwh, 1),
      };
    });
}

function buildPeriodComparison(
  sortedRecords: ConsumptionRecord[],
  tariffPerKwh: number,
): PeriodComparisonSummary {
  if (sortedRecords.length < 4) {
    const total = roundTo(
      sortedRecords.reduce((acc, r) => acc + r.consumptionKwh, 0),
      1,
    );
    return {
      currentPeriodKwh: total,
      previousPeriodKwh: 0,
      variationPercent: null,
      currentPeriodCostBrl: calculateEnergyCostBrl(total, tariffPerKwh),
      previousPeriodCostBrl: 0,
    };
  }

  const half = Math.floor(sortedRecords.length / 2);
  const previousSlice = sortedRecords.slice(sortedRecords.length - half * 2, sortedRecords.length - half);
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
  const rawForecastBasisAverage = hasEnoughDataForForecast
    ? calculateMean(forecastValues)
    : null;
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
        ? `Estimativa sujeita a variação: há ${missingDaysInWindow} dia(s) sem leitura no intervalo analisado e coeficiente de variação diária de ${variationCoefficientPercent ?? 0}%. Não representa valor garantido de fatura.`
        : `Estimativa estatística com coeficiente de variação diária de ${variationCoefficientPercent ?? 0}%. Mudanças de turno, clima ou bandeira tarifária alteram o consumo real.`,
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

  // Resumo individual por equipamento (diferenciando potência nominal, consumo calculado e consumo medido vinculado)
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
    const totalRatedPowerWatts = eq.powerWatts * qty;
    const isAct = eq.status === 'active';
    const estimatedDailyKwh = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, 1)
      : 0;
    const estimatedMonthlyKwh = isAct
      ? calculateEquipmentEnergyKwh(eq.powerWatts, hours, qty, DAYS_IN_MONTH)
      : 0;
    const estimatedMonthlyCostBrl = calculateEnergyCostBrl(
      estimatedMonthlyKwh,
      settings.tariffPerKwh,
    );
    const measuredStats = measuredByEquipmentId.get(eq.id) ?? { kwh: 0, count: 0 };

    return {
      equipment: eq,
      totalRatedPowerWatts,
      estimatedDailyKwh,
      estimatedMonthlyKwh,
      estimatedMonthlyCostBrl,
      measuredPeriodKwh: roundTo(measuredStats.kwh, 2),
      measuredReadingsCount: measuredStats.count,
    };
  });

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
    .sort((a, b) => b.totalRatedPowerWatts - a.totalRatedPowerWatts);

  // Distribuição de potência ativa e consumo estimado por categoria
  const categoryMap = new Map<
    EquipmentCategory,
    { powerWatts: number; estimatedMonthlyKwh: number; activeCount: number }
  >();
  for (const summary of equipmentSummaries) {
    if (summary.equipment.status !== 'active') continue;
    const cat = summary.equipment.category;
    const existing = categoryMap.get(cat) ?? {
      powerWatts: 0,
      estimatedMonthlyKwh: 0,
      activeCount: 0,
    };
    categoryMap.set(cat, {
      powerWatts: existing.powerWatts + summary.totalRatedPowerWatts,
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
        estimatedMonthlyKwh: estKwh,
        estimatedMonthlyCostBrl: calculateEnergyCostBrl(estKwh, settings.tariffPerKwh),
        activeCount: data.activeCount,
        percentage:
          activeInstalledPowerWatts > 0
            ? roundTo((data.powerWatts / activeInstalledPowerWatts) * 100, 1)
            : 0,
      };
    })
    .sort((a, b) => b.powerWatts - a.powerWatts);

  const topActiveEquipment = [...activeEquipment]
    .sort((a, b) => getEquipmentTotalWatts(b) - getEquipmentTotalWatts(a))
    .slice(0, 5);

  // Detecção de anomalias: compara cada dia (a partir do 4º) com a média móvel anterior (até 7 dias)
  const hasEnoughDataForAnomalies = totalRecords >= MIN_RECORDS_FOR_ANOMALIES;
  const recordsNeededForAnomalies = Math.max(0, MIN_RECORDS_FOR_ANOMALIES - totalRecords);

  const anomalies: AnomalyAlert[] = [];
  const chartData: ChartPoint[] = [];

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
            title:
              anomalySeverity === 'critical'
                ? `Pico crítico em ${formatFullDate(record.date)}`
                : `Consumo acima do limite em ${formatFullDate(record.date)}`,
            description: `${formatKwh(record.consumptionKwh)} registrados, ${formatPercent(deviationPercent, true)} acima da média dos ${priorSlice.length} dias anteriores (${formatKwh(baselineAverageKwh)}). Excedente estimado de ${formatCurrencyBRL(estimatedExcessCostBrl)}.`,
            explanation: `Regra estatística local: o consumo em ${formatFullDate(record.date)} (${formatKwh(record.consumptionKwh)}) superou em ${formatPercent(deviationPercent)} a janela histórica anterior de ${priorSlice.length} dias (${formatKwh(baselineAverageKwh)}), ultrapassando o limite configurado de ${formatPercent(settings.anomalyThresholdPercent)}.`,
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
  const monthlyComparison = buildMonthlyComparison(sortedRecords, settings.tariffPerKwh);

  const periodCo2Kg = calculateCo2EmissionsKg(periodTotalKwh);
  const monthlyForecastCo2Kg =
    monthlyForecastKwh !== null ? calculateCo2EmissionsKg(monthlyForecastKwh) : null;
  const tenPercentAnnualCo2SavedKg =
    monthlyForecastCo2Kg !== null ? roundTo(monthlyForecastCo2Kg * 0.1 * 12, 2) : null;
  const tenPercentAnnualCostSavedBrl =
    estimatedMonthlyCostBrl !== null ? roundTo(estimatedMonthlyCostBrl * 0.1 * 12, 2) : null;

  const environmentalImpact: EnvironmentalImpactSummary = {
    emissionFactorKgPerKwh: BRAZIL_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
    periodCo2Kg,
    monthlyForecastCo2Kg,
    tenPercentAnnualCo2SavedKg,
    tenPercentAnnualCostSavedBrl,
    methodologyNote:
      'Estimativa calculada com fator médio de referência de 0,0817 kg CO₂e/kWh (matriz elétrica brasileira / SIN). Valor educativo para mensuração de impacto ambiental e uso racional de recursos naturais.',
  };

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
    topActiveEquipment,
    anomalies: sortedAnomalies,
    settings,
  });

  const demoRecordsCount = records.filter((r) => r.isDemo || r.measurementType === 'simulated').length;
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
    recommendations,
    chartData,
    hasDemoData,
    demoRecordsCount,
    demoEquipmentCount,
  };
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
      title: 'Amplie o histórico diário para ativar a detecção completa',
      description:
        sortedRecords.length === 0
          ? 'Nenhum consumo diário registrado até o momento. Adicione pelo menos 4 dias de leitura para habilitar média histórica, previsão mensal e detecção automática de anomalias.'
          : `Você possui ${sortedRecords.length} registro(s). Faltam ${recordsNeededForAnomalies} dia(s) para o motor local comparar consumo recente com a média dos dias anteriores.`,
      reason: 'A janela mínima de comparação estatística exige 3 dias anteriores de base e 1 dia analisado.',
      evidence: `${sortedRecords.length} de ${MIN_RECORDS_FOR_ANOMALIES} leituras diárias mínimas registradas.`,
      estimatedImpact: 'Habilita alertas automáticos de desperdício e previsão mensal de faturamento.',
      suggestedAction: 'Inserir leituras diárias no módulo de Medições ou importar histórico.',
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
      title: 'Cadastre seus equipamentos ativos para mapear a carga',
      description:
        'Com a potência nominal dos equipamentos cadastrada, o WattWise identifica quais categorias concentram maior demanda e contextualiza os picos de consumo.',
      reason: 'Não há equipamentos com status ativo vinculados à organização.',
      evidence: '0 W de potência nominal ativa instalada.',
      estimatedImpact: 'Permite separar potência instalada (kW) de consumo estimado por equipamento (kWh).',
      suggestedAction: 'Cadastrar os principais equipamentos elétricos com potência (W), quantidade e horas de uso.',
      metricBadge: '0 W ativos',
      actionTarget: 'equipment',
      actionLabel: 'Cadastrar equipamentos',
    });
  }

  // Regra 3: Anomalia no registro mais recente ou nos últimos registros
  if (anomalies.length > 0 && latestRecord) {
    const latestAnomaly = anomalies[0];
    const isMostRecentDay = latestAnomaly.date === latestRecord.date;
    const topConsumer = topActiveEquipment[0];
    const topPower = topConsumer
      ? topConsumer.powerWatts * Math.max(1, topConsumer.quantity ?? 1)
      : 0;

    recommendations.push({
      id: 'rec_recent_anomaly',
      priority: 'high',
      category: 'Anomalia detectada',
      title: isMostRecentDay
        ? 'Investigue o pico registrado no último dia'
        : `Revise o pico atípico de ${formatFullDate(latestAnomaly.date)}`,
      description: topConsumer
        ? `O consumo atingiu ${formatKwh(latestAnomaly.consumptionKwh)} (${formatPercent(latestAnomaly.deviationPercent, true)} acima da base). Verifique o tempo de uso de cargas críticas como "${topConsumer.name}" (${formatPower(topPower)}).`
        : `O consumo atingiu ${formatKwh(latestAnomaly.consumptionKwh)} (${formatPercent(latestAnomaly.deviationPercent, true)} acima da base), gerando excedente estimado de ${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)}.`,
      reason: `O consumo diário superou o limite de alerta configurado (${formatPercent(settings.anomalyThresholdPercent)}).`,
      evidence: `Leitura de ${formatKwh(latestAnomaly.consumptionKwh)} em ${formatFullDate(latestAnomaly.date)} contra média anterior de ${formatKwh(latestAnomaly.baselineAverageKwh)} (+${formatKwh(latestAnomaly.excessKwh)}).`,
      estimatedImpact: `Custo excedente estimado de ${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)} neste evento.`,
      suggestedAction: topConsumer
        ? `Auditar horário de funcionamento de "${topConsumer.name}" e registrar tratativa na tela de Alertas.`
        : 'Auditar cargas acionadas fora do expediente e reconhecer o alerta após verificação.',
      metricBadge: `+${formatCurrencyBRL(latestAnomaly.estimatedExcessCostBrl)}`,
      actionTarget: 'alerts',
      actionLabel: 'Gerenciar alerta',
    });
  }

  // Regra 4: Tendência de alta recente (últimos 5 dias vs dias anteriores)
  if (sortedRecords.length >= 10) {
    const recentSlice = sortedRecords.slice(-5);
    const earlierSlice = sortedRecords.slice(-10, -5);
    const recentAvg = calculateMean(recentSlice.map((r) => r.consumptionKwh));
    const earlierAvg = calculateMean(earlierSlice.map((r) => r.consumptionKwh));

    if (recentAvg !== null && earlierAvg !== null && earlierAvg > 0) {
      const trendPct = roundTo(((recentAvg - earlierAvg) / earlierAvg) * 100, 1);
      if (trendPct >= 8) {
        const monthlyImpact = roundTo(
          (recentAvg - earlierAvg) * DAYS_IN_MONTH * settings.tariffPerKwh,
          2,
        );
        recommendations.push({
          id: 'rec_upward_trend',
          priority: 'medium',
          category: 'Tendência',
          title: 'Tendência de elevação nos últimos 5 dias',
          description: `A média recente (${formatKwh(recentAvg)}/dia) está ${formatPercent(trendPct, true)} acima dos 5 dias anteriores (${formatKwh(earlierAvg)}/dia). Mantido esse ritmo, o acréscimo mensal estimado é de ${formatCurrencyBRL(monthlyImpact)}.`,
          reason: 'Elevação persistente do patamar médio diário na janela recente de 5 dias.',
          evidence: `Média subiu de ${formatKwh(earlierAvg)}/dia para ${formatKwh(recentAvg)}/dia (${formatPercent(trendPct, true)}).`,
          estimatedImpact: `Acréscimo projetado de ${formatCurrencyBRL(monthlyImpact)}/mês caso o patamar atual se mantenha.`,
          suggestedAction: 'Comparar períodos no módulo de Análises e verificar equipamentos que permaneceram ligados após o expediente.',
          metricBadge: `${formatPercent(trendPct, true)} em 5 dias`,
          actionTarget: 'analysis',
          actionLabel: 'Analisar tendência',
        });
      }
    }
  }

  // Regra 5: Concentração de potência em Climatização (>= 30% da potência ativa)
  const hvacLoad = categoryLoads.find((c) => c.category === 'Climatização');
  if (hvacLoad && hvacLoad.percentage >= 30) {
    recommendations.push({
      id: 'rec_hvac_optimization',
      priority: 'medium',
      category: 'Climatização',
      title: 'Climatização concentra parcela relevante da carga instalada',
      description: `Equipamentos de climatização somam ${formatPower(hvacLoad.powerWatts)} (${formatPercent(hvacLoad.percentage)} da potência ativa). Ajustar o termostato para 23 °C–24 °C, limpar filtros periodicamente e desligar fora do expediente reduz picos diários.`,
      reason: 'Alta participação de sistemas térmicos na potência nominal instalada.',
      evidence: `${hvacLoad.activeCount} equipamento(s) de Climatização somando ${formatPower(hvacLoad.powerWatts)} (${formatPercent(hvacLoad.percentage)} da carga ativa) e consumo estimado de ${formatKwh(hvacLoad.estimatedMonthlyKwh)}/mês.`,
      estimatedImpact: `Reduzir 1 hora diária de operação em Climatização pode economizar cerca de ${formatCurrencyBRL(roundTo(hvacLoad.estimatedMonthlyCostBrl * 0.125, 2))}/mês (estimado).`,
      suggestedAction: 'Padronizar setpoint em 23 °C–24 °C e revisar programação horária dos aparelhos.',
      metricBadge: `${formatPercent(hvacLoad.percentage)} da carga`,
      actionTarget: 'equipment',
      actionLabel: 'Revisar equipamentos',
    });
  }

  // Regra 6: Concentração em Maquinário ou Refrigeração (>= 30%)
  const heavyLoad = categoryLoads.find(
    (c) => (c.category === 'Maquinário' || c.category === 'Refrigeração') && c.percentage >= 30,
  );
  if (heavyLoad) {
    recommendations.push({
      id: `rec_heavy_${heavyLoad.category}`,
      priority: 'medium',
      category: heavyLoad.category,
      title: `Otimize ciclos de operação em ${heavyLoad.category}`,
      description: `${heavyLoad.category} representa ${formatPercent(heavyLoad.percentage)} da potência nominal ativa (${formatPower(heavyLoad.powerWatts)}). Evitar acionamentos simultâneos e revisar manutenção preventiva ajuda a estabilizar a demanda.`,
      reason: `Concentração superior a 30% da potência nominal em ${heavyLoad.category}.`,
      evidence: `${formatPower(heavyLoad.powerWatts)} instalados (${formatPercent(heavyLoad.percentage)} do total ativo), com consumo estimado de ${formatKwh(heavyLoad.estimatedMonthlyKwh)}/mês.`,
      estimatedImpact: `Custo estimado da categoria: ${formatCurrencyBRL(heavyLoad.estimatedMonthlyCostBrl)}/mês.`,
      suggestedAction: 'Escalonar partidas de motores/fornos e inspecionar vedações térmicas.',
      metricBadge: formatPower(heavyLoad.powerWatts),
      actionTarget: 'equipment',
      actionLabel: 'Ver inventário',
    });
  }

  // Regra 7: Simulação objetiva de economia de 10% baseada na tarifa configurada
  if (hasEnoughDataForForecast && estimatedMonthlyCostBrl !== null && estimatedMonthlyCostBrl > 0) {
    const potentialTenPercentSavings = roundTo(estimatedMonthlyCostBrl * 0.1, 2);
    recommendations.push({
      id: 'rec_tariff_savings_target',
      priority: 'info',
      category: 'Meta de eficiência',
      title: 'Impacto financeiro de uma redução de 10%',
      description: `Com a tarifa atual de ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh e previsão de ${formatCurrencyBRL(estimatedMonthlyCostBrl)}/mês, reduzir 10% do consumo diário gera economia estimada de ${formatCurrencyBRL(potentialTenPercentSavings)} por mês.`,
      reason: 'Quantificação financeira de meta operacional de eficiência de 10%.',
      evidence: `Previsão mensal de ${formatCurrencyBRL(estimatedMonthlyCostBrl)} calculada com tarifa de ${formatCurrencyBRL(settings.tariffPerKwh)}/kWh.`,
      estimatedImpact: `Potencial estimado de até ${formatCurrencyBRL(potentialTenPercentSavings)}/mês (${formatCurrencyBRL(roundTo(potentialTenPercentSavings * 12, 2))}/ano) caso a meta de 10% seja atingida.`,
      suggestedAction: 'Acompanhar relatórios semanais e priorizar os 3 equipamentos de maior consumo estimado.',
      metricBadge: `-${formatCurrencyBRL(potentialTenPercentSavings)}/mês`,
      actionTarget: 'reports',
      actionLabel: 'Gerar relatório',
    });
  }

  // Regra 8: Operação estável sem anomalias
  if (hasEnoughDataForAnomalies && anomalies.length === 0) {
    recommendations.push({
      id: 'rec_stable_operation',
      priority: 'positive',
      category: 'Operação estável',
      title: 'Consumo dentro do padrão esperado',
      description: `Nenhum dia excedeu o limite configurado de ${formatPercent(settings.anomalyThresholdPercent)} acima da média dos dias anteriores. Continue registrando o consumo diário para manter a precisão da previsão.`,
      reason: 'Todas as leituras analisadas permaneceram dentro da faixa estatística normal.',
      evidence: `0 anomalias acima de +${formatPercent(settings.anomalyThresholdPercent)} em ${sortedRecords.length} dias avaliados.`,
      estimatedImpact: 'Previsibilidade orçamentária mantida sem custos excedentes por picos.',
      suggestedAction: 'Manter a rotina diária de registro no módulo de Medições.',
      metricBadge: `Limite: ${formatPercent(settings.anomalyThresholdPercent)}`,
    });
  }

  if (activeInstalledPowerWatts > 0 && recommendations.length === 0) {
    recommendations.push({
      id: 'rec_general_monitoring',
      priority: 'info',
      category: 'Monitoramento',
      title: 'Acompanhamento ativo configurado',
      description: `${activeEquipment.length} equipamento(s) ativo(s) totalizando ${formatPower(activeInstalledPowerWatts)}. Registre o consumo diariamente para receber alertas contextualizados.`,
      reason: 'Inventário de equipamentos configurado e pronto para cruzamento com leituras.',
      evidence: `${activeEquipment.length} equipamento(s) ativo(s) (${formatPower(activeInstalledPowerWatts)}).`,
      estimatedImpact: 'Permite rastrear desvios entre potência instalada e consumo medido.',
      suggestedAction: 'Registrar leituras diárias no módulo de Medições.',
      metricBadge: formatPower(activeInstalledPowerWatts),
    });
  }

  return recommendations;
}
