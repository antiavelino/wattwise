import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { ChartPoint } from '../../types/energy';
import { formatCurrencyBRL, formatKwh, formatPercent } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';

type ChartMetric = 'kwh' | 'cost';
type PeriodFilter = '14' | '30' | 'all';

interface ConsumptionChartProps {
  onAddRecord: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  metric: ChartMetric;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, metric }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-header">
        <span className="chart-tooltip-date">{point.fullDate}</span>
        {point.isDemo && <span className="chart-tooltip-demo">Demo</span>}
      </div>

      <div className="chart-tooltip-rows">
        <div className="chart-tooltip-row">
          <span>Consumo</span>
          <strong className="tabular-nums">{formatKwh(point.consumptionKwh)}</strong>
        </div>
        <div className="chart-tooltip-row">
          <span>Custo estimado</span>
          <strong className="tabular-nums">{formatCurrencyBRL(point.estimatedCostBrl)}</strong>
        </div>
        {point.baselineAverageKwh !== null && (
          <div className="chart-tooltip-row">
            <span>Base anterior</span>
            <span className="tabular-nums">
              {metric === 'kwh'
                ? formatKwh(point.baselineAverageKwh)
                : formatCurrencyBRL(
                    point.baselineAverageKwh *
                      (point.consumptionKwh > 0
                        ? point.estimatedCostBrl / point.consumptionKwh
                        : 0),
                  )}
            </span>
          </div>
        )}
        {point.deviationPercent !== null && (
          <div className="chart-tooltip-row">
            <span>Desvio vs base</span>
            <span
              className={`tabular-nums ${
                point.isAnomaly ? 'text-amber' : 'text-emerald'
              }`}
            >
              {formatPercent(point.deviationPercent, true)}
            </span>
          </div>
        )}
      </div>

      {point.isAnomaly && (
        <div className="chart-tooltip-alert">
          <AlertTriangle size={12} />
          <span>Anomalia detectada acima do limite configurado</span>
        </div>
      )}

      {point.note && <p className="chart-tooltip-note">{point.note}</p>}
    </div>
  );
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  index?: number;
}

function renderAnomalyDot(props: CustomDotProps) {
  const { cx, cy, payload, index } = props;
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return <g key={`empty-dot-${index ?? 0}`} />;
  }

  if (payload.isAnomaly) {
    const color = payload.anomalySeverity === 'critical' ? '#ef4444' : '#f59e0b';
    return (
      <g key={`dot-${payload.id}`}>
        <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.24} />
        <circle cx={cx} cy={cy} r={4.8} fill={color} stroke="#090e17" strokeWidth={2} />
      </g>
    );
  }

  return (
    <circle
      key={`dot-${payload.id}`}
      cx={cx}
      cy={cy}
      r={3.2}
      fill="#34d399"
      stroke="#090e17"
      strokeWidth={1.5}
    />
  );
}

export const ConsumptionChart: React.FC<ConsumptionChartProps> = ({ onAddRecord }) => {
  const { analysis, state, theme } = useWattWise();
  const [metric, setMetric] = useState<ChartMetric>('kwh');
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const chartAccent = theme === 'light' ? '#158C5E' : '#24B47E';
  const tickColor = theme === 'light' ? '#577064' : '#9EB0A7';
  const gridStroke = theme === 'light' ? 'rgba(18, 56, 45, 0.08)' : 'rgba(130, 145, 138, 0.14)';
  const dotBorder = theme === 'light' ? '#FFFFFF' : '#0B1714';

  const visibleData = useMemo(() => {
    if (period === '14') return analysis.chartData.slice(-14);
    if (period === '30') return analysis.chartData.slice(-30);
    return analysis.chartData;
  }, [analysis.chartData, period]);

  const referenceValue = useMemo(() => {
    if (analysis.historicalAverageKwh === null) return null;
    return metric === 'kwh'
      ? analysis.historicalAverageKwh
      : Math.round(analysis.historicalAverageKwh * state.settings.tariffPerKwh * 100) / 100;
  }, [analysis.historicalAverageKwh, metric, state.settings.tariffPerKwh]);

  const dataKey = metric === 'kwh' ? 'consumptionKwh' : 'estimatedCostBrl';

  return (
    <section className="panel chart-panel" aria-label="Gráfico de consumo histórico">
      <div className="panel-header panel-header--wrap">
        <div>
          <h2 className="panel-title">Consumo Histórico Diário</h2>
          <p className="panel-subtitle">
            {analysis.totalRecords > 0
              ? `Evolução de ${visibleData.length} dia(s) com linha de média histórica e marcação de anomalias`
              : 'Registre o consumo diário para visualizar a série histórica'}
          </p>
        </div>

        {analysis.totalRecords > 0 && (
          <div className="chart-controls">
            <div className="segmented-control" role="group" aria-label="Unidade do gráfico">
              <button
                type="button"
                className={`segmented-btn ${metric === 'kwh' ? 'segmented-btn--active' : ''}`}
                onClick={() => setMetric('kwh')}
              >
                kWh
              </button>
              <button
                type="button"
                className={`segmented-btn ${metric === 'cost' ? 'segmented-btn--active' : ''}`}
                onClick={() => setMetric('cost')}
              >
                Custo (R$)
              </button>
            </div>

            <div className="segmented-control" role="group" aria-label="Período do gráfico">
              <button
                type="button"
                className={`segmented-btn ${period === '14' ? 'segmented-btn--active' : ''}`}
                onClick={() => setPeriod('14')}
              >
                14d
              </button>
              <button
                type="button"
                className={`segmented-btn ${period === '30' ? 'segmented-btn--active' : ''}`}
                onClick={() => setPeriod('30')}
              >
                30d
              </button>
              <button
                type="button"
                className={`segmented-btn ${period === 'all' ? 'segmented-btn--active' : ''}`}
                onClick={() => setPeriod('all')}
              >
                Todos
              </button>
            </div>
          </div>
        )}
      </div>

      {analysis.totalRecords === 0 ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Nenhum histórico de consumo registrado"
          description="Adicione lançamentos diários em kWh para visualizar a curva de consumo, a média histórica e os pontos de anomalia."
          actionLabel="Registrar primeiro dia"
          onAction={onAddRecord}
          compact
        />
      ) : (
        <>
          <div className="chart-legend-row">
            <span className="legend-item">
              <span className="legend-dot legend-dot--emerald" />
              {metric === 'kwh' ? 'Consumo diário (kWh)' : 'Custo diário estimado (R$)'}
            </span>
            {referenceValue !== null && (
              <span className="legend-item">
                <span className="legend-line legend-line--dashed" />
                Média histórica (
                {metric === 'kwh'
                  ? formatKwh(referenceValue)
                  : formatCurrencyBRL(referenceValue)}
                )
              </span>
            )}
            <span className="legend-item">
              <span className="legend-dot legend-dot--amber" />
              Anomalia (&ge; {state.settings.anomalyThresholdPercent}% acima da base)
            </span>
          </div>

          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={visibleData}
                margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="wattwiseEmeraldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartAccent} stopOpacity={0.36} />
                    <stop offset="85%" stopColor={chartAccent} stopOpacity={0.04} />
                    <stop offset="100%" stopColor={chartAccent} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke={gridStroke}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="shortDate"
                  stroke={tickColor}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  minTickGap={16}
                />

                <YAxis
                  stroke={tickColor}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={metric === 'cost' ? 68 : 54}
                  tickFormatter={(val: number) =>
                    metric === 'kwh' ? `${val}` : `R$${Math.round(val)}`
                  }
                />

                <Tooltip
                  content={<CustomChartTooltip metric={metric} />}
                  cursor={{ stroke: gridStroke, strokeWidth: 1.5 }}
                />

                {referenceValue !== null && (
                  <ReferenceLine
                    y={referenceValue}
                    stroke="var(--sky-400)"
                    strokeDasharray="5 5"
                    strokeOpacity={0.85}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={chartAccent}
                  strokeWidth={2.4}
                  fill="url(#wattwiseEmeraldFill)"
                  dot={renderAnomalyDot}
                  activeDot={{
                    r: 6,
                    fill: chartAccent,
                    stroke: dotBorder,
                    strokeWidth: 2.5,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
};
