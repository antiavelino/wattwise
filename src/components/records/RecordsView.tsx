import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileBarChart2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { resolveMeasurementType } from '../../engine/analysisEngine';
import { ConsumptionRecord, MeasurementType } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  getTodayIsoDate,
  triggerFileDownload,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

interface RecordsViewProps {
  onOpenCreate: () => void;
  onOpenEdit: (record: ConsumptionRecord) => void;
}

type RecordFilter = 'all' | 'anomalies';

export const RecordsView: React.FC<RecordsViewProps> = ({
  onOpenCreate,
  onOpenEdit,
}) => {
  const { analysis, state, deleteRecord, restoreDemoData, activeRole, pushToast } = useWattWise();
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [typeFilter, setTypeFilter] = useState<MeasurementType | 'all'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [pendingDelete, setPendingDelete] = useState<ConsumptionRecord | null>(null);

  const canMutate = activeRole !== 'viewer';

  const anomalyByRecordId = useMemo(() => {
    const map = new Map<string, (typeof analysis.anomalies)[number]>();
    for (const anomaly of analysis.anomalies) {
      map.set(anomaly.recordId, anomaly);
    }
    return map;
  }, [analysis.anomalies]);

  const equipmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const eq of state.equipment) {
      map.set(eq.id, eq.name);
    }
    return map;
  }, [state.equipment]);

  const totalAccumulatedKwh = useMemo(
    () => analysis.sortedRecords.reduce((acc, item) => acc + item.consumptionKwh, 0),
    [analysis.sortedRecords],
  );

  const displayedRecords = useMemo(() => {
    const desc = [...analysis.sortedRecords].reverse();
    return desc.filter((r) => {
      if (filter === 'anomalies' && !anomalyByRecordId.has(r.id)) return false;
      if (typeFilter !== 'all' && resolveMeasurementType(r) !== typeFilter) return false;
      if (equipmentFilter !== 'all' && (r.equipmentId ?? '') !== equipmentFilter) return false;
      return true;
    });
  }, [analysis.sortedRecords, filter, typeFilter, equipmentFilter, anomalyByRecordId]);

  const handleExportCsv = () => {
    const header = [
      'Data',
      'Consumo_kWh',
      'Custo_Estimado_BRL',
      'Tipo_Medicao',
      'Origem',
      'Equipamento',
      'Observacao',
    ].join(';');

    const rows = displayedRecords.map((r) => {
      const mType = resolveMeasurementType(r);
      const cost = (r.consumptionKwh * state.settings.tariffPerKwh).toFixed(2).replace('.', ',');
      const eqName = r.equipmentId ? (equipmentNameById.get(r.equipmentId) ?? r.equipmentId) : 'Geral';
      return [
        r.date,
        r.consumptionKwh.toFixed(2).replace('.', ','),
        cost,
        mType,
        r.source ?? 'manual',
        `"${eqName}"`,
        `"${(r.note ?? '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    triggerFileDownload(
      `wattwise-medicoes-${getTodayIsoDate()}.csv`,
      `\uFEFF${[header, ...rows].join('\n')}`,
      'text/csv;charset=utf-8;',
    );
    pushToast('success', 'CSV exportado', `${displayedRecords.length} registro(s) exportado(s).`);
  };

  return (
    <div className="view-stack">
      <section className="summary-strip" aria-label="Resumo do histórico de consumo">
        <div className="summary-pill">
          <span className="summary-pill-label">Dias registrados</span>
          <strong className="summary-pill-value tabular-nums">{analysis.totalRecords}</strong>
          <span className="summary-pill-sub">
            {analysis.hasEnoughDataForAnomalies
              ? 'Análise completa ativa'
              : 'Mín. 4 dias para anomalias'}
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Total acumulado</span>
          <strong className="summary-pill-value tabular-nums text-emerald">
            {formatKwh(totalAccumulatedKwh)}
          </strong>
          <span className="summary-pill-sub tabular-nums">
            {formatCurrencyBRL(totalAccumulatedKwh * state.settings.tariffPerKwh)} estimados
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Média diária</span>
          <strong className="summary-pill-value tabular-nums">
            {analysis.historicalAverageKwh !== null
              ? formatKwh(analysis.historicalAverageKwh)
              : '—'}
          </strong>
          <span className="summary-pill-sub">
            {analysis.anomalies.length} anomalia(s) detectada(s)
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">Lançamentos Diários</h2>
            <p className="panel-subtitle">
              Ordenados da data mais recente para a mais antiga · Tarifa atual:{' '}
              {formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh
            </p>
          </div>

          {analysis.totalRecords > 0 && (
            <div className="chart-controls">
              <select
                className="form-input form-input--compact"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MeasurementType | 'all')}
                aria-label="Filtrar por natureza da medição"
              >
                <option value="all">Todas as naturezas</option>
                <option value="measured">Somente Medidos</option>
                <option value="estimated">Somente Estimados</option>
                <option value="simulated">Somente Simulados (Demo)</option>
              </select>

              {state.equipment.length > 0 && (
                <select
                  className="form-input form-input--compact"
                  value={equipmentFilter}
                  onChange={(e) => setEquipmentFilter(e.target.value)}
                  aria-label="Filtrar por equipamento"
                >
                  <option value="all">Todos os escopos</option>
                  {state.equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="segmented-control" role="group" aria-label="Filtrar registros">
                <button
                  type="button"
                  className={`segmented-btn ${filter === 'all' ? 'segmented-btn--active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  Todos ({analysis.totalRecords})
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${
                    filter === 'anomalies' ? 'segmented-btn--active' : ''
                  }`}
                  onClick={() => setFilter('anomalies')}
                >
                  Anomalias ({analysis.anomalies.length})
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportCsv}
                title="Exportar registros filtrados em CSV"
              >
                <Download size={15} />
                <span>Exportar CSV</span>
              </button>
            </div>
          )}
        </div>

        {analysis.totalRecords === 0 ? (
          <EmptyState
            icon={<FileBarChart2 size={26} />}
            title="Nenhum registro de consumo"
            description="Registre o consumo diário em kWh para acompanhar o gráfico histórico, calcular a previsão mensal e detectar anomalias."
            actionLabel={canMutate ? 'Registrar primeiro consumo' : undefined}
            onAction={canMutate ? onOpenCreate : undefined}
            secondaryActionLabel="Restaurar dados demo"
            onSecondaryAction={restoreDemoData}
          />
        ) : displayedRecords.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="Nenhum registro neste filtro"
            description="Ajuste os filtros de anomalia, natureza da medição ou equipamento."
            actionLabel="Ver todos os registros"
            onAction={() => {
              setFilter('all');
              setTypeFilter('all');
              setEquipmentFilter('all');
            }}
            compact
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="text-right">Consumo</th>
                  <th className="text-right">Custo estimado</th>
                  <th>Análise local</th>
                  <th>Natureza / Escopo</th>
                  <th>Observação</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((record) => {
                  const anomaly = anomalyByRecordId.get(record.id);
                  const costBrl = record.consumptionKwh * state.settings.tariffPerKwh;
                  const mType = resolveMeasurementType(record);
                  const linkedEqName = record.equipmentId
                    ? equipmentNameById.get(record.equipmentId)
                    : null;

                  return (
                    <tr key={record.id} className={anomaly ? 'row-anomaly' : ''}>
                      <td className="tabular-nums">
                        <div className="cell-primary">
                          <span className="cell-strong">{formatFullDate(record.date)}</span>
                          {record.isDemo && (
                            <Badge tone="demo" title="Registro simulado para demonstração">
                              Demo
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{formatKwh(record.consumptionKwh)}</span>
                        {record.source === 'meter_cumulative' &&
                          record.meterPreviousKwh !== undefined &&
                          record.meterCurrentKwh !== undefined && (
                            <span className="cell-sub">
                              Medidor: {record.meterPreviousKwh} → {record.meterCurrentKwh}
                            </span>
                          )}
                      </td>
                      <td className="text-right tabular-nums">
                        <span>{formatCurrencyBRL(costBrl)}</span>
                      </td>
                      <td>
                        {anomaly ? (
                          <Badge tone={anomaly.severity === 'critical' ? 'red' : 'amber'}>
                            Anomalia {formatPercent(anomaly.deviationPercent, true)}
                          </Badge>
                        ) : (
                          <Badge tone="emerald">Normal</Badge>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={
                            mType === 'measured'
                              ? 'emerald'
                              : mType === 'estimated'
                                ? 'sky'
                                : 'demo'
                          }
                        >
                          {mType === 'measured'
                            ? 'Medido'
                            : mType === 'estimated'
                              ? 'Estimado'
                              : 'Simulado'}
                        </Badge>
                        {linkedEqName && <span className="cell-sub">{linkedEqName}</span>}
                      </td>
                      <td>
                        <span className="cell-note">{record.note ?? '—'}</span>
                      </td>
                      <td>
                        {canMutate && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => onOpenEdit(record)}
                              aria-label={`Editar registro de ${formatFullDate(record.date)}`}
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              onClick={() => setPendingDelete(record)}
                              aria-label={`Excluir registro de ${formatFullDate(record.date)}`}
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Excluir registro diário?"
        description={
          pendingDelete
            ? `Deseja remover o registro de ${formatFullDate(pendingDelete.date)} (${formatKwh(pendingDelete.consumptionKwh)})? A média histórica, previsão mensal e alertas serão recalculados.`
            : ''
        }
        confirmLabel="Excluir registro"
        onConfirm={() => {
          if (pendingDelete) {
            deleteRecord(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
