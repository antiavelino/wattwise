import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { formatFullDate, formatPercent } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export const AlertsPanel: React.FC = () => {
  const { analysis, state, setActiveSection } = useWattWise();
  const recentAlerts = analysis.systemAlerts.slice(0, 3);

  return (
    <section className="panel" aria-label="Alertas recentes">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Alertas Recentes ({analysis.systemAlerts.length})</h2>
          <p className="panel-subtitle">
            Anomalias (+{state.settings.anomalyThresholdPercent}%), potência crítica e tendências
          </p>
        </div>

        <button
          type="button"
          className="text-action-btn"
          onClick={() => setActiveSection('alerts')}
        >
          <span>Ver todos</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {recentAlerts.length === 0 ? (
        <div className="status-box status-box--positive">
          <div className="status-box-icon">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className="status-box-title">Nenhum alerta ativo</h3>
            <p className="status-box-text">
              Todos os indicadores permaneceram dentro do padrão estatístico configurado (+
              {formatPercent(state.settings.anomalyThresholdPercent)}).
            </p>
          </div>
        </div>
      ) : (
        <ul className="alerts-list">
          {recentAlerts.map((alert) => {
            const severityClass =
              alert.priority === 'critical'
                ? 'critical'
                : alert.priority === 'warning'
                  ? 'warning'
                  : 'info';

            return (
              <li key={alert.id} className={`alert-item alert-item--${severityClass}`}>
                <div className="alert-item-top">
                  <div className="alert-item-heading">
                    {alert.priority === 'info' ? (
                      <Info size={16} className="alert-item-icon" aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={16} className="alert-item-icon" aria-hidden="true" />
                    )}
                    <h3 className="alert-item-title">{alert.title}</h3>
                  </div>
                  <div className="alert-item-badges">
                    {alert.deviationPercent !== undefined && (
                      <Badge tone={alert.priority === 'critical' ? 'red' : 'amber'}>
                        {formatPercent(alert.deviationPercent, true)}
                      </Badge>
                    )}
                    <Badge
                      tone={
                        alert.priority === 'critical'
                          ? 'red'
                          : alert.priority === 'warning'
                            ? 'amber'
                            : 'sky'
                      }
                    >
                      {alert.priority === 'critical'
                        ? 'Crítico'
                        : alert.priority === 'warning'
                          ? 'Atenção'
                          : 'Info'}
                    </Badge>
                  </div>
                </div>

                <p className="alert-item-desc">{alert.description}</p>

                <div className="alert-item-meta">
                  <span>
                    <strong>Motivo:</strong> {alert.reason}
                  </span>
                  <span>
                    <strong>Ação:</strong> {alert.recommendedAction}
                  </span>
                  <span className="tabular-nums">Data: {formatFullDate(alert.date)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
