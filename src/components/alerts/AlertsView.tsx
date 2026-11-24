import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Info,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { AlertStatus, SystemAlertCategory } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatDateTimePtBr,
  formatFullDate,
  formatPercent,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

type StatusFilter = 'all' | AlertStatus;

const CATEGORY_LABELS: Record<SystemAlertCategory, string> = {
  anomaly: 'Consumo acima da média histórica',
  period_increase: 'Aumento entre períodos',
  high_power_equipment: 'Equipamento de alta potência',
  cost_projection: 'Projeção acima do inventário',
  insufficient_data: 'Dados insuficientes',
};

const PRIORITY_LABELS: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'Prioridade Alta',
  warning: 'Prioridade Média',
  info: 'Informativo',
};

export const AlertsView: React.FC = () => {
  const {
    analysis,
    state,
    updateAlertStatus,
    setActiveSection,
    setSelectedEquipmentId,
    activeRole,
    activeScenarioMeta,
  } = useWattWise();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<SystemAlertCategory | 'all'>('all');

  const canMutateAlerts = activeRole !== 'viewer';
  const allAlerts = analysis.systemAlerts;

  const counts = useMemo(() => {
    let open = 0;
    let acknowledged = 0;
    let resolved = 0;
    let totalExcessBrl = 0;
    for (const a of allAlerts) {
      if (a.category === 'anomaly' && a.estimatedExcessCostBrl) {
        totalExcessBrl += a.estimatedExcessCostBrl;
      }
      if (a.status === 'acknowledged') acknowledged += 1;
      else if (a.status === 'resolved') resolved += 1;
      else open += 1;
    }
    return { open, acknowledged, resolved, totalExcessBrl };
  }, [allAlerts]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      return true;
    });
  }, [allAlerts, statusFilter, categoryFilter]);

  return (
    <div className="view-stack">
      <section className="summary-strip" aria-label="Resumo operacional de alertas">
        <div className="summary-pill">
          <span className="summary-pill-label">Alertas em aberto ({activeScenarioMeta.shortLabel})</span>
          <strong className="summary-pill-value tabular-nums text-amber">{counts.open}</strong>
          <span className="summary-pill-sub">
            De {allAlerts.length} alerta(s) ativo(s) no sistema
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Reconhecidos / Resolvidos</span>
          <strong className="summary-pill-value tabular-nums text-emerald">
            {counts.acknowledged + counts.resolved}
          </strong>
          <span className="summary-pill-sub">
            {counts.acknowledged} em investigação · {counts.resolved} resolvido(s)
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Excedente acumulado em anomalias</span>
          <strong className="summary-pill-value tabular-nums">
            {formatCurrencyBRL(counts.totalExcessBrl)}
          </strong>
          <span className="summary-pill-sub">
            Limite estatístico: +{formatPercent(state.settings.anomalyThresholdPercent)} sobre a média móvel
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">
              Central de Alertas e Recomendações Operacionais — {activeScenarioMeta.shortLabel}
            </h2>
            <p className="panel-subtitle">
              Gerados a partir de regras determinísticas: consumo acima da média, aumento entre
              períodos, equipamentos de alta potência, projeção de custo e suficiência de dados
            </p>
          </div>

          <div className="chart-controls">
            <select
              className="form-input form-input--compact"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SystemAlertCategory | 'all')}
              aria-label="Filtrar alertas por condição"
            >
              <option value="all">Todas as condições</option>
              <option value="anomaly">Consumo acima da média</option>
              <option value="period_increase">Aumento entre períodos</option>
              <option value="high_power_equipment">Equipamento de alta potência</option>
              <option value="cost_projection">Projeção de custo superior</option>
              <option value="insufficient_data">Dados insuficientes</option>
            </select>

            <div className="segmented-control" role="group" aria-label="Filtrar alertas por status">
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'all' ? 'segmented-btn--active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Todos ({allAlerts.length})
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

        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="Nenhum alerta correspondente a este filtro"
            description="Limpe os filtros de status ou condição para visualizar todos os alertas ativos deste cenário."
            actionLabel={
              statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Ver todos os alertas'
                : undefined
            }
            onAction={
              statusFilter !== 'all' || categoryFilter !== 'all'
                ? () => {
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }
                : undefined
            }
            compact
          />
        ) : (
          <ul className="alerts-list">
            {filteredAlerts.map((alert) => {
              const linkedEquipment = alert.equipmentId
                ? state.equipment.find((e) => e.id === alert.equipmentId)
                : undefined;

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
                      <Badge
                        tone={
                          alert.priority === 'critical'
                            ? 'red'
                            : alert.priority === 'warning'
                              ? 'amber'
                              : 'sky'
                        }
                      >
                        {PRIORITY_LABELS[alert.priority]}
                      </Badge>

                      <Badge tone="slate">{CATEGORY_LABELS[alert.category]}</Badge>

                      {alert.deviationPercent !== undefined && (
                        <Badge tone={alert.priority === 'critical' ? 'red' : 'amber'}>
                          {formatPercent(alert.deviationPercent, true)}
                        </Badge>
                      )}

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

                  {/* Campos Estruturados Obrigatórios (Motivo, Data, Contexto dos Dados e Recomendação de Ação) */}
                  <div className="rec-evidence-grid">
                    <div className="rec-evidence-box">
                      <span>Motivo do Alerta</span>
                      <p>{alert.reason}</p>
                    </div>
                    <div className="rec-evidence-box">
                      <span>Contexto dos Dados (Ref.: {formatFullDate(alert.date)})</span>
                      <p>{alert.dataContext}</p>
                    </div>
                    <div className="rec-evidence-box" style={{ gridColumn: '1 / -1' }}>
                      <span>Recomendação de Ação</span>
                      <p>{alert.recommendedAction}</p>
                    </div>
                  </div>

                  {linkedEquipment && (
                    <div className="alert-linked-eq">
                      <ShieldAlert size={13} />
                      <span>
                        Equipamento associado:{' '}
                        <button
                          type="button"
                          className="cell-link-btn"
                          onClick={() => {
                            setSelectedEquipmentId(linkedEquipment.id);
                            setActiveSection('equipment');
                          }}
                        >
                          {linkedEquipment.name}
                        </button>{' '}
                        ({linkedEquipment.manufacturer ?? ''} {linkedEquipment.model ?? ''} ·{' '}
                        {linkedEquipment.location ?? 'Principal'})
                      </span>
                    </div>
                  )}

                  {alert.acknowledgedBy && (
                    <div className="alert-item-meta tabular-nums">
                      <span>
                        <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        Status atualizado por {alert.acknowledgedBy} em{' '}
                        {formatDateTimePtBr(alert.acknowledgedAt)}
                      </span>
                    </div>
                  )}

                  {canMutateAlerts && (
                    <div className="alert-workflow-actions">
                      {alert.status === 'open' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                          >
                            <Clock size={14} />
                            <span>Reconhecer alerta</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
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
                            className="btn btn-primary btn-sm"
                            onClick={() => updateAlertStatus(alert.id, 'resolved')}
                          >
                            <CheckCircle2 size={14} />
                            <span>Concluir e resolver</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
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
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateAlertStatus(alert.id, 'open')}
                        >
                          <RotateCcw size={14} />
                          <span>Reabrir alerta</span>
                        </button>
                      )}

                      {linkedEquipment && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedEquipmentId(linkedEquipment.id);
                            setActiveSection('equipment');
                          }}
                        >
                          <Cpu size={14} />
                          <span>Ver ficha do equipamento</span>
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
