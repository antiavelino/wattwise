import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  ExternalLink,
  Eye,
  HelpCircle,
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
    activeScenarioMeta,
  } = useWattWise();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

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
        !(item.manufacturer ?? '').toLowerCase().includes(query) &&
        !(item.model ?? '').toLowerCase().includes(query) &&
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

  // Ficha Técnica Individual Detalhada do Equipamento
  if (selectedSummary) {
    const eq = selectedSummary.equipment;
    const individualReadings = analysis.sortedRecords
      .filter((r) => r.equipmentId === eq.id)
      .reverse();
    const qty = eq.quantity ?? 1;
    const hours = eq.dailyUsageHours ?? 8;
    const factorPct = Math.round(selectedSummary.effectiveUsageFactor * 100);

    return (
      <div className="view-stack">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedEquipmentId(null)}
          >
            <ArrowLeft size={15} />
            <span>Voltar ao inventário ({activeScenarioMeta.shortLabel})</span>
          </button>

          {canMutate && (
            <button type="button" className="btn btn-primary" onClick={() => onOpenEdit(eq)}>
              <Pencil size={15} />
              <span>Editar especificações</span>
            </button>
          )}
        </div>

        <section className="panel" aria-label={`Ficha técnica de ${eq.name}`}>
          <div className="panel-header panel-header--wrap">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 className="panel-title" style={{ fontSize: 20 }}>
                  {eq.name}
                </h2>
                <Badge tone="slate">{eq.category}</Badge>
                <Badge tone={eq.status === 'active' ? 'emerald' : 'amber'}>
                  {eq.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
                {eq.isDemo && <Badge tone="demo">Especificação Verificada</Badge>}
              </div>
              <p className="panel-subtitle" style={{ marginTop: 6 }}>
                {eq.manufacturer && (
                  <>
                    <strong>Fabricante:</strong> {eq.manufacturer} ·{' '}
                  </>
                )}
                {eq.model && (
                  <>
                    <strong>Modelo:</strong> {eq.model} ·{' '}
                  </>
                )}
                <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                <strong>Setor:</strong> {eq.location ?? 'Principal'}
              </p>
            </div>
          </div>

          <div className="summary-strip">
            <div className="summary-pill">
              <span className="summary-pill-label">1. Potência Elétrica Nominal Comprovada</span>
              <strong className="summary-pill-value tabular-nums">
                {formatPower(selectedSummary.totalRatedPowerWatts)}
              </strong>
              <span className="summary-pill-sub tabular-nums">
                {formatWatts(eq.powerWatts)} unitário × {qty} un. (
                {formatPercent(selectedSummary.shareOfInstalledPowerPercent)} da potência ativa)
              </span>
            </div>

            <div className="summary-pill">
              <span className="summary-pill-label">2. Consumo Mensal Estimado (com Fator de Ciclo)</span>
              <strong className="summary-pill-value tabular-nums text-emerald">
                {formatKwh(selectedSummary.estimatedMonthlyKwh)}/mês
              </strong>
              <span className="summary-pill-sub tabular-nums">
                {formatKwh(selectedSummary.estimatedDailyKwh, 2)}/dia ({hours}h/dia × fator{' '}
                {factorPct}%) · {formatPercent(selectedSummary.shareOfEstimatedEnergyPercent)} do
                total
              </span>
            </div>

            <div className="summary-pill">
              <span className="summary-pill-label">3. Custo Mensal Estimado</span>
              <strong className="summary-pill-value tabular-nums">
                {formatCurrencyBRL(selectedSummary.estimatedMonthlyCostBrl)}
              </strong>
              <span className="summary-pill-sub tabular-nums">
                Tarifa configurada: {formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh
              </span>
            </div>
          </div>

          {/* Memória de Cálculo Físico Transparente */}
          <div className="didactic-callout">
            <strong>Memória de Cálculo Físico deste Equipamento:</strong>
            <div className="formula-box" style={{ marginTop: 6 }}>
              <code>
                Consumo Diário = ({eq.powerWatts} W ÷ 1000) × {qty} un. × {hours} h/dia ×{' '}
                {selectedSummary.effectiveUsageFactor.toFixed(2).replace('.', ',')} (fator de
                operação) = {formatKwh(selectedSummary.estimatedDailyKwh, 2)}/dia
              </code>
            </div>
            <p style={{ marginTop: 6 }}>
              Em 30 dias: <strong>{formatKwh(selectedSummary.estimatedMonthlyKwh)}/mês</strong>. Se
              operasse continuamente a 100% da potência nominal sem modulação de
              termostato/ciclo, o consumo teórico seria de{' '}
              <strong>{formatKwh(selectedSummary.nominalMonthlyKwhWithoutFactor)}/mês</strong>.
            </p>
          </div>

          {/* Fonte Técnica e URL Consultada */}
          <div className="tech-spec-source-box">
            <div className="tech-spec-source-header">
              <BookOpen size={16} className="text-emerald" />
              <strong>Fonte Técnica da Especificação Elétrica</strong>
            </div>
            <div className="tech-spec-source-grid">
              <div>
                <span className="tech-spec-label">Fabricante / Marca</span>
                <p className="tech-spec-val">{eq.manufacturer ?? 'Informado pelo usuário'}</p>
              </div>
              <div>
                <span className="tech-spec-label">Modelo Comercial</span>
                <p className="tech-spec-val">{eq.model ?? 'Padrão'}</p>
              </div>
              <div>
                <span className="tech-spec-label">Documento / Ficha Técnica de Referência</span>
                <p className="tech-spec-val">
                  {eq.technicalSource ?? 'Especificação cadastrada manualmente no cenário'}
                </p>
              </div>
              <div>
                <span className="tech-spec-label">URL Oficial Consultada</span>
                <p className="tech-spec-val">
                  {eq.sourceUrl ? (
                    <a
                      href={eq.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tech-source-link"
                    >
                      <span>{eq.sourceUrl}</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            {eq.notes && (
              <p className="form-hint" style={{ marginTop: 10 }}>
                <strong>Observações de operação e engenharia:</strong> {eq.notes}
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                Registros Diários Associados a este Equipamento ({individualReadings.length})
              </h3>
              <p className="panel-subtitle">
                Eventos ou leituras vinculados especificamente a {eq.name}
              </p>
            </div>
          </div>

          {individualReadings.length === 0 ? (
            <p className="form-hint">
              Nenhuma medição individual vinculada diretamente a este equipamento. Na página de
              Registros, você pode associar uma leitura ou evento de pico diretamente a este item.
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
          <span className="summary-pill-label">Potência nominal ativa instalada</span>
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
            {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês
          </strong>
          <span className="summary-pill-sub tabular-nums">
            {formatKwh(analysis.estimatedEquipmentDailyKwh, 2)}/dia · Custo:{' '}
            {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês
          </span>
        </div>

        <div className="summary-pill">
          <span className="summary-pill-label">Carga inativa / reserva técnica</span>
          <strong className="summary-pill-value tabular-nums">
            {formatPower(analysis.inactiveInstalledPowerWatts)}
          </strong>
          <span className="summary-pill-sub">
            {analysis.totalEquipmentCount - analysis.activeEquipmentCount} equipamento(s) inativo(s)
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="panel-title">
                Inventário de Equipamentos — {activeScenarioMeta.shortLabel}
              </h2>
              <Badge tone="emerald">Especificações Técnicas Reais</Badge>
              <button
                type="button"
                className="didactic-help-trigger"
                onClick={() => setShowFormulaHelp((prev) => !prev)}
                aria-expanded={showFormulaHelp}
              >
                <HelpCircle size={14} />
                <span>Potência (W) vs. Consumo (kWh)</span>
              </button>
            </div>
            <p className="panel-subtitle">
              Clique no nome de qualquer equipamento para inspecionar fabricante, modelo, memória de
              cálculo e link da fonte técnica
            </p>
          </div>
        </div>

        {showFormulaHelp && (
          <div className="didactic-callout">
            <strong>Como calculamos o Consumo Estimado de cada Equipamento:</strong>
            <p>
              A <strong>Potência Nominal (W)</strong> é o valor elétrico de entrada comprovado na
              ficha técnica do fabricante (não confundir com BTU/h térmicos). O consumo estimado
              aplica:{' '}
              <code>
                Consumo (kWh) = (Potência W ÷ 1000) × Quantidade × Horas/dia × Fator de Operação
              </code>
              . O fator de operação reflete o ciclo real do termostato/compressor.
            </p>
          </div>
        )}

        <div className="toolbar">
          <div className="search-input-wrap">
            <Search size={16} className="search-input-icon" aria-hidden="true" />
            <input
              type="search"
              className="form-input form-input--search"
              placeholder="Buscar por nome, fabricante, modelo, categoria ou setor..."
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
            title="Nenhum equipamento cadastrado neste cenário"
            description="Cadastre os equipamentos elétricos do estabelecimento para calcular a potência nominal ativa e o consumo estimado em kWh."
            actionLabel={canMutate ? 'Cadastrar equipamento' : undefined}
            onAction={canMutate ? onOpenCreate : undefined}
            secondaryActionLabel="Restaurar equipamentos do cenário"
            onSecondaryAction={restoreDemoData}
          />
        ) : filteredEquipment.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title="Nenhum equipamento encontrado"
            description="Ajuste os termos de busca ou limpe os filtros para visualizar todos os equipamentos cadastrados."
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
                  <th>Equipamento / Fabricante &amp; Modelo</th>
                  <th>Categoria / Setor</th>
                  <th className="text-right">Potência Nominal</th>
                  <th className="text-right">Uso &amp; Ciclo</th>
                  <th className="text-right">Consumo Est. (30d)</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((item) => {
                  const summary = summaryById.get(item.id);
                  const qty = Math.max(1, item.quantity ?? 1);
                  const totalWatts = item.powerWatts * qty;
                  const factorPct = Math.round((item.usageFactor ?? 1) * 100);

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
                          {qty > 1 && <Badge tone="sky">{qty} un.</Badge>}
                        </div>
                        <span className="cell-sub">
                          {item.manufacturer ? `${item.manufacturer}` : 'Especificação manual'}
                          {item.model ? ` · ${item.model}` : ''}
                          {item.sourceUrl ? ' · Fonte verificada' : ''}
                        </span>
                      </td>
                      <td>
                        <Badge tone="slate">{item.category}</Badge>
                        <span className="cell-sub">{item.location ?? 'Principal'}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{formatWatts(totalWatts)}</span>
                        <span className="cell-sub">
                          {qty > 1 ? `${qty}× ${formatWatts(item.powerWatts)}` : formatPower(totalWatts)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong">{item.dailyUsageHours ?? 8}h/dia</span>
                        <span className="cell-sub">Ciclo: {factorPct}%</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="cell-strong text-emerald">
                          {summary ? formatKwh(summary.estimatedMonthlyKwh) : '—'}
                        </span>
                        <span className="cell-sub">
                          {summary ? `${formatCurrencyBRL(summary.estimatedMonthlyCostBrl)}/mês` : ''}
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
                            aria-label={`Ficha técnica de ${item.name}`}
                            title="Ver ficha técnica e fonte"
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
            ? `Tem certeza que deseja excluir "${pendingDelete.name}" (${formatWatts(pendingDelete.powerWatts)})? A potência instalada e o consumo estimado deste cenário serão recalculados imediatamente.`
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
