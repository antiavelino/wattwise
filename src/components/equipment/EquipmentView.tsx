import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Cpu,
  Eye,
  MapPin,
  Pencil,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  EQUIPMENT_CATEGORIES,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
} from '../../types/energy';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  formatWatts,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

interface EquipmentViewProps {
  onOpenCreate: () => void;
  onOpenEdit: (equipment: Equipment) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  onOpenCreate,
  onOpenEdit,
}) => {
  const {
    state,
    analysis,
    toggleEquipmentStatus,
    deleteEquipment,
    restoreDemoData,
    selectedEquipmentId,
    setSelectedEquipmentId,
    activeRole,
  } = useWattWise();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null);

  const canMutate = activeRole !== 'viewer';

  const summaryById = useMemo(() => {
    const map = new Map<string, (typeof analysis.equipmentSummaries)[number]>();
    for (const s of analysis.equipmentSummaries) {
      map.set(s.equipment.id, s);
    }
    return map;
  }, [analysis.equipmentSummaries]);

  const selectedSummary = selectedEquipmentId ? summaryById.get(selectedEquipmentId) : undefined;

  const filteredEquipment = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return state.equipment.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (
        query &&
        !item.name.toLowerCase().includes(query) &&
        !item.category.toLowerCase().includes(query) &&
        !(item.location ?? '').toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [state.equipment, searchQuery, categoryFilter, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  // Ficha de Detalhes Individual do Equipamento
  if (selectedSummary) {
    const eq = selectedSummary.equipment;
    const individualReadings = analysis.sortedRecords
      .filter((r) => r.equipmentId === eq.id)
      .reverse();

    return (
      <div className="view-stack">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedEquipmentId(null)}
          >
            <ArrowLeft size={15} />
            <span>Voltar ao inventário</span>
          </button>

          {canMutate && (
            <button type="button" className="btn btn-primary" onClick={() => onOpenEdit(eq)}>
              <Pencil size={15} />
              <span>Editar equipamento</span>
            </button>
          )}
        </div>

        <section className="panel">
          <div className="panel-header panel-header--wrap">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 className="panel-title" style={{ fontSize: 19 }}>
                  {eq.name}
                </h2>
                <Badge tone="slate">{eq.category}</Badge>
                <Badge tone={eq.status === 'active' ? 'emerald' : 'amber'}>
                  {eq.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
                {eq.isDemo && <Badge tone="demo">Demo</Badge>}
              </div>
              <p className="panel-subtitle">
                <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Localização: {eq.location ?? 'Principal'} · Quantidade: {eq.quantity ?? 1} un. · Uso
                estimado: {eq.dailyUsageHours ?? 8} h/dia
              </p>
            </div>
          </div>

          <div className="summary-strip">
            <div className="summary-pill">
              <span className="summary-pill-label">Potência nominal total</span>
              <strong className="summary-pill-value tabular-nums">
                {formatPower(selectedSummary.totalRatedPowerWatts)}
              </strong>
              <span className="summary-pill-sub tabular-nums">
                {formatWatts(eq.powerWatts)} × {eq.quantity ?? 1} un. (
                {formatPercent(selectedSummary.shareOfInstalledPowerPercent)} da carga ativa)
              </span>
            </div>

            <div className="summary-pill">
              <span className="summary-pill-label">Consumo estimado (30 dias)</span>
              <strong className="summary-pill-value tabular-nums text-emerald">
                {formatKwh(selectedSummary.estimatedMonthlyKwh)}
              </strong>
              <span className="summary-pill-sub tabular-nums">
                {formatKwh(selectedSummary.estimatedDailyKwh)}/dia ·{' '}
                {formatPercent(selectedSummary.shareOfEstimatedEnergyPercent)} do consumo estimado
              </span>
            </div>

            <div className="summary-pill">
              <span className="summary-pill-label">Custo mensal estimado</span>
              <strong className="summary-pill-value tabular-nums">
                {formatCurrencyBRL(selectedSummary.estimatedMonthlyCostBrl)}
              </strong>
              <span className="summary-pill-sub tabular-nums">
                Tarifa: {formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh
              </span>
            </div>
          </div>

          {eq.notes && (
            <div className="status-box status-box--info">
              <span className="status-box-text">
                <strong>Observações técnicas:</strong> {eq.notes}
              </span>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                Medições Vinculadas a este Equipamento ({individualReadings.length})
              </h3>
              <p className="panel-subtitle">
                Leituras registradas especificamente para {eq.name}
              </p>
            </div>
          </div>

          {individualReadings.length === 0 ? (
            <p className="form-hint">
              Nenhuma medição individual vinculada diretamente a este equipamento. Ao registrar uma
              medição no módulo de Registros, você pode associá-la diretamente a este item.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className="text-right">Energia (kWh)</th>
                    <th className="text-right">Custo</th>
                    <th>Natureza</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {individualReadings.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular-nums cell-strong">{formatFullDate(r.date)}</td>
                      <td className="text-right tabular-nums">{formatKwh(r.consumptionKwh)}</td>
                      <td className="text-right tabular-nums">
                        {formatCurrencyBRL(r.consumptionKwh * state.settings.tariffPerKwh)}
                      </td>
                      <td>
                        <Badge tone={r.isDemo ? 'demo' : 'emerald'}>
                          {r.isDemo ? 'Simulado' : 'Medido'}
                        </Badge>
                      </td>
                      <td>{r.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="view-stack">
      <section className="summary-strip" aria-label="Resumo de equipamentos">
        <div className="summary-pill">
          <span className="summary-pill-label">Potência ativa instalada</span>
          <strong className="summary-pill-value tabular-nums text-emerald">
            {formatPower(analysis.activeInstalledPowerWatts)}
          </strong>
          <span className="summary-pill-sub tabular-nums">
            {formatWatts(analysis.activeInstalledPowerWatts)} · {analysis.activeEquipmentCount} de{' '}
            {analysis.totalEquipmentCount} ativo(s)
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Consumo mensal estimado (Inventário)</span>
          <strong className="summary-pill-value tabular-nums">
            {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}
          </strong>
          <span className="summary-pill-sub tabular-nums">
            Custo estimado: {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Carga inativa / reserva</span>
          <strong className="summary-pill-value tabular-nums">
            {formatPower(analysis.inactiveInstalledPowerWatts)}
          </strong>
          <span className="summary-pill-sub">
            {analysis.totalEquipmentCount - analysis.activeEquipmentCount} inativo(s)
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="search-input-wrap">
            <Search size={16} className="search-input-icon" aria-hidden="true" />
            <input
              type="search"
              className="form-input form-input--search"
              placeholder="Buscar equipamento por nome, categoria ou localização..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar equipamentos"
            />
          </div>

          <div className="toolbar-filters">
            <select
              className="form-input form-input--compact"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as EquipmentCategory | 'all')}
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas as categorias</option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="form-input form-input--compact"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | 'all')}
              aria-label="Filtrar por status"
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </select>
          </div>
        </div>

        {state.equipment.length === 0 ? (
          <EmptyState
            icon={<Cpu size={26} />}
            title="Nenhum equipamento cadastrado"
            description="Cadastre os equipamentos do estabelecimento para calcular a potência nominal ativa, o consumo estimado em kWh e receber recomendações por categoria."
            actionLabel={canMutate ? 'Cadastrar equipamento' : undefined}
            onAction={canMutate ? onOpenCreate : undefined}
            secondaryActionLabel="Restaurar dados demo"
            onSecondaryAction={restoreDemoData}
          />
        ) : filteredEquipment.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title="Nenhum equipamento encontrado"
            description="Ajuste a busca ou limpe os filtros para visualizar todos os equipamentos cadastrados."
            actionLabel={hasActiveFilters ? 'Limpar filtros' : undefined}
            onAction={
              hasActiveFilters
                ? () => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }
                : undefined
            }
            compact
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Categoria / Local</th>
                  <th className="text-right">Potência</th>
                  <th className="text-right">Consumo Est. (30d)</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((item) => {
                  const summary = summaryById.get(item.id);
                  const totalWatts = item.powerWatts * Math.max(1, item.quantity ?? 1);

                  return (
                    <tr key={item.id} className={item.status === 'inactive' ? 'row-muted' : ''}>
                      <td>
                        <div className="cell-primary">
                          <button
                            type="button"
                            className="cell-link-btn"
                            onClick={() => setSelectedEquipmentId(item.id)}
                          >
                            {item.name}
                          </button>
                          {(item.quantity ?? 1) > 1 && (
                            <Badge tone="sky">{item.quantity}x</Badge>
                          )}
                          {item.isDemo && (
                            <Badge tone="demo" title="Equipamento simulado para demonstração">
                              Demo
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge tone="slate">{item.category}</Badge>
                        <span className="cell-sub">{item.location ?? 'Principal'}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{formatWatts(totalWatts)}</span>
                        {totalWatts >= 1000 && (
                          <span className="cell-sub">{formatPower(totalWatts)}</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong text-emerald">
                          {summary ? formatKwh(summary.estimatedMonthlyKwh) : '—'}
                        </span>
                        <span className="cell-sub">
                          {summary ? formatCurrencyBRL(summary.estimatedMonthlyCostBrl) : ''} (
                          {item.dailyUsageHours ?? 8}h/d)
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-pill-btn ${
                            item.status === 'active'
                              ? 'status-pill-btn--active'
                              : 'status-pill-btn--inactive'
                          }`}
                          onClick={() => toggleEquipmentStatus(item.id)}
                          disabled={!canMutate}
                          title="Clique para alternar entre ativo e inativo"
                        >
                          <Power size={13} />
                          <span>{item.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                        </button>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setSelectedEquipmentId(item.id)}
                            aria-label={`Detalhes de ${item.name}`}
                            title="Ver ficha detalhada"
                          >
                            <Eye size={15} />
                          </button>
                          {canMutate && (
                            <>
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => onOpenEdit(item)}
                                aria-label={`Editar ${item.name}`}
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                onClick={() => setPendingDelete(item)}
                                aria-label={`Excluir ${item.name}`}
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
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
        title="Excluir equipamento?"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir "${pendingDelete.name}" (${formatWatts(pendingDelete.powerWatts)})? A potência instalada ativa será recalculada imediatamente.`
            : ''
        }
        confirmLabel="Excluir equipamento"
        onConfirm={() => {
          if (pendingDelete) {
            deleteEquipment(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
