import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { AlertStatus } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatDateTimePtBr,
  formatKwh,
  formatPercent,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

type StatusFilter = 'all' | AlertStatus;

export const AlertsView: React.FC = () => {
  const { analysis, state, updateAlertStatus, setActiveSection, activeRole } = useWattWise();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const canMutateAlerts = activeRole !== 'viewer';

  const counts = useMemo(() => {
    let open = 0;
    let acknowledged = 0;
    let resolved = 0;
    let totalExcessBrl = 0;
    for (const a of analysis.anomalies) {
      totalExcessBrl += a.estimatedExcessCostBrl;
      if (a.status === 'acknowledged') acknowledged += 1;
      else if (a.status === 'resolved') resolved += 1;
      else open += 1;
    }
    return { open, acknowledged, resolved, totalExcessBrl };
  }, [analysis.anomalies]);

  const filteredAlerts = useMemo(() => {
    if (statusFilter === 'all') return analysis.anomalies;
    return analysis.anomalies.filter((a) => a.status === statusFilter);
  }, [analysis.anomalies, statusFilter]);

  return (
    <div className="view-stack">
      <section className="summary-strip" aria-label="Resumo operacional de alertas">
        <div className="summary-pill">
          <span className="summary-pill-label">Alertas em aberto</span>
          <strong className="summary-pill-value tabular-nums text-amber">{counts.open}</strong>
          <span className="summary-pill-sub">
            De {analysis.anomalies.length} anomalia(s) detectada(s)
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Reconhecidos / Resolvidos</span>
          <strong className="summary-pill-value tabular-nums text-emerald">
            {counts.acknowledged + counts.resolved}
          </strong>
          <span className="summary-pill-sub">
            {counts.acknowledged} em análise · {counts.resolved} resolvido(s)
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Excedente financeiro acumulado</span>
          <strong className="summary-pill-value tabular-nums">
            {formatCurrencyBRL(counts.totalExcessBrl)}
          </strong>
          <span className="summary-pill-sub">
            Limite configurado: +{formatPercent(state.settings.anomalyThresholdPercent)}
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">Central de Tratamento de Anomalias</h2>
            <p className="panel-subtitle">
              Reconheça alertas em investigação e registre a resolução operacional
            </p>
          </div>

          <div className="chart-controls">
            <div className="segmented-control" role="group" aria-label="Filtrar alertas por status">
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'all' ? 'segmented-btn--active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Todos ({analysis.anomalies.length})
              </button>
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'open' ? 'segmented-btn--active' : ''}`}
                onClick={() => setStatusFilter('open')}
              >
                Abertos ({counts.open})
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  statusFilter === 'acknowledged' ? 'segmented-btn--active' : ''
                }`}
                onClick={() => setStatusFilter('acknowledged')}
              >
                Reconhecidos ({counts.acknowledged})
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  statusFilter === 'resolved' ? 'segmented-btn--active' : ''
                }`}
                onClick={() => setStatusFilter('resolved')}
              >
                Resolvidos ({counts.resolved})
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveSection('settings')}
            >
              <SlidersHorizontal size={15} />
              <span>Limite ({state.settings.anomalyThresholdPercent}%)</span>
            </button>
          </div>
        </div>

        {!analysis.hasEnoughDataForAnomalies ? (
          <div className="status-box status-box--info">
            <div className="status-box-icon">
              <Info size={18} />
            </div>
            <div>
              <h3 className="status-box-title">Histórico insuficiente para detecção estatística</h3>
              <p className="status-box-text">
                O motor de anomalias exige no mínimo 4 dias registrados (3 dias anteriores para
                formar a linha de base + 1 dia analisado). Faltam{' '}
                {analysis.recordsNeededForAnomalies} registro(s).
              </p>
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="Nenhum alerta neste filtro"
            description="Não há anomalias correspondentes ao status selecionado."
            actionLabel={statusFilter !== 'all' ? 'Ver todos os alertas' : undefined}
            onAction={statusFilter !== 'all' ? () => setStatusFilter('all') : undefined}
            compact
          />
        ) : (
          <ul className="alerts-list">
            {filteredAlerts.map((alert) => {
              const linkedEquipment = alert.equipmentId
                ? state.equipment.find((e) => e.id === alert.equipmentId)
                : undefined;

              return (
                <li key={alert.id} className={`alert-item alert-item--${alert.severity}`}>
                  <div className="alert-item-top">
                    <div className="alert-item-heading">
                      <AlertTriangle size={16} className="alert-item-icon" aria-hidden="true" />
                      <h3 className="alert-item-title">{alert.title}</h3>
                    </div>

                    <div className="alert-item-badges">
                      <Badge
                        tone={
                          alert.measurementType === 'measured'
                            ? 'emerald'
                            : alert.measurementType === 'estimated'
                              ? 'sky'
                              : 'demo'
                        }
                      >
                        {alert.measurementType === 'measured'
                          ? 'Medido'
                          : alert.measurementType === 'estimated'
                            ? 'Estimado'
                            : 'Simulado'}
                      </Badge>
                      <Badge tone={alert.severity === 'critical' ? 'red' : 'amber'}>
                        {formatPercent(alert.deviationPercent, true)}
                      </Badge>
                      <Badge
                        tone={
                          alert.status === 'resolved'
                            ? 'emerald'
                            : alert.status === 'acknowledged'
                              ? 'sky'
                              : 'amber'
                        }
                      >
                        {alert.status === 'resolved'
                          ? 'Resolvido'
                          : alert.status === 'acknowledged'
                            ? 'Reconhecido'
                            : 'Em aberto'}
                      </Badge>
                    </div>
                  </div>

                  <p className="alert-item-desc">{alert.description}</p>
                  <p className="form-hint">{alert.explanation}</p>

                  {linkedEquipment && (
                    <div className="alert-linked-eq">
                      <ShieldAlert size={13} />
                      <span>
                        Equipamento associado: <strong>{linkedEquipment.name}</strong> (
                        {linkedEquipment.location ?? 'Principal'})
                      </span>
                    </div>
                  )}

                  <div className="alert-item-meta tabular-nums">
                    <span>Medido: {formatKwh(alert.consumptionKwh)}</span>
                    <span>
                      Janela base ({alert.baselineDaysCount}d):{' '}
                      {formatKwh(alert.baselineAverageKwh)}
                    </span>
                    <span>Excedente: +{formatKwh(alert.excessKwh)}</span>
                    <span>
                      Impacto: +{formatCurrencyBRL(alert.estimatedExcessCostBrl)}
                    </span>
                    {alert.acknowledgedBy && (
                      <span>
                        <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        Atualizado por {alert.acknowledgedBy} em{' '}
                        {formatDateTimePtBr(alert.acknowledgedAt)}
                      </span>
                    )}
                  </div>

                  {canMutateAlerts && (
                    <div className="alert-workflow-actions">
                      {alert.status === 'open' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                          >
                            <Clock size={14} />
                            <span>Reconhecer alerta</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateAlertStatus(alert.id, 'resolved')}
                          >
                            <CheckCircle2 size={14} />
                            <span>Marcar como resolvido</span>
                          </button>
                        </>
                      )}

                      {alert.status === 'acknowledged' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateAlertStatus(alert.id, 'resolved')}
                          >
                            <CheckCircle2 size={14} />
                            <span>Concluir e resolver</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => updateAlertStatus(alert.id, 'open')}
                          >
                            <RotateCcw size={14} />
                            <span>Voltar para aberto</span>
                          </button>
                        </>
                      )}

                      {alert.status === 'resolved' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => updateAlertStatus(alert.id, 'open')}
                        >
                          <RotateCcw size={14} />
                          <span>Reabrir alerta</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
