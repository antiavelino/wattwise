import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  Info,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { ForecastConfidence } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatKwh,
  formatPercent,
  formatPower,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { MonthlyComparisonCard } from '../dashboard/MonthlyComparisonCard';

const CONFIDENCE_META: Record<
  ForecastConfidence,
  { label: string; tone: 'emerald' | 'sky' | 'amber' | 'slate' }
> = {
  high: { label: 'Confiança Alta (14+ dias contínuos)', tone: 'emerald' },
  moderate: { label: 'Confiança Moderada (7–13 dias)', tone: 'sky' },
  low: { label: 'Confiança Baixa (3–6 dias)', tone: 'amber' },
  insufficient: { label: 'Amostra Insuficiente (< 3 dias)', tone: 'slate' },
};

export const AnalysisView: React.FC = () => {
  const {
    analysis,
    state,
    setActiveSection,
    setSelectedEquipmentId,
    activeScenarioMeta,
  } = useWattWise();
  const { forecast, periodComparison } = analysis;
  const confMeta = CONFIDENCE_META[forecast.confidence];

  return (
    <div className="view-stack">
      {/* 1. Diferenciação das 4 Grandezas Energéticas (Requisito 3.2) */}
      <section className="panel" aria-label="Diferenciação física de grandezas energéticas">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">
              1. Potência Nominal vs. Consumo Estimado vs. Consumo Simulado e Registrado
            </h2>
            <p className="panel-subtitle">
              Separação rigorosa das quatro grandezas elétricas do cenário{' '}
              <strong>{activeScenarioMeta.shortLabel}</strong> ({state.settings.establishmentName})
            </p>
          </div>
          <Badge tone="emerald">Física Energética &amp; Rastreabilidade</Badge>
        </div>

        <div className="four-pillars-grid">
          <div className="summary-pill">
            <span className="summary-pill-label">1. Potência nominal comprovada</span>
            <strong className="summary-pill-value tabular-nums">
              {formatPower(analysis.activeInstalledPowerWatts)}
            </strong>
            <span className="summary-pill-sub">
              Demanda instantânea de {analysis.activeEquipmentCount} equipamento(s) ativo(s)
              baseada em fichas técnicas oficiais
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">2. Consumo estimado pelo inventário</span>
            <strong className="summary-pill-value tabular-nums text-emerald">
              {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês
            </strong>
            <span className="summary-pill-sub tabular-nums">
              {formatKwh(analysis.estimatedEquipmentDailyKwh, 2)}/dia · Custo:{' '}
              {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês (considerando horas
              e fator de ciclo)
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">3. Consumo diário simulado (Demo)</span>
            <strong className="summary-pill-value tabular-nums">
              {formatKwh(analysis.simulatedTotalKwh)}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Acumulado em {analysis.demoRecordsCount} dia(s) simulados · Custo:{' '}
              {formatCurrencyBRL(analysis.simulatedTotalKwh * state.settings.tariffPerKwh)}
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">4. Consumo registrado pelo usuário</span>
            <strong className="summary-pill-value tabular-nums">
              {formatKwh(analysis.measuredTotalKwh + analysis.estimatedTotalKwh)}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Medido: {formatKwh(analysis.measuredTotalKwh)} · Estimado manual:{' '}
              {formatKwh(analysis.estimatedTotalKwh)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Comparativo Mensal Consolidado (Corrigido e Completo) */}
      <MonthlyComparisonCard />

      {/* 3. Diagnóstico da Projeção Mensal e Comparação entre Períodos */}
      <div className="dashboard-split">
        <section className="panel" aria-label="Qualidade da previsão estatística">
          <div className="panel-header panel-header--wrap">
            <div>
              <h2 className="panel-title">Projeção Mensal e Tendência Linear</h2>
              <p className="panel-subtitle">
                Regressão linear por mínimos quadrados e dispersão diária
              </p>
            </div>
            <Badge tone={confMeta.tone}>{confMeta.label}</Badge>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Projeção para 30 dias</span>
              <strong className="tabular-nums text-emerald">
                {analysis.monthlyForecastKwh !== null
                  ? `${formatKwh(analysis.monthlyForecastKwh)} (${formatCurrencyBRL(analysis.estimatedMonthlyCostBrl ?? 0)})`
                  : 'Aguardando 3+ dias'}
              </strong>
            </div>

            <div className="settings-preview-item">
              <span>Inclinação da tendência</span>
              <strong className="tabular-nums">
                {forecast.trendSlopeKwhPerDay !== null ? (
                  <span
                    className={
                      forecast.trendDirection === 'rising'
                        ? 'text-amber'
                        : forecast.trendDirection === 'falling'
                          ? 'text-emerald'
                          : ''
                    }
                  >
                    {forecast.trendSlopeKwhPerDay >= 0 ? '+' : ''}
                    {forecast.trendSlopeKwhPerDay.toFixed(2).replace('.', ',')} kWh/dia
                  </span>
                ) : (
                  '—'
                )}
              </strong>
            </div>

            <div className="settings-preview-item">
              <span>Coeficiente de variação diária</span>
              <strong className="tabular-nums">
                {forecast.variationCoefficientPercent !== null
                  ? formatPercent(forecast.variationCoefficientPercent)
                  : '—'}
              </strong>
            </div>

            <div className="settings-preview-item">
              <span>Amostra da janela recente</span>
              <strong className="tabular-nums">
                {forecast.sampleDaysCount} dia(s) ({forecast.missingDaysInWindow} lacunas)
              </strong>
            </div>
          </div>

          <div className="status-box status-box--info">
            <div className="status-box-icon">
              <Info size={18} />
            </div>
            <div>
              <h3 className="status-box-title">Metodologia determinística</h3>
              <p className="status-box-text">{forecast.methodology}</p>
              <p className="status-box-text" style={{ marginTop: 6 }}>
                <strong>Limitação explícita:</strong> {forecast.limitations}
              </p>
            </div>
          </div>
        </section>

        <section className="panel" aria-label="Comparação entre períodos">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Comparação de Períodos Consecutivos</h2>
              <p className="panel-subtitle">
                Metade recente ({periodComparison.currentDaysCount}d) vs. metade anterior (
                {periodComparison.previousDaysCount}d) da janela filtrada
              </p>
            </div>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Período recente ({periodComparison.currentDaysCount} dias)</span>
              <strong className="tabular-nums">
                {formatKwh(periodComparison.currentPeriodKwh)} (
                {formatCurrencyBRL(periodComparison.currentPeriodCostBrl)})
              </strong>
            </div>
            <div className="settings-preview-item">
              <span>Período anterior ({periodComparison.previousDaysCount} dias)</span>
              <strong className="tabular-nums">
                {periodComparison.previousDaysCount > 0
                  ? `${formatKwh(periodComparison.previousPeriodKwh)} (${formatCurrencyBRL(periodComparison.previousPeriodCostBrl)})`
                  : 'Amostra < 4 dias'}
              </strong>
            </div>
            <div className="settings-preview-item">
              <span>Média diária recente vs. anterior</span>
              <strong className="tabular-nums">
                {formatKwh(periodComparison.currentPeriodAvgDailyKwh, 2)}/d vs.{' '}
                {formatKwh(periodComparison.previousPeriodAvgDailyKwh, 2)}/d
              </strong>
            </div>
            <div className="settings-preview-item">
              <span>Variação percentual entre períodos</span>
              <strong className="tabular-nums">
                {periodComparison.variationPercent !== null ? (
                  <span
                    className={
                      periodComparison.variationPercent > 0 ? 'text-amber' : 'text-emerald'
                    }
                  >
                    {periodComparison.variationPercent > 0 ? (
                      <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    ) : (
                      <TrendingDown size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    )}
                    {formatPercent(periodComparison.variationPercent, true)}
                  </span>
                ) : (
                  'Mín. 4 dias para comparar'
                )}
              </strong>
            </div>
          </div>

          <div className="data-status-summary">
            <div className="data-status-row">
              <span>Média diária geral ({analysis.totalRecords} dias)</span>
              <strong className="tabular-nums">
                {analysis.historicalAverageKwh !== null
                  ? `${formatKwh(analysis.historicalAverageKwh, 2)}/dia`
                  : '—'}
              </strong>
            </div>
            <div className="data-status-row">
              <span>Consumo acumulado total</span>
              <strong className="tabular-nums text-emerald">
                {formatKwh(analysis.periodTotalKwh)} ({formatCurrencyBRL(analysis.periodTotalCostBrl)})
              </strong>
            </div>
            <div className="data-status-row">
              <span>Anomalias estatísticas no período</span>
              <strong className="tabular-nums">
                {analysis.anomalies.length} evento(s) acima de +
                {formatPercent(state.settings.anomalyThresholdPercent)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Análise por Equipamento: Potência Nominal vs. Fator de Ciclo vs. Consumo Estimado */}
      <section className="panel" aria-label="Participação por equipamento">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Decomposição Energética por Equipamento (Potência Nominal vs. Consumo Estimado)
            </h2>
            <p className="panel-subtitle">
              Como um equipamento de alta potência e uso curto (ex.: secador ou forno) se compara a
              um equipamento de menor potência ligado 24h (ex.: expositor refrigerado)
            </p>
          </div>
          <Cpu size={18} className="panel-header-icon" />
        </div>

        {analysis.equipmentSummaries.length === 0 ? (
          <div className="status-box status-box--info">
            <AlertCircle size={18} />
            <span>Nenhum equipamento cadastrado neste cenário para análise de participação.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipamento / Fabricante &amp; Modelo</th>
                  <th className="text-right">Potência Total</th>
                  <th className="text-right">% Potência</th>
                  <th className="text-right">Regime &amp; Ciclo</th>
                  <th className="text-right">Consumo Est. (30d)</th>
                  <th className="text-right">% Energia</th>
                  <th className="text-right">Custo Est. (30d)</th>
                </tr>
              </thead>
              <tbody>
                {analysis.equipmentSummaries.map((item) => {
                  const eq = item.equipment;
                  const factorPct = Math.round(item.effectiveUsageFactor * 100);
                  return (
                    <tr
                      key={eq.id}
                      className={eq.status === 'inactive' ? 'row-muted' : ''}
                    >
                      <td>
                        <div className="cell-primary">
                          <button
                            type="button"
                            className="cell-link-btn"
                            onClick={() => {
                              setSelectedEquipmentId(eq.id);
                              setActiveSection('equipment');
                            }}
                          >
                            {eq.name}
                          </button>
                          <Badge tone="slate">{eq.category}</Badge>
                          {eq.status === 'inactive' && <Badge tone="amber">Inativo</Badge>}
                        </div>
                        <span className="cell-sub">
                          {eq.manufacturer ? `${eq.manufacturer} ` : ''}
                          {eq.model ?? ''} · {eq.location ?? 'Principal'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{formatPower(item.totalRatedPowerWatts)}</span>
                        <span className="cell-sub">
                          {eq.quantity ?? 1}× {eq.powerWatts} W
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {formatPercent(item.shareOfInstalledPowerPercent)}
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{eq.dailyUsageHours ?? 8}h/dia</span>
                        <span className="cell-sub">Fator: {factorPct}%</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong text-emerald">
                          {formatKwh(item.estimatedMonthlyKwh)}
                        </span>
                        <span className="cell-sub">{formatKwh(item.estimatedDailyKwh, 2)}/dia</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <Badge tone="emerald">
                          {formatPercent(item.shareOfEstimatedEnergyPercent)}
                        </Badge>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">
                          {formatCurrencyBRL(item.estimatedMonthlyCostBrl)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Recomendações Técnicas Justificadas */}
      <section className="panel" aria-label="Recomendações baseadas em evidências">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Recomendações de Eficiência Energética ({analysis.recommendations.length})
            </h2>
            <p className="panel-subtitle">
              Geradas localmente por regras determinísticas com motivo, evidência nos dados e ação
              sugerida (sem prometer economias irreais)
            </p>
          </div>
          <Zap size={18} className="panel-header-icon" />
        </div>

        <div className="structured-rec-grid">
          {analysis.recommendations.map((rec) => (
            <article
              key={rec.id}
              className={`recommendation-item recommendation-item--${rec.priority}`}
            >
              <div className="recommendation-top">
                <div className="recommendation-badges">
                  <span className="recommendation-icon" aria-hidden="true">
                    {rec.priority === 'high' && <Flame size={15} />}
                    {rec.priority === 'medium' && <Lightbulb size={15} />}
                    {rec.priority === 'info' && <Activity size={15} />}
                    {rec.priority === 'positive' && <CheckCircle2 size={15} />}
                  </span>
                  <Badge
                    tone={
                      rec.priority === 'high'
                        ? 'red'
                        : rec.priority === 'medium'
                          ? 'amber'
                          : rec.priority === 'positive'
                            ? 'emerald'
                            : 'sky'
                    }
                  >
                    {rec.category}
                  </Badge>
                </div>
                {rec.metricBadge && (
                  <span className="recommendation-metric tabular-nums">{rec.metricBadge}</span>
                )}
              </div>

              <h3 className="recommendation-title">{rec.title}</h3>
              <p className="recommendation-desc">{rec.description}</p>

              <div className="rec-evidence-grid">
                <div className="rec-evidence-box">
                  <span>Motivo da recomendação</span>
                  <p>{rec.reason}</p>
                </div>
                <div className="rec-evidence-box">
                  <span>Evidência quantitativa</span>
                  <p>{rec.evidence}</p>
                </div>
                <div className="rec-evidence-box">
                  <span>Contexto financeiro / impacto</span>
                  <p>{rec.estimatedImpact}</p>
                </div>
                <div className="rec-evidence-box">
                  <span>Ação recomendada</span>
                  <p>{rec.suggestedAction}</p>
                </div>
              </div>

              {rec.actionTarget && rec.actionLabel && (
                <button
                  type="button"
                  className="recommendation-link"
                  onClick={() => setActiveSection(rec.actionTarget!)}
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
