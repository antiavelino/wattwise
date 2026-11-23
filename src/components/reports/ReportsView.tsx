import React, { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { resolveMeasurementType } from '../../engine/analysisEngine';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  getTodayIsoDate,
  triggerFileDownload,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';

type ReportTab = 'executive' | 'consumption' | 'equipment' | 'alerts';

export const ReportsView: React.FC = () => {
  const { analysis, state, activeOrganization, pushToast } = useWattWise();
  const [activeTab, setActiveTab] = useState<ReportTab>('executive');

  const orgName = activeOrganization?.name ?? state.settings.establishmentName;
  const tariff = state.settings.tariffPerKwh;

  const handleExportReadingsCsv = () => {
    const header = [
      'Data',
      'Consumo_kWh',
      'Custo_Estimado_BRL',
      'Tipo_Medicao',
      'Origem',
      'Equipamento',
      'Status_Anomalia',
      'Observacao',
    ].join(';');

    const anomalySet = new Set(analysis.anomalies.map((a) => a.recordId));
    const eqMap = new Map(state.equipment.map((e) => [e.id, e.name]));

    const rows = [...analysis.sortedRecords].reverse().map((r) => {
      const cost = (r.consumptionKwh * tariff).toFixed(2).replace('.', ',');
      const kwh = r.consumptionKwh.toFixed(2).replace('.', ',');
      const mType = resolveMeasurementType(r);
      const eqName = r.equipmentId ? (eqMap.get(r.equipmentId) ?? r.equipmentId) : 'Geral';
      const isAnom = anomalySet.has(r.id) ? 'ANOMALIA' : 'NORMAL';
      const cleanNote = (r.note ?? '').replace(/;/g, ',').replace(/\r?\n/g, ' ');
      return [
        r.date,
        kwh,
        cost,
        mType,
        r.source ?? 'manual',
        eqName,
        isAnom,
        `"${cleanNote}"`,
      ].join(';');
    });

    const csvContent = `\uFEFF${[header, ...rows].join('\n')}`;
    triggerFileDownload(
      `wattwise-medicoes-${getTodayIsoDate()}.csv`,
      csvContent,
      'text/csv;charset=utf-8;',
    );
    pushToast('success', 'CSV de medições exportado', 'O arquivo foi baixado para o seu computador.');
  };

  const handleExportEquipmentCsv = () => {
    const header = [
      'Equipamento',
      'Categoria',
      'Localizacao',
      'Potencia_Nominal_W',
      'Quantidade',
      'Horas_Uso_Diario',
      'Status',
      'Consumo_Estimado_Mensal_kWh',
      'Custo_Estimado_Mensal_BRL',
    ].join(';');

    const rows = analysis.equipmentSummaries.map((s) => [
      `"${s.equipment.name.replace(/"/g, '""')}"`,
      s.equipment.category,
      `"${(s.equipment.location ?? 'Principal').replace(/"/g, '""')}"`,
      s.equipment.powerWatts,
      s.equipment.quantity ?? 1,
      String(s.equipment.dailyUsageHours ?? 8).replace('.', ','),
      s.equipment.status,
      s.estimatedMonthlyKwh.toFixed(2).replace('.', ','),
      s.estimatedMonthlyCostBrl.toFixed(2).replace('.', ','),
    ].join(';'));

    const csvContent = `\uFEFF${[header, ...rows].join('\n')}`;
    triggerFileDownload(
      `wattwise-equipamentos-${getTodayIsoDate()}.csv`,
      csvContent,
      'text/csv;charset=utf-8;',
    );
    pushToast('success', 'CSV de equipamentos exportado', 'Inventário baixado com sucesso.');
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'WattWise — Smart Energy Intelligence',
      organization: {
        id: activeOrganization?.id ?? 'demo_sandbox',
        name: orgName,
        tariffPerKwh: state.settings.tariffPerKwh,
        anomalyThresholdPercent: state.settings.anomalyThresholdPercent,
      },
      summary: {
        totalRecords: analysis.totalRecords,
        periodTotalKwh: analysis.periodTotalKwh,
        periodTotalCostBrl: analysis.periodTotalCostBrl,
        measuredTotalKwh: analysis.measuredTotalKwh,
        estimatedTotalKwh: analysis.estimatedTotalKwh,
        simulatedTotalKwh: analysis.simulatedTotalKwh,
        historicalAverageKwh: analysis.historicalAverageKwh,
        monthlyForecastKwh: analysis.monthlyForecastKwh,
        estimatedMonthlyCostBrl: analysis.estimatedMonthlyCostBrl,
        activeInstalledPowerWatts: analysis.activeInstalledPowerWatts,
        anomaliesCount: analysis.anomalies.length,
      },
      equipment: state.equipment,
      readings: analysis.sortedRecords,
      anomalies: analysis.anomalies,
      recommendations: analysis.recommendations,
    };

    triggerFileDownload(
      `wattwise-relatorio-${getTodayIsoDate()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8;',
    );
    pushToast('success', 'Relatório JSON exportado', 'Dados estruturados salvos com sucesso.');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="view-stack">
      {/* Barra de Exportação */}
      <section className="panel no-print" aria-label="Ações de exportação de relatórios">
        <div className="panel-header panel-header--wrap">
          <div>
            <h2 className="panel-title">Exportação e Relatórios Executivos</h2>
            <p className="panel-subtitle">
              Exporte exclusivamente os dados da organização ativa ({orgName}) em CSV, JSON ou
              relatório PDF
            </p>
          </div>

          <div className="chart-controls">
            <button type="button" className="btn btn-secondary" onClick={handleExportReadingsCsv}>
              <FileSpreadsheet size={15} />
              <span>Medições (CSV)</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExportEquipmentCsv}>
              <Download size={15} />
              <span>Equipamentos (CSV)</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExportJson}>
              <FileJson size={15} />
              <span>Exportar JSON</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrintPdf}>
              <Printer size={15} />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Seções do relatório">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'executive'}
            className={`segmented-btn ${activeTab === 'executive' ? 'segmented-btn--active' : ''}`}
            onClick={() => setActiveTab('executive')}
          >
            Relatório Executivo Completo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'consumption'}
            className={`segmented-btn ${activeTab === 'consumption' ? 'segmented-btn--active' : ''}`}
            onClick={() => setActiveTab('consumption')}
          >
            Consumo e Custos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'equipment'}
            className={`segmented-btn ${activeTab === 'equipment' ? 'segmented-btn--active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            Histórico de Equipamentos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'alerts'}
            className={`segmented-btn ${activeTab === 'alerts' ? 'segmented-btn--active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alertas e Recomendações
          </button>
        </div>
      </section>

      {/* Folha Executiva Imprimível (PDF) */}
      <section className="panel printable-report">
        <div className="report-print-header">
          <div>
            <Badge tone="emerald">Relatório Técnico de Inteligência Energética</Badge>
            <h2 className="panel-title" style={{ fontSize: 20, marginTop: 6 }}>
              {orgName}
            </h2>
            <p className="panel-subtitle">
              Emitido em {formatFullDate(getTodayIsoDate())} · Tarifa vigente:{' '}
              {formatCurrencyBRL(tariff)}/kWh · Limite de alerta: +
              {formatPercent(state.settings.anomalyThresholdPercent)}
            </p>
          </div>
          <div className="report-isolation-badge">
            <ShieldCheck size={15} className="text-emerald" />
            <span>Escopo isolado da organização</span>
          </div>
        </div>

        {/* Indicadores Consolidados */}
        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">Consumo acumulado no período</span>
            <strong className="summary-pill-value tabular-nums">
              {formatKwh(analysis.periodTotalKwh)}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Custo acumulado: {formatCurrencyBRL(analysis.periodTotalCostBrl)} (
              {analysis.totalRecords} dias)
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Previsão mensal (30 dias)</span>
            <strong className="summary-pill-value tabular-nums text-emerald">
              {analysis.monthlyForecastKwh !== null
                ? formatKwh(analysis.monthlyForecastKwh)
                : 'Insuficiente'}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Custo previsto:{' '}
              {analysis.estimatedMonthlyCostBrl !== null
                ? formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)
                : '—'}
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">Potência ativa vs. Estimativa inventário</span>
            <strong className="summary-pill-value tabular-nums">
              {formatPower(analysis.activeInstalledPowerWatts)}
            </strong>
            <span className="summary-pill-sub tabular-nums">
              Inventário: {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês (
              {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)})
            </span>
          </div>
        </div>

        {(activeTab === 'executive' || activeTab === 'consumption') && (
          <div className="report-block">
            <h3 className="panel-title">Comparativo Mensal e Natureza das Medições</h3>
            <div className="table-responsive" style={{ marginTop: 10 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th className="text-right">Dias</th>
                    <th className="text-right">Medido</th>
                    <th className="text-right">Estimado</th>
                    <th className="text-right">Simulado</th>
                    <th className="text-right">Total (kWh)</th>
                    <th className="text-right">Média/dia</th>
                    <th className="text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.monthlyComparison.map((m) => (
                    <tr key={m.monthKey}>
                      <td className="cell-strong">{m.monthLabel}</td>
                      <td className="text-right tabular-nums">{m.daysCount}</td>
                      <td className="text-right tabular-nums">{formatKwh(m.measuredKwh)}</td>
                      <td className="text-right tabular-nums">{formatKwh(m.estimatedKwh)}</td>
                      <td className="text-right tabular-nums">{formatKwh(m.simulatedKwh)}</td>
                      <td className="text-right tabular-nums text-emerald">
                        {formatKwh(m.totalKwh)}
                      </td>
                      <td className="text-right tabular-nums">{formatKwh(m.averageDailyKwh)}</td>
                      <td className="text-right tabular-nums">{formatCurrencyBRL(m.totalCostBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'executive' || activeTab === 'equipment') && (
          <div className="report-block">
            <h3 className="panel-title">Relatório de Equipamentos e Consumo Estimado</h3>
            <div className="table-responsive" style={{ marginTop: 10 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th>Categoria / Local</th>
                    <th className="text-right">Potência Total</th>
                    <th className="text-right">Regime Diário</th>
                    <th className="text-right">Consumo Est. (30d)</th>
                    <th className="text-right">Custo Est. (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.equipmentSummaries.map((s) => (
                    <tr key={s.equipment.id}>
                      <td className="cell-strong">{s.equipment.name}</td>
                      <td>
                        {s.equipment.category} · {s.equipment.location ?? 'Principal'}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatPower(s.totalRatedPowerWatts)}
                      </td>
                      <td className="text-right tabular-nums">
                        {s.equipment.dailyUsageHours ?? 8}h/dia ({s.equipment.status === 'active' ? 'Ativo' : 'Inativo'})
                      </td>
                      <td className="text-right tabular-nums">
                        {formatKwh(s.estimatedMonthlyKwh)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatCurrencyBRL(s.estimatedMonthlyCostBrl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'executive' || activeTab === 'alerts') && (
          <div className="report-block">
            <h3 className="panel-title">
              Principais Alertas ({analysis.anomalies.length}) e Recomendações (
              {analysis.recommendations.length})
            </h3>
            <div className="dashboard-split" style={{ marginTop: 12 }}>
              <div className="alerts-list">
                {analysis.anomalies.length === 0 ? (
                  <p className="form-hint">Nenhuma anomalia registrada no período.</p>
                ) : (
                  analysis.anomalies.slice(0, 5).map((a) => (
                    <div key={a.id} className={`alert-item alert-item--${a.severity}`}>
                      <strong>{a.title}</strong>
                      <p className="alert-item-desc">{a.description}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="recommendations-list">
                {analysis.recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className={`recommendation-item recommendation-item--${rec.priority}`}
                  >
                    <strong>{rec.title}</strong>
                    <p className="recommendation-desc">{rec.description}</p>
                    <span className="form-hint">Impacto: {rec.estimatedImpact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
