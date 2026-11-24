import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarRange, HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { MonthlyComparisonPoint } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatKwh,
  formatPercent,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';

type MonthlyMetricMode = 'total' | 'daily_average';

interface CustomMonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyComparisonPoint }>;
}

const CustomMonthlyTooltip: React.FC<CustomMonthlyTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-header">
        <span className="chart-tooltip-date">{point.fullMonthName}</span>
        {point.isPartialMonth ? (
          <Badge tone="amber">Mês parcial ({point.daysCount}/{point.calendarDaysInMonth}d)</Badge>
        ) : (
          <Badge tone="emerald">Mês completo ({point.daysCount}d)</Badge>
        )}
      </div>

      <div className="chart-tooltip-rows">
        <div className="chart-tooltip-row">
          <span>Consumo acumulado:</span>
          <strong className="tabular-nums">{formatKwh(point.totalKwh)}</strong>
        </div>
        <div className="chart-tooltip-row">
          <span>Custo estimado no mês:</span>
          <strong className="tabular-nums">{formatCurrencyBRL(point.totalCostBrl)}</strong>
        </div>
        <div className="chart-tooltip-row">
          <span>Média diária do mês:</span>
          <strong className="tabular-nums">{formatKwh(point.averageDailyKwh, 2)}/dia</strong>
        </div>
        {point.isPartialMonth && (
          <div className="chart-tooltip-row">
            <span>Projeção p/ {point.calendarDaysInMonth} dias:</span>
            <strong className="tabular-nums text-emerald">
              {formatKwh(point.projectedFullMonthKwh)} ({formatCurrencyBRL(point.projectedFullMonthCostBrl)})
            </strong>
          </div>
        )}
        {point.previousMonthLabel && (
          <div className="chart-tooltip-row">
            <span>Variação média/dia vs. {point.previousMonthLabel}:</span>
            <strong className="tabular-nums">
              {point.dailyAvgVariationPercent !== null
                ? formatPercent(point.dailyAvgVariationPercent, true)
                : 'Sem base anterior'}
            </strong>
          </div>
        )}
      </div>

      <div className="chart-tooltip-note">
        Composição: {point.measuredKwh > 0 ? `Medido ${formatKwh(point.measuredKwh)} · ` : ''}
        {point.estimatedKwh > 0 ? `Estimado ${formatKwh(point.estimatedKwh)} · ` : ''}
        {point.simulatedKwh > 0 ? `Simulado ${formatKwh(point.simulatedKwh)}` : ''}
      </div>
    </div>
  );
};

interface MonthlyComparisonCardProps {
  compact?: boolean;
}

export const MonthlyComparisonCard: React.FC<MonthlyComparisonCardProps> = ({ compact = false }) => {
  const { analysis, state, theme } = useWattWise();
  const [metricMode, setMetricMode] = useState<MonthlyMetricMode>('total');
  const [showHelp, setShowHelp] = useState(false);

  const months = analysis.monthlyComparison;
  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.12)';
  const axisColor = isLight ? '#475569' : '#94a3b8';

  const latestMonth = months.length > 0 ? months[months.length - 1] : null;
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  return (
    <section className="panel" aria-label="Comparativo Mensal Consolidado">
      <div className="panel-header panel-header--wrap">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CalendarRange size={18} className="text-emerald" aria-hidden="true" />
            <h2 className="panel-title">Comparativo Mensal Consolidado</h2>
            <Badge tone="emerald">{months.length} competência(s)</Badge>
            <button
              type="button"
              className="didactic-help-trigger"
              onClick={() => setShowHelp((prev) => !prev)}
              aria-expanded={showHelp}
              title="Como funciona o comparativo mensal?"
            >
              <HelpCircle size={14} />
              <span>Como interpretar?</span>
            </button>
          </div>
          <p className="panel-subtitle">
            Agrupamento cronológico por mês e ano (YYYY-MM), soma de consumo diário, média por dia
            registrado e variação percentual entre períodos
          </p>
        </div>

        {months.length > 0 && (
          <div className="chart-controls">
            <div className="segmented-control" role="group" aria-label="Métrica do gráfico mensal">
              <button
                type="button"
                className={`segmented-btn ${metricMode === 'total' ? 'segmented-btn--active' : ''}`}
                onClick={() => setMetricMode('total')}
              >
                Total do Mês (kWh)
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  metricMode === 'daily_average' ? 'segmented-btn--active' : ''
                }`}
                onClick={() => setMetricMode('daily_average')}
              >
                Média Diária (kWh/dia)
              </button>
            </div>
          </div>
        )}
      </div>

      {showHelp && (
        <div className="didactic-callout">
          <strong>Guia de interpretação do Comparativo Mensal:</strong>
          <p>
            Quando o mês atual ainda está em andamento (ex.: 23 de 30 dias registrados), o{' '}
            <strong>Total Acumulado (kWh)</strong> será naturalmente menor que o de um mês anterior
            completo de 30 ou 31 dias. Por isso, o WattWise calcula também a{' '}
            <strong>Média Diária do Mês (kWh/dia)</strong> e a{' '}
            <strong>Projeção de Fechamento</strong>, garantindo uma comparação justa entre meses com
            quantidades diferentes de dias registrados.
          </p>
        </div>
      )}

      {months.length === 0 ? (
        <div className="status-box status-box--info">
          <div>
            <h3 className="status-box-title">Sem registros suficientes para o comparativo mensal</h3>
            <p className="status-box-text">
              Adicione registros diários de consumo na página de Registros para visualizar a
              consolidação por mês, médias diárias e variações percentuais.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Destaques de comparação entre o mês mais recente e o anterior */}
          {latestMonth && (
            <div className="summary-strip">
              <div className="summary-pill">
                <span className="summary-pill-label">
                  Mês atual ({latestMonth.monthLabel} · {latestMonth.daysCount}d)
                </span>
                <strong className="summary-pill-value tabular-nums text-emerald">
                  {formatKwh(latestMonth.totalKwh)}
                </strong>
                <span className="summary-pill-sub tabular-nums">
                  Custo acumulado: {formatCurrencyBRL(latestMonth.totalCostBrl)} · Média:{' '}
                  {formatKwh(latestMonth.averageDailyKwh, 2)}/dia
                </span>
              </div>

              <div className="summary-pill">
                <span className="summary-pill-label">
                  {previousMonth
                    ? `Mês anterior (${previousMonth.monthLabel} · ${previousMonth.daysCount}d)`
                    : 'Mês anterior'}
                </span>
                <strong className="summary-pill-value tabular-nums">
                  {previousMonth ? formatKwh(previousMonth.totalKwh) : 'Sem mês anterior'}
                </strong>
                <span className="summary-pill-sub tabular-nums">
                  {previousMonth
                    ? `Custo: ${formatCurrencyBRL(previousMonth.totalCostBrl)} · Média: ${formatKwh(previousMonth.averageDailyKwh, 2)}/dia`
                    : 'Registre leituras em mais de um mês para comparar'}
                </span>
              </div>

              <div className="summary-pill">
                <span className="summary-pill-label">
                  Variação do ritmo diário ({latestMonth.monthLabel} vs.{' '}
                  {previousMonth ? previousMonth.monthLabel : 'anterior'})
                </span>
                <strong className="summary-pill-value tabular-nums">
                  {latestMonth.dailyAvgVariationPercent !== null ? (
                    <span
                      className={
                        latestMonth.dailyAvgVariationPercent > 0 ? 'text-amber' : 'text-emerald'
                      }
                    >
                      {latestMonth.dailyAvgVariationPercent > 0 ? (
                        <TrendingUp
                          size={18}
                          style={{ verticalAlign: 'middle', marginRight: 5 }}
                        />
                      ) : (
                        <TrendingDown
                          size={18}
                          style={{ verticalAlign: 'middle', marginRight: 5 }}
                        />
                      )}
                      {formatPercent(latestMonth.dailyAvgVariationPercent, true)}
                    </span>
                  ) : (
                    'Mês base inicial'
                  )}
                </strong>
                <span className="summary-pill-sub tabular-nums">
                  {latestMonth.isPartialMonth
                    ? `Projeção de fechamento (${latestMonth.calendarDaysInMonth}d): ${formatKwh(latestMonth.projectedFullMonthKwh)}`
                    : `Variação total acumulada: ${latestMonth.totalVariationPercent !== null ? formatPercent(latestMonth.totalVariationPercent, true) : '—'}`}
                </span>
              </div>
            </div>
          )}

          {/* Gráfico de Barras Mensal */}
          <div className="chart-canvas" style={{ height: compact ? 230 : 260 }}>
            <ResponsiveContainer width="100%" height={compact ? 230 : 260}>
              {metricMode === 'total' ? (
                <BarChart data={months} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                    tickFormatter={(v: number) => `${v} kWh`}
                    width={72}
                  />
                  <Tooltip content={<CustomMonthlyTooltip />} />
                  <Bar
                    dataKey="measuredKwh"
                    name="Medido (kWh)"
                    stackId="monthStack"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="estimatedKwh"
                    name="Estimado (kWh)"
                    stackId="monthStack"
                    fill="#0284c7"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="simulatedKwh"
                    name="Simulado (kWh)"
                    stackId="monthStack"
                    fill="#158c5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart data={months} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                    tickFormatter={(v: number) => `${v} kWh/d`}
                    width={80}
                  />
                  <Tooltip content={<CustomMonthlyTooltip />} />
                  <Bar
                    dataKey="averageDailyKwh"
                    name="Média diária (kWh/dia)"
                    fill="#24B47E"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Tabela Consolidada por Competência */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês / Ano</th>
                  <th className="text-right">Dias Reg.</th>
                  <th className="text-right">Média Diária</th>
                  <th className="text-right">Var. Média/Dia</th>
                  <th className="text-right">Total Acumulado</th>
                  <th className="text-right">Var. Total Mês</th>
                  <th className="text-right">Custo Estimado (R$)</th>
                  <th>Status do Mês</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.monthKey}>
                    <td>
                      <span className="cell-strong">{m.fullMonthName}</span>
                      <span className="cell-sub">{m.monthLabel}</span>
                    </td>
                    <td className="text-right tabular-nums">
                      {m.daysCount} / {m.calendarDaysInMonth}d
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong">{formatKwh(m.averageDailyKwh, 2)}/dia</span>
                      <span className="cell-sub">{formatCurrencyBRL(m.averageDailyCostBrl)}/dia</span>
                    </td>
                    <td className="text-right tabular-nums">
                      {m.dailyAvgVariationPercent !== null ? (
                        <Badge tone={m.dailyAvgVariationPercent > 0 ? 'amber' : 'emerald'}>
                          {formatPercent(m.dailyAvgVariationPercent, true)}
                        </Badge>
                      ) : (
                        <span className="cell-sub">Mês base</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong text-emerald">{formatKwh(m.totalKwh)}</span>
                      {m.isPartialMonth && (
                        <span className="cell-sub">
                          Proj. {m.calendarDaysInMonth}d: {formatKwh(m.projectedFullMonthKwh)}
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {m.totalVariationPercent !== null ? (
                        <span
                          className={
                            m.totalVariationPercent > 0 ? 'text-amber' : 'text-emerald'
                          }
                        >
                          {formatPercent(m.totalVariationPercent, true)}
                        </span>
                      ) : (
                        <span className="cell-sub">—</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong">{formatCurrencyBRL(m.totalCostBrl)}</span>
                      <span className="cell-sub">
                        Tarifa: {formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh
                      </span>
                    </td>
                    <td>
                      {m.isPartialMonth ? (
                        <Badge tone="sky">Parcial ({m.daysCount}d)</Badge>
                      ) : (
                        <Badge tone="emerald">Consolidado</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
