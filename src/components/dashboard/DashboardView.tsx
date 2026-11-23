import React from 'react';
import { Leaf } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { formatCurrencyBRL } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { KpiGrid } from './KpiGrid';
import { ConsumptionChart } from './ConsumptionChart';
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
  const { analysis } = useWattWise();
  const { environmentalImpact } = analysis;

  return (
    <div className="view-stack">
      <KpiGrid />

      <ConsumptionChart onAddRecord={onAddRecord} />

      <div className="dashboard-split">
        <AlertsPanel />
        <RecommendationsPanel />
      </div>

      <EquipmentLoadCard onAddEquipment={onAddEquipment} />

      {/* Impacto Ambiental e Sustentabilidade */}
      <section className="panel" aria-label="Impacto ambiental estimado">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Leaf size={18} className="text-emerald" aria-hidden="true" />
              <h2 className="panel-title">Impacto Ambiental Estimado &amp; Sustentabilidade</h2>
            </div>
            <p className="panel-subtitle">
              Relação entre consumo elétrico e emissões de gases de efeito estufa (fator médio da
              matriz elétrica brasileira: 0,0817 kg CO₂e/kWh)
            </p>
          </div>
          <Badge tone="emerald">Uso Racional de Recursos</Badge>
        </div>

        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">Emissões estimadas no período</span>
            <strong className="summary-pill-value tabular-nums">
              {environmentalImpact.periodCo2Kg.toFixed(2).replace('.', ',')} kg CO₂e
            </strong>
            <span className="summary-pill-sub">
              Base: {analysis.periodTotalKwh.toFixed(1).replace('.', ',')} kWh acumulados
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Projeção mensal de pegada elétrica</span>
            <strong className="summary-pill-value tabular-nums">
              {environmentalImpact.monthlyForecastCo2Kg !== null
                ? `${environmentalImpact.monthlyForecastCo2Kg.toFixed(2).replace('.', ',')} kg CO₂e/mês`
                : 'Aguardando 3+ dias'}
            </strong>
            <span className="summary-pill-sub">
              Estimativa proporcional à previsão mensal de consumo
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Meta de redução de 10% (impacto anual)</span>
            <strong className="summary-pill-value tabular-nums text-emerald">
              {environmentalImpact.tenPercentAnnualCo2SavedKg !== null
                ? `-${environmentalImpact.tenPercentAnnualCo2SavedKg.toFixed(1).replace('.', ',')} kg CO₂e/ano`
                : '—'}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              {environmentalImpact.tenPercentAnnualCostSavedBrl !== null
                ? `Economia financeira estimada: ${formatCurrencyBRL(environmentalImpact.tenPercentAnnualCostSavedBrl)}/ano`
                : 'Registre 3+ dias para calcular o potencial anual'}
            </span>
          </div>
        </div>

        <p className="form-hint">{environmentalImpact.methodologyNote}</p>
      </section>
    </div>
  );
};
