import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Cpu,
  Croissant,
  FlaskConical,
  RotateCcw,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { DEMO_SCENARIO_LIST } from '../../data/demoData';
import { DemoScenarioId } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatKwh,
  formatPower,
  formatWatts,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

const SCENARIO_ICONS: Record<DemoScenarioId, React.FC<{ size?: number }>> = {
  cafeteria: Coffee,
  mercado: ShoppingCart,
  barbearia: Scissors,
  padaria: Croissant,
};

export const DemosView: React.FC = () => {
  const {
    activeScenarioId,
    switchScenario,
    restoreScenarioData,
    getScenarioSummary,
    setActiveSection,
  } = useWattWise();

  const [pendingRestoreId, setPendingRestoreId] = useState<DemoScenarioId | null>(null);

  const summaries = DEMO_SCENARIO_LIST.map((meta) => getScenarioSummary(meta.id));

  return (
    <div className="view-stack">
      {/* Cabeçalho Explicativo de Isolamento dos Cenários */}
      <section className="panel" aria-label="Introdução aos cenários demonstrativos">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FlaskConical size={18} className="text-emerald" />
              <h2 className="panel-title">
                4 Cenários Comerciais Independentes com Equipamentos Reais
              </h2>
              <Badge tone="emerald">Isolamento no LocalStorage</Badge>
            </div>
            <p className="panel-subtitle">
              Cada estabelecimento possui inventário elétrico próprio com fabricantes e modelos
              reais verificados, fator de utilização física, histórico simulado de 65 dias (3
              competências mensais) e armazenamento local isolado.
            </p>
          </div>
        </div>

        <div className="didactic-callout">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ShieldCheck size={18} className="text-emerald" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Isolamento Garantido entre Demonstrações:</strong>
              <p>
                Alterar equipamentos, registrar leituras ou mudar a tarifa em um cenário{' '}
                <strong>não altera</strong> os dados dos outros três. O botão{' '}
                <em>Restaurar Cenário</em> redefine exclusivamente o cenário escolhido para suas
                premissas originais.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela Comparativa Rápida entre os 4 Cenários */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cenário Comercial</th>
                <th>Segmento</th>
                <th className="text-right">Potência Ativa</th>
                <th className="text-right">Inventário Est. (30d)</th>
                <th className="text-right">Média Diária (Hist.)</th>
                <th className="text-right">Custo Mensal Previsto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(({ meta, analysis }) => {
                const isCurrent = meta.id === activeScenarioId;
                return (
                  <tr key={meta.id} className={isCurrent ? 'row-selected' : ''}>
                    <td>
                      <span className="cell-strong">{meta.shortLabel}</span>
                      <span className="cell-sub">{meta.name}</span>
                    </td>
                    <td>{meta.segment}</td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong">
                        {formatPower(analysis.activeInstalledPowerWatts)}
                      </span>
                      <span className="cell-sub">
                        {analysis.activeEquipmentCount} de {analysis.totalEquipmentCount} ativos
                      </span>
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong">
                        {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}
                      </span>
                      <span className="cell-sub">
                        {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês
                      </span>
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong">
                        {analysis.historicalAverageKwh !== null
                          ? `${formatKwh(analysis.historicalAverageKwh, 2)}/dia`
                          : '—'}
                      </span>
                      <span className="cell-sub">{analysis.totalRecords} dias simulados</span>
                    </td>
                    <td className="text-right tabular-nums">
                      <span className="cell-strong text-emerald">
                        {analysis.estimatedMonthlyCostBrl !== null
                          ? formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)
                          : '—'}
                      </span>
                    </td>
                    <td>
                      {isCurrent ? (
                        <Badge tone="emerald">Cenário Ativo</Badge>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => switchScenario(meta.id, 'dashboard')}
                        >
                          Selecionar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cards Detalhados dos 4 Cenários */}
      <div className="scenarios-grid">
        {summaries.map(({ meta, state, analysis }) => {
          const Icon = SCENARIO_ICONS[meta.id];
          const isCurrent = meta.id === activeScenarioId;

          return (
            <article
              key={meta.id}
              className={`panel scenario-card ${isCurrent ? 'scenario-card--active' : ''}`}
              aria-label={`Cenário ${meta.shortLabel}`}
            >
              <div className="panel-header panel-header--wrap">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="feature-icon-box">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 className="panel-title" style={{ fontSize: 18 }}>
                        {meta.shortLabel} — {state.settings.establishmentName}
                      </h3>
                      {isCurrent && (
                        <Badge tone="emerald">
                          <CheckCircle2 size={12} /> Em uso agora
                        </Badge>
                      )}
                      <Badge tone="demo">Dados Simulados</Badge>
                    </div>
                    <p className="panel-subtitle">
                      {meta.segment} · Área: {meta.floorAreaM2} m² · {meta.operatingHoursSummary}
                    </p>
                  </div>
                </div>
              </div>

              <p className="scenario-description">{meta.description}</p>

              <div className="didactic-callout didactic-callout--compact">
                <Zap size={14} className="text-emerald" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{meta.highlightNote}</span>
              </div>

              {/* Indicadores do Cenário */}
              <div className="scenario-kpis-grid">
                <div className="scenario-kpi-box">
                  <span>Potência Nominal Ativa</span>
                  <strong className="tabular-nums">
                    {formatPower(analysis.activeInstalledPowerWatts)}
                  </strong>
                  <small className="tabular-nums">
                    {formatWatts(analysis.activeInstalledPowerWatts)} ({analysis.activeEquipmentCount}{' '}
                    ativos)
                  </small>
                </div>

                <div className="scenario-kpi-box">
                  <span>Consumo Estimado (Inventário)</span>
                  <strong className="tabular-nums text-emerald">
                    {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês
                  </strong>
                  <small className="tabular-nums">
                    {formatKwh(analysis.estimatedEquipmentDailyKwh, 2)}/dia ·{' '}
                    {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}
                  </small>
                </div>

                <div className="scenario-kpi-box">
                  <span>Projeção pelas Leituras</span>
                  <strong className="tabular-nums">
                    {analysis.monthlyForecastKwh !== null
                      ? `${formatKwh(analysis.monthlyForecastKwh)}/mês`
                      : 'Sem leituras'}
                  </strong>
                  <small className="tabular-nums">
                    {analysis.estimatedMonthlyCostBrl !== null
                      ? `${formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)} (Tarifa ${formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh)`
                      : '—'}
                  </small>
                </div>

                <div className="scenario-kpi-box">
                  <span>Histórico &amp; Alertas</span>
                  <strong className="tabular-nums">{analysis.totalRecords} dias</strong>
                  <small className="tabular-nums">
                    {analysis.anomalies.length} anomalia(s) · {analysis.monthlyComparison.length}{' '}
                    meses
                  </small>
                </div>
              </div>

              {/* Lista de Equipamentos Reais do Cenário */}
              <div className="scenario-equipment-preview">
                <div className="scenario-equipment-header">
                  <Cpu size={14} />
                  <span>
                    Equipamentos Comerciais Verificados ({state.equipment.length} itens cadastrados)
                  </span>
                </div>
                <ul className="scenario-equipment-list">
                  {state.equipment.slice(0, 6).map((eq) => (
                    <li key={eq.id}>
                      <span className="scenario-eq-name">
                        <strong>{eq.name}</strong>
                        {eq.manufacturer && (
                          <em className="scenario-eq-model">
                            {' '}
                            ({eq.manufacturer} {eq.model ?? ''})
                          </em>
                        )}
                      </span>
                      <span className="scenario-eq-power tabular-nums">
                        {eq.quantity && eq.quantity > 1 ? `${eq.quantity}× ` : ''}
                        {formatWatts(eq.powerWatts)} · {eq.dailyUsageHours ?? 8}h/d
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ações do Cenário */}
              <div className="scenario-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    switchScenario(meta.id, 'dashboard');
                  }}
                >
                  <span>{isCurrent ? 'Abrir Dashboard deste Cenário' : 'Ativar e Abrir Dashboard'}</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    switchScenario(meta.id);
                    setActiveSection('equipment');
                  }}
                >
                  <Cpu size={15} />
                  <span>Inspecionar Equipamentos</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPendingRestoreId(meta.id)}
                  title={`Restaurar somente o cenário ${meta.shortLabel}`}
                >
                  <RotateCcw size={15} />
                  <span>Restaurar {meta.shortLabel}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={pendingRestoreId !== null}
        title={
          pendingRestoreId
            ? `Restaurar cenário ${DEMO_SCENARIOS_BY_ID_LABEL(pendingRestoreId)}?`
            : 'Restaurar cenário?'
        }
        description="Esta ação restaurará os equipamentos reais verificados, os 65 dias de histórico simulado e a tarifa de referência apenas deste cenário. Os outros três cenários permanecerão inalterados."
        confirmLabel="Restaurar este cenário"
        variant="primary"
        onConfirm={() => {
          if (pendingRestoreId) {
            restoreScenarioData(pendingRestoreId);
            setPendingRestoreId(null);
          }
        }}
        onCancel={() => setPendingRestoreId(null)}
      />
    </div>
  );
};

function DEMO_SCENARIOS_BY_ID_LABEL(id: DemoScenarioId): string {
  const found = DEMO_SCENARIO_LIST.find((s) => s.id === id);
  return found ? found.shortLabel : id;
}
