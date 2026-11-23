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

  return (
    <section className="kpi-grid" aria-label="Indicadores principais de energia">
      {/* 1. Consumo diário em kWh */}
      <article className={`kpi-card kpi-card--featured ${latestIsAnomaly ? 'kpi-card--alert' : ''}`}>
        <div className="kpi-header">
          <span className="kpi-label">Consumo diário</span>
          <span className={`kpi-icon ${latestIsAnomaly ? 'kpi-icon--amber' : 'kpi-icon--emerald'}`}>
            <Zap size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.latestRecord ? formatKwh(analysis.latestRecord.consumptionKwh) : '—'}
          </strong>
          {analysis.dailyVariationPercent !== null && (
            <span
              className={`kpi-delta tabular-nums ${
                analysis.dailyVariationPercent > 0 ? 'kpi-delta--up' : 'kpi-delta--down'
              }`}
              title="Variação em relação ao registro imediatamente anterior"
            >
              {analysis.dailyVariationPercent > 0 ? (
                <TrendingUp size={13} />
              ) : (
                <TrendingDown size={13} />
              )}
              {formatPercent(analysis.dailyVariationPercent, true)}
            </span>
          )}
        </div>

        <div className="kpi-footer">
          {analysis.latestRecord ? (
            <>
              <span>
                Último dia: {formatFullDate(analysis.latestRecord.date)}
                {analysis.estimatedDailyCostBrl !== null
                  ? ` (${formatCurrencyBRL(analysis.estimatedDailyCostBrl)})`
                  : ''}
              </span>
              {latestIsAnomaly && (
                <span className="kpi-inline-warning">
                  <AlertTriangle size={12} /> Anomalia ativa
                </span>
              )}
            </>
          ) : (
            <span>Sem registros diários cadastrados</span>
          )}
        </div>
      </article>

      {/* 2. Média de consumo */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Média histórica</span>
          <span className="kpi-icon">
            <BarChart3 size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.historicalAverageKwh !== null
              ? formatKwh(analysis.historicalAverageKwh)
              : '—'}
          </strong>
        </div>

        <div className="kpi-footer">
          {analysis.totalRecords > 0 ? (
            <span>Base de {analysis.totalRecords} dia(s) registrados</span>
          ) : (
            <span>Adicione registros para calcular a média</span>
          )}
        </div>
      </article>

      {/* 3. Previsão mensal */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Previsão mensal</span>
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
            <span>
              {formatKwh(analysis.forecastBasisAverageKwh, 2)}/dia × 30 dias (últimos{' '}
              {analysis.forecastBasisDays}d)
            </span>
          ) : (
            <span>
              Faltam {analysis.recordsNeededForForecast} registro(s) (mín. 3 dias)
            </span>
          )}
        </div>
      </article>

      {/* 4. Custo estimado em reais */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Custo mensal estimado</span>
          <span className="kpi-icon kpi-icon--emerald">
            <Wallet size={17} />
          </span>
        </div>

        <div className="kpi-value-row">
          <strong className="kpi-value tabular-nums">
            {analysis.estimatedMonthlyCostBrl !== null
              ? formatCurrencyBRL(analysis.estimatedMonthlyCostBrl)
              : '—'}
          </strong>
        </div>

        <div className="kpi-footer">
          {analysis.estimatedMonthlyCostBrl !== null ? (
            <span>Tarifa: {formatCurrencyBRL(state.settings.tariffPerKwh)}/kWh</span>
          ) : (
            <span>Disponível com ao menos 3 dias de histórico</span>
          )}
        </div>
      </article>

      {/* 5. Potência nominal instalada dos equipamentos ativos */}
      <article className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-label">Potência ativa instalada</span>
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
            {analysis.activeEquipmentCount} de {analysis.totalEquipmentCount} ativo(s) ·{' '}
            {formatWatts(analysis.activeInstalledPowerWatts)}
          </span>
        </div>
      </article>
    </section>
  );
};
