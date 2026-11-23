import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  const { analysis, state, setActiveSection } = useWattWise();
  const { forecast, periodComparison } = analysis;
  const confMeta = CONFIDENCE_META[forecast.confidence];

  return (
    <div className="view-stack">
      {/* 1. Comparativo Físico: Potência Nominal vs Consumo Estimado vs Consumo Medido */}
      <section className="panel" aria-label="Diferenciação física de grandezas energéticas">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">
              Potência Nominal (kW) vs. Consumo Calculado e Medido (kWh)
            </h2>
            <p className="panel-subtitle">
              Separação rigorosa entre demanda instantânea instalada, estimativa teórica por
              horário de uso e energia efetivamente registrada
            </p>
          </div>
          <Badge tone="emerald">Física Energética</Badge>
        </div>

        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">1. Potência nominal instalada (Ativa)</span>
            <strong className="summary-pill-value tabular-nums">
              {formatPower(analysis.activeInstalledPowerWatts)}
            </strong>
            <span className="summary-pill-sub">
              Demanda instantânea: Σ (Potência W × Quantidade) de {analysis.activeEquipmentCount}{' '}
              equipamento(s)
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">2. Consumo mensal calculado pelo inventário</span>
            <strong className="summary-pill-value tabular-nums text-emerald">
              {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Fórmula: (W × h/dia × qtd × 30) / 1000 · Custo:{' '}
              {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">3. Previsão mensal a partir das medições</span>
            <strong className="summary-pill-value tabular-nums">
              {analysis.monthlyForecastKwh !== null
                ? formatKwh(analysis.monthlyForecastKwh)
                : 'Aguardando leituras'}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              {analysis.estimatedMonthlyCostBrl !== null
                ? `Projeção histórica (30d): ${formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)}`
                : 'Requer ao menos 3 dias registrados'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Metodologia de Previsão, Tendência Linear e Qualidade dos Dados */}
      <div className="dashboard-split">
        <section className="panel" aria-label="Qualidade da previsão estatística">
          <div className="panel-header panel-header--wrap">
            <div>
              <h2 className="panel-title">Diagnóstico da Previsão Mensal</h2>
              <p className="panel-subtitle">
                Regressão linear, dispersão diária e limitações estatísticas
              </p>
            </div>
            <Badge tone={confMeta.tone}>{confMeta.label}</Badge>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Tendência linear (inclinação)</span>
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
              <span>Amostras na janela</span>
              <strong className="tabular-nums">{forecast.sampleDaysCount} dia(s)</strong>
            </div>

            <div className="settings-preview-item">
              <span>Lacunas (dias sem leitura)</span>
              <strong className="tabular-nums">{forecast.missingDaysInWindow} dia(s)</strong>
            </div>
          </div>

          <div className="status-box status-box--info">
            <div className="status-box-icon">
              <Info size={18} />
            </div>
            <div>
              <h3 className="status-box-title">Método utilizado</h3>
              <p className="status-box-text">{forecast.methodology}</p>
              <p className="status-box-text" style={{ marginTop: 6 }}>
                <strong>Nota de transparência:</strong> {forecast.limitations}
              </p>
            </div>
          </div>
        </section>

        <section className="panel" aria-label="Composição por origem de medição">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Rastreabilidade: Medido vs. Estimado vs. Simulado</h2>
              <p className="panel-subtitle">
                Separação por natureza da leitura no período selecionado ({analysis.totalRecords}{' '}
                registros)
              </p>
            </div>
          </div>

          <div className="data-status-summary">
            <div className="data-status-row">
              <span>
                <Badge tone="emerald">Medido</Badge> Leituras físicas / manuais / medidor
              </span>
              <strong className="tabular-nums">
                {formatKwh(analysis.measuredTotalKwh)} (
                {formatCurrencyBRL(analysis.measuredTotalKwh * state.settings.tariffPerKwh)})
              </strong>
            </div>
            <div className="data-status-row">
              <span>
                <Badge tone="sky">Estimado</Badge> Leituras estimadas por cálculo
              </span>
              <strong className="tabular-nums">
                {formatKwh(analysis.estimatedTotalKwh)} (
                {formatCurrencyBRL(analysis.estimatedTotalKwh * state.settings.tariffPerKwh)})
              </strong>
            </div>
            <div className="data-status-row">
              <span>
                <Badge tone="demo">Simulado</Badge> Dados demonstrativos fictícios
              </span>
              <strong className="tabular-nums">
                {formatKwh(analysis.simulatedTotalKwh)} (
                {formatCurrencyBRL(analysis.simulatedTotalKwh * state.settings.tariffPerKwh)})
              </strong>
            </div>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Metade recente do período</span>
              <strong className="tabular-nums">
                {formatKwh(periodComparison.currentPeriodKwh)} (
                {formatCurrencyBRL(periodComparison.currentPeriodCostBrl)})
              </strong>
            </div>
            <div className="settings-preview-item">
              <span>Variação vs metade anterior</span>
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
        </section>
      </div>

      {/* 3. Comparação Mensal e Consumo por Equipamento */}
      {analysis.monthlyComparison.length > 0 && (
        <section className="panel" aria-label="Comparação mensal de consumo">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Comparativo Mensal Consolidado</h2>
              <p className="panel-subtitle">
                Total acumulado em kWh e custo por mês de competência, separado por natureza do
                dado
              </p>
            </div>
          </div>

          <div className="chart-canvas" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analysis.monthlyComparison}>
                <CartesianGrid
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="monthLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v: number) => `${v} kWh`}
                />
                <Tooltip
                  formatter={(value: number) => [formatKwh(value), 'Energia']}
                  contentStyle={{
                    backgroundColor: '#0c1322',
                    borderColor: 'rgba(148,163,184,0.28)',
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="measuredKwh" name="Medido (kWh)" stackId="a" fill="#10b981" />
                <Bar dataKey="estimatedKwh" name="Estimado (kWh)" stackId="a" fill="#38bdf8" />
                <Bar dataKey="simulatedKwh" name="Simulado (kWh)" stackId="a" fill="#818cf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 4. Recomendações Estruturadas (Motivo, Evidência, Impacto Estimado, Ação Sugerida) */}
      <section className="panel" aria-label="Recomendações baseadas em evidências">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Recomendações Técnicas Contextualizadas ({analysis.recommendations.length})
            </h2>
            <p className="panel-subtitle">
              Geradas por regras determinísticas com motivo, evidência quantitativa, impacto
              estimado e ação sugerida
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
                  <span>Motivo</span>
                  <p>{rec.reason}</p>
                </div>
                <div className="rec-evidence-box">
                  <span>Evidência nos dados</span>
                  <p>{rec.evidence}</p>
                </div>
                <div className="rec-evidence-box">
                  <span>Impacto estimado (não garantido)</span>
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

      {/* 5. Tabela Comparativa de Equipamentos (Potência Nominal vs Consumo Estimado vs Consumo Medido) */}
      <section className="panel" aria-label="Participação por equipamento">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Participação por Equipamento: Potência Instalada vs. Consumo Estimado
            </h2>
            <p className="panel-subtitle">
              Identifique quais equipamentos pesam mais na potência nominal (kW) e quais consomem
              mais energia ao longo do mês (kWh)
            </p>
          </div>
          <Cpu size={18} className="panel-header-icon" />
        </div>

        {analysis.equipmentSummaries.length === 0 ? (
          <div className="status-box status-box--info">
            <AlertCircle size={18} />
            <span>Nenhum equipamento cadastrado para comparar participação energética.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Localização</th>
                  <th className="text-right">Potência Total</th>
                  <th className="text-right">% Potência</th>
                  <th className="text-right">Uso Diário</th>
                  <th className="text-right">Consumo Est. (30d)</th>
                  <th className="text-right">Custo Est. (30d)</th>
                  <th className="text-right">Medido Vinculado</th>
                </tr>
              </thead>
              <tbody>
                {analysis.equipmentSummaries.map((item) => (
                  <tr
                    key={item.equipment.id}
                    className={item.equipment.status === 'inactive' ? 'row-muted' : ''}
                  >
                    <td>
                      <div className="cell-primary">
                        <span className="cell-title">{item.equipment.name}</span>
                        <Badge tone="slate">{item.equipment.category}</Badge>
                        {item.equipment.status === 'inactive' && (
                          <Badge tone="amber">Inativo</Badge>
                        )}
                      </div>
                    </td>
                    <td>{item.equipment.location ?? 'Principal'}</td>
                    <td className="text-right tabular-nums">
                      {formatPower(item.totalRatedPowerWatts)}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatPercent(item.shareOfInstalledPowerPercent)}
                    </td>
                    <td className="text-right tabular-nums">
                      {item.equipment.dailyUsageHours ?? 8}h/dia × {item.equipment.quantity ?? 1} un
                    </td>
                    <td className="text-right tabular-nums text-emerald">
                      {formatKwh(item.estimatedMonthlyKwh)} (
                      {formatPercent(item.shareOfEstimatedEnergyPercent)})
                    </td>
                    <td className="text-right tabular-nums">
                      {formatCurrencyBRL(item.estimatedMonthlyCostBrl)}
                    </td>
                    <td className="text-right tabular-nums">
                      {item.measuredReadingsCount > 0
                        ? `${formatKwh(item.measuredPeriodKwh)} (${item.measuredReadingsCount}d)`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
