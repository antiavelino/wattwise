import React from 'react';
import {
  Activity,
  ArrowRight,
  HelpCircle,
  Leaf,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  formatCurrencyBRL,
  formatKwh,
  formatPercent,
  formatPower,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { KpiGrid } from './KpiGrid';
import { ConsumptionChart } from './ConsumptionChart';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { AlertsPanel } from './AlertsPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { EquipmentLoadCard } from './EquipmentLoadCard';

interface DashboardViewProps {
  onAddRecord: () => void;
  onAddEquipment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onAddRecord,
  onAddEquipment,
}) => {
  const {
    analysis,
    setActiveSection,
  } = useWattWise();
  const { environmentalImpact, forecast, periodComparison } = analysis;

  return (
    <div className="view-stack">
      {/* 1. Indicadores Principais (Consumo total, Custo estimado, Média diária, Projeção, Equipamentos) */}
      <KpiGrid />

      {/* 2. Gráfico de Consumo Histórico Diário */}
      <ConsumptionChart onAddRecord={onAddRecord} />

      {/* 3. Comparativo Mensal Consolidado (Corrigido e auditado) */}
      <MonthlyComparisonCard compact />

      {/* 4. Resumo Executivo das Análises Energéticas */}
      <section className="panel" aria-label="Resumo das análises energéticas">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Activity size={18} className="text-emerald" aria-hidden="true" />
              <h2 className="panel-title">Resumo das Análises Energéticas</h2>
              <Badge tone="sky">Diagnóstico Determinístico</Badge>
            </div>
            <p className="panel-subtitle">
              Cruzamento entre potência instalada (kW), consumo estimado pelo inventário (kWh) e
              tendência medida nas leituras diárias
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveSection('analysis')}
          >
            <span>Abrir análise completa</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">
              Inventário Teórico vs. Projeção Medida
            </span>
            <strong className="summary-pill-value tabular-nums">
              {formatKwh(analysis.estimatedEquipmentMonthlyKwh)} vs.{' '}
              {analysis.monthlyForecastKwh !== null
                ? formatKwh(analysis.monthlyForecastKwh)
                : '—'}
            </strong>
            <span className="summary-pill-sub">
              Inventário ({analysis.activeEquipmentCount} ativos,{' '}
              {formatPower(analysis.activeInstalledPowerWatts)}) · Custo est.{' '}
              {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Comparação de Períodos (Metade Recente)</span>
            <strong className="summary-pill-value tabular-nums">
              {periodComparison.variationPercent !== null ? (
                <span
                  className={
                    periodComparison.variationPercent > 0 ? 'text-amber' : 'text-emerald'
                  }
                >
                  {periodComparison.variationPercent > 0 ? (
                    <TrendingUp size={17} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  ) : (
                    <TrendingDown size={17} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  )}
                  {formatPercent(periodComparison.variationPercent, true)}
                </span>
              ) : (
                'Aguardando 4+ dias'
              )}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Recente ({periodComparison.currentDaysCount}d):{' '}
              {formatKwh(periodComparison.currentPeriodAvgDailyKwh, 2)}/dia vs. Anterior:{' '}
              {formatKwh(periodComparison.previousPeriodAvgDailyKwh, 2)}/dia
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Tendência Linear (Últimos 30d)</span>
            <strong className="summary-pill-value tabular-nums">
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
            <span className="summary-pill-sub">
              Dispersão diária (CV):{' '}
              {forecast.variationCoefficientPercent !== null
                ? formatPercent(forecast.variationCoefficientPercent)
                : '—'}{' '}
              · Amostra: {forecast.sampleDaysCount}d
            </span>
          </div>
        </div>
      </section>

      {/* 5. Alertas Recentes & Recomendações Contextualizadas */}
      <div className="dashboard-split">
        <AlertsPanel />
        <RecommendationsPanel />
      </div>

      {/* 6. Equipamentos de Maior Potência e Distribuição por Categoria */}
      <EquipmentLoadCard onAddEquipment={onAddEquipment} />

      {/* 7. Impacto Ambiental Estimado e Sustentabilidade (Fator Oficial MCTI/SIRENE) */}
      <section className="panel" aria-label="Impacto ambiental estimado">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Leaf size={18} className="text-emerald" aria-hidden="true" />
              <h2 className="panel-title">Impacto Ambiental Estimado &amp; Sustentabilidade</h2>
              <Badge tone="emerald">
                Fator SIN: {environmentalImpact.emissionFactorKgPerKwh.toFixed(4).replace('.', ',')}{' '}
                kg CO₂/kWh
              </Badge>
            </div>
            <p className="panel-subtitle">
              Estimativa indireta de emissões (Escopo 2) baseada no consumo elétrico e no fator
              médio anual oficial do Sistema Interligado Nacional ({environmentalImpact.emissionFactorYear})
            </p>
          </div>
          <button
            type="button"
            className="text-action-btn"
            onClick={() => setActiveSection('about')}
            title="Ver metodologia e fonte oficial MCTI/SIRENE"
          >
            <HelpCircle size={14} />
            <span>Ver fonte MCTI</span>
          </button>
        </div>

        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">Emissões estimadas no período</span>
            <strong className="summary-pill-value tabular-nums">
              {environmentalImpact.periodCo2Kg.toFixed(2).replace('.', ',')} kg CO₂
            </strong>
            <span className="summary-pill-sub">
              Base: {analysis.periodTotalKwh.toFixed(1).replace('.', ',')} kWh acumulados (
              {analysis.totalRecords} dias)
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Projeção mensal de emissões (30d)</span>
            <strong className="summary-pill-value tabular-nums">
              {environmentalImpact.monthlyForecastCo2Kg !== null
                ? `${environmentalImpact.monthlyForecastCo2Kg.toFixed(2).replace('.', ',')} kg CO₂/mês`
                : 'Aguardando 3+ dias'}
            </strong>
            <span className="summary-pill-sub">
              Estimativa proporcional à projeção mensal de consumo
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Simulação educativa: redução de 10% ao ano</span>
            <strong className="summary-pill-value tabular-nums text-emerald">
              {environmentalImpact.tenPercentAnnualCo2SavedKg !== null
                ? `-${environmentalImpact.tenPercentAnnualCo2SavedKg.toFixed(1).replace('.', ',')} kg CO₂/ano`
                : '—'}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              {environmentalImpact.tenPercentAnnualCostSavedBrl !== null
                ? `Equivalente financeiro: ${formatCurrencyBRL(environmentalImpact.tenPercentAnnualCostSavedBrl)}/ano`
                : 'Registre 3+ dias para calcular a simulação anual'}
            </span>
          </div>
        </div>

        <p className="form-hint">{environmentalImpact.methodologyNote}</p>
      </section>
    </div>
  );
};
