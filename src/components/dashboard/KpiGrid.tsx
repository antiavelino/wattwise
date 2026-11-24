import React from 'react';
import {
  Zap,
  BarChart3,
  CalendarClock,
  Wallet,
  Cpu,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  formatCurrencyBRL,
  formatFullDate,
  formatKwh,
  formatPercent,
  formatPower,
  formatWatts,
} from '../../utils/formatters';

export const KpiGrid: React.FC = () => {
  const { analysis, state } = useWattWise();
  const latestIsAnomaly =
    analysis.latestRecord !== null &&
    analysis.anomalies.some((a) => a.recordId === analysis.latestRecord?.id);

  const periodVar = analysis.periodComparison.variationPercent;

  return (
    <section className="kpi-grid" aria-label="Indicadores principais de energia">
      {/* 1. Consumo Total do Período & Comparação Percentual */}
      <article className={`kpi-card kpi-card--featured ${latestIsAnomaly ? 'kpi-card--alert' : ''}`}>
        <div className="kpi-header">
          <span
            className="kpi-label"
            title="Soma de toda a energia elétrica (kWh) registrada no período selecionado"
          >
            Consumo total do período
          </span>
          <span className={`kpi-icon ${latestIsAnomaly ? 'kpi-icon--amber' : 'kpi-icon--emerald'}`}>
            <Zap size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.totalRecords > 0 ? formatKwh(analysis.periodTotalKwh) : '—'}
          </strong>
          {periodVar !== null && (
            <span
              className={`kpi-delta tabular-nums ${
                periodVar > 0 ? 'kpi-delta--up' : 'kpi-delta--down'
              }`}
              title="Comparação percentual entre a metade recente e a metade anterior do período"
            >
              {periodVar > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {formatPercent(periodVar, true)}
            </span>
          )}
        </div>

        <div className="kpi-footer">
          {analysis.latestRecord ? (
            <>
              <span>
                Última leitura ({formatFullDate(analysis.latestRecord.date)}):{' '}
                <strong>{formatKwh(analysis.latestRecord.consumptionKwh)}</strong>
              </span>
              {latestIsAnomaly && (
                <span className="kpi-inline-warning">
                  <AlertTriangle size={12} /> Anomalia ativa no último dia
                </span>
              )}
            </>
          ) : (
            <span>Sem registros diários cadastrados</span>
          )}
        </div>
      </article>

      {/* 2. Custo Estimado do Período & Tarifa */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span
            className="kpi-label"
            title="Custo estimado (R$) = Consumo (kWh) × Tarifa configurada (R$/kWh)"
          >
            Custo estimado no período
          </span>
          <span className="kpi-icon kpi-icon--emerald">
            <Wallet size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.totalRecords > 0 ? formatCurrencyBRL(analysis.periodTotalCostBrl) : '—'}
          </strong>
        </div>

        <div className="kpi-footer">
          <span>
            Tarifa: <strong>{formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh</strong> (
            {analysis.totalRecords} dias)
          </span>
          <span className="tabular-nums">
            Projeção 30d:{' '}
            {analysis.estimatedMonthlyCostBrl !== null
              ? formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)
              : '—'}
          </span>
        </div>
      </article>

      {/* 3. Média Diária de Consumo */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span
            className="kpi-label"
            title="Consumo total dividido pela quantidade de dias registrados no período"
          >
            Média diária
          </span>
          <span className="kpi-icon">
            <BarChart3 size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.historicalAverageKwh !== null
              ? `${formatKwh(analysis.historicalAverageKwh, 2)}`
              : '—'}
          </strong>
          {analysis.dailyVariationPercent !== null && (
            <span
              className={`kpi-delta tabular-nums ${
                analysis.dailyVariationPercent > 0 ? 'kpi-delta--up' : 'kpi-delta--down'
              }`}
              title="Variação do último dia em relação ao dia imediatamente anterior"
            >
              {formatPercent(analysis.dailyVariationPercent, true)} últ. dia
            </span>
          )}
        </div>

        <div className="kpi-footer">
          {analysis.historicalAverageKwh !== null ? (
            <span>
              Custo médio:{' '}
              {formatCurrencyBRL(analysis.historicalAverageKwh * state.settings.tariffPerKwh)}/dia
              (base {analysis.totalRecords}d)
            </span>
          ) : (
            <span>Adicione registros para calcular a média</span>
          )}
        </div>
      </article>

      {/* 4. Projeção Mensal (30 dias) */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span
            className="kpi-label"
            title="Projeção estatística para 30 dias com base nas leituras recentes vs. estimativa teórica do inventário"
          >
            Projeção mensal (30d)
          </span>
          <span className="kpi-icon kpi-icon--sky">
            <CalendarClock size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.monthlyForecastKwh !== null ? formatKwh(analysis.monthlyForecastKwh) : '—'}
          </strong>
        </div>

        <div className="kpi-footer">
          {analysis.hasEnoughDataForForecast && analysis.forecastBasisAverageKwh !== null ? (
            <>
              <span>
                Ritmo medido: {formatKwh(analysis.forecastBasisAverageKwh, 2)}/dia × 30d
              </span>
              <span>
                Inventário est.: {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês
              </span>
            </>
          ) : (
            <span>
              Faltam {analysis.recordsNeededForForecast} registro(s) (mín. 3 dias)
            </span>
          )}
        </div>
      </article>

      {/* 5. Quantidade de Equipamentos & Potência Ativa */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span
            className="kpi-label"
            title="Soma da potência nominal (W) dos equipamentos com status Ativo"
          >
            Equipamentos &amp; Potência
          </span>
          <span className="kpi-icon">
            <Cpu size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {formatPower(analysis.activeInstalledPowerWatts)}
          </strong>
        </div>

        <div className="kpi-footer">
          <span>
            <strong>
              {analysis.activeEquipmentCount} de {analysis.totalEquipmentCount}
            </strong>{' '}
            equipamento(s) ativo(s)
          </span>
          <span className="tabular-nums">
            Potência nominal: {formatWatts(analysis.activeInstalledPowerWatts)}
          </span>
        </div>
      </article>
    </section>
  );
};
