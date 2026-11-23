import React from 'react';
import { AlertTriangle, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { formatKwh, formatPercent } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export const AlertsPanel: React.FC = () => {
  const { analysis, state, setActiveSection } = useWattWise();

  return (
    <section className="panel" aria-label="Alertas e anomalias">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Alertas e Anomalias</h2>
          <p className="panel-subtitle">
            Desvios a partir de +{state.settings.anomalyThresholdPercent}% sobre a média dos dias
            anteriores
          </p>
        </div>

        <button
          type="button"
          className="text-action-btn"
          onClick={() => setActiveSection('settings')}
        >
          <SlidersHorizontal size={14} />
          <span>Ajustar limite</span>
        </button>
      </div>

      {!analysis.hasEnoughDataForAnomalies ? (
        <div className="status-box status-box--info">
          <div className="status-box-icon">
            <Info size={18} />
          </div>
          <div>
            <h3 className="status-box-title">Dados insuficientes para detecção</h3>
            <p className="status-box-text">
              São necessários pelo menos 4 registros diários (3 dias anteriores de referência + 1 dia
              recente). Faltam {analysis.recordsNeededForAnomalies} registro(s).
            </p>
          </div>
        </div>
      ) : analysis.anomalies.length === 0 ? (
        <div className="status-box status-box--positive">
          <div className="status-box-icon">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className="status-box-title">Nenhuma anomalia identificada</h3>
            <p className="status-box-text">
              Todos os dias analisados permaneceram abaixo do limite configurado de{' '}
              {formatPercent(state.settings.anomalyThresholdPercent)} sobre a média móvel anterior.
            </p>
          </div>
        </div>
      ) : (
        <ul className="alerts-list">
          {analysis.anomalies.map((alert) => (
            <li
              key={alert.id}
              className={`alert-item alert-item--${alert.severity}`}
            >
              <div className="alert-item-top">
                <div className="alert-item-heading">
                  <AlertTriangle size={16} className="alert-item-icon" aria-hidden="true" />
                  <h3 className="alert-item-title">{alert.title}</h3>
                </div>
                <div className="alert-item-badges">
                  {alert.isDemo && <Badge tone="demo">Demo</Badge>}
                  <Badge tone={alert.severity === 'critical' ? 'red' : 'amber'}>
                    {formatPercent(alert.deviationPercent, true)}
                  </Badge>
                </div>
              </div>

              <p className="alert-item-desc">{alert.description}</p>

              <div className="alert-item-meta tabular-nums">
                <span>Medido: {formatKwh(alert.consumptionKwh)}</span>
                <span>Base ({alert.baselineDaysCount}d): {formatKwh(alert.baselineAverageKwh)}</span>
                <span>Excedente: +{formatKwh(alert.excessKwh)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
