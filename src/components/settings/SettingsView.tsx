import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  FileJson,
  Info,
  Moon,
  RotateCcw,
  Sliders,
  Sun,
  Trash2,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  DEMO_SCENARIO_LIST,
  OFFICIAL_TARIFF_REFERENCE,
} from '../../data/demoData';
import { runEnergyAnalysis } from '../../engine/analysisEngine';
import {
  formatCurrencyBRL,
  getTodayIsoDate,
  triggerFileDownload,
} from '../../utils/formatters';
import {
  parseNumericInput,
  SettingsValidationErrors,
  validateSettingsInput,
} from '../../utils/validators';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsViewProps {
  onOpenMigrationModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const {
    state,
    analysis,
    updateSettings,
    restoreDemoData,
    clearOperationalData,
    activeRole,
    pushToast,
    theme,
    setTheme,
    activeScenarioId,
    activeScenarioMeta,
    switchScenario,
  } = useWattWise();

  const [establishmentName, setEstablishmentName] = useState(state.settings.establishmentName);
  const [tariffRaw, setTariffRaw] = useState(String(state.settings.tariffPerKwh));
  const [referenceLocation, setReferenceLocation] = useState(
    state.settings.referenceLocation ?? OFFICIAL_TARIFF_REFERENCE.referenceLocation,
  );
  const [consumerClass, setConsumerClass] = useState(
    state.settings.consumerClass ?? OFFICIAL_TARIFF_REFERENCE.consumerClass,
  );
  const [tariffSource, setTariffSource] = useState(
    state.settings.tariffSource ?? OFFICIAL_TARIFF_REFERENCE.tariffSource,
  );
  const [tariffReferenceDate, setTariffReferenceDate] = useState(
    state.settings.tariffReferenceDate ?? OFFICIAL_TARIFF_REFERENCE.tariffReferenceDate,
  );
  const [thresholdRaw, setThresholdRaw] = useState(String(state.settings.anomalyThresholdPercent));
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const canEditSettings = activeRole === 'owner' || activeRole === 'admin';

  useEffect(() => {
    setEstablishmentName(state.settings.establishmentName);
    setTariffRaw(String(state.settings.tariffPerKwh));
    setReferenceLocation(
      state.settings.referenceLocation ?? OFFICIAL_TARIFF_REFERENCE.referenceLocation,
    );
    setConsumerClass(state.settings.consumerClass ?? OFFICIAL_TARIFF_REFERENCE.consumerClass);
    setTariffSource(state.settings.tariffSource ?? OFFICIAL_TARIFF_REFERENCE.tariffSource);
    setTariffReferenceDate(
      state.settings.tariffReferenceDate ?? OFFICIAL_TARIFF_REFERENCE.tariffReferenceDate,
    );
    setThresholdRaw(String(state.settings.anomalyThresholdPercent));
    setErrors({});
  }, [state.settings]);

  const hasChanges = useMemo(() => {
    const parsedTariff = parseNumericInput(tariffRaw);
    const parsedThreshold = parseNumericInput(thresholdRaw);
    return (
      establishmentName.trim() !== state.settings.establishmentName ||
      parsedTariff !== state.settings.tariffPerKwh ||
      parsedThreshold !== state.settings.anomalyThresholdPercent ||
      referenceLocation.trim() !== (state.settings.referenceLocation ?? '') ||
      consumerClass.trim() !== (state.settings.consumerClass ?? '') ||
      tariffSource.trim() !== (state.settings.tariffSource ?? '') ||
      tariffReferenceDate.trim() !== (state.settings.tariffReferenceDate ?? '')
    );
  }, [
    establishmentName,
    tariffRaw,
    thresholdRaw,
    referenceLocation,
    consumerClass,
    tariffSource,
    tariffReferenceDate,
    state.settings,
  ]);

  const livePreview = useMemo(() => {
    const parsedTariff = parseNumericInput(tariffRaw);
    const parsedThreshold = parseNumericInput(thresholdRaw);
    const safeTariff =
      Number.isFinite(parsedTariff) && parsedTariff > 0
        ? parsedTariff
        : state.settings.tariffPerKwh;
    const safeThreshold =
      Number.isFinite(parsedThreshold) && parsedThreshold >= 5 && parsedThreshold <= 200
        ? parsedThreshold
        : state.settings.anomalyThresholdPercent;

    return runEnergyAnalysis(state.equipment, state.records, {
      ...state.settings,
      tariffPerKwh: safeTariff,
      anomalyThresholdPercent: safeThreshold,
    });
  }, [state.equipment, state.records, state.settings, tariffRaw, thresholdRaw]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateSettingsInput({
      establishmentName,
      tariffPerKwhRaw: tariffRaw,
      anomalyThresholdPercentRaw: thresholdRaw,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    updateSettings({
      establishmentName: establishmentName.trim(),
      tariffPerKwh: validation.parsedTariff,
      referenceLocation: referenceLocation.trim(),
      consumerClass: consumerClass.trim(),
      tariffSource: tariffSource.trim(),
      tariffReferenceDate: tariffReferenceDate.trim(),
      anomalyThresholdPercent: validation.parsedThreshold,
    });
  };

  const handleApplyOfficialAneelPreset = () => {
    setTariffRaw(String(OFFICIAL_TARIFF_REFERENCE.tariffPerKwh));
    setReferenceLocation(OFFICIAL_TARIFF_REFERENCE.referenceLocation);
    setConsumerClass(OFFICIAL_TARIFF_REFERENCE.consumerClass);
    setTariffSource(OFFICIAL_TARIFF_REFERENCE.tariffSource);
    setTariffReferenceDate(OFFICIAL_TARIFF_REFERENCE.tariffReferenceDate);
  };

  const handleExportCurrentJson = () => {
    triggerFileDownload(
      `wattwise-${activeScenarioId}-${getTodayIsoDate()}.json`,
      JSON.stringify(state, null, 2),
      'application/json;charset=utf-8;',
    );
    pushToast('success', 'Backup JSON exportado', 'Dados do cenário salvos no seu computador.');
  };

  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="panel-title">
                Tarifa de Energia, Localidade e Parâmetros ({activeScenarioMeta.shortLabel})
              </h2>
              <Badge tone="emerald">ANEEL B3 Comercial</Badge>
            </div>
            <p className="panel-subtitle">
              A tarifa definida abaixo atualiza todos os cálculos de custo (R$ = kWh × R$/kWh) deste
              cenário
            </p>
          </div>
          <Sliders size={18} className="panel-header-icon" aria-hidden="true" />
        </div>

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="cfg-establishment" className="form-label">
              Nome do estabelecimento
            </label>
            <input
              id="cfg-establishment"
              type="text"
              className={`form-input ${errors.establishmentName ? 'form-input--error' : ''}`}
              value={establishmentName}
              onChange={(e) => {
                setEstablishmentName(e.target.value);
                if (errors.establishmentName) {
                  setErrors((prev) => ({ ...prev, establishmentName: undefined }));
                }
              }}
              maxLength={80}
              placeholder="Ex.: Cafeteria Grão & Vapor"
              disabled={!canEditSettings}
            />
            {errors.establishmentName && (
              <span className="form-error">{errors.establishmentName}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <label htmlFor="cfg-tariff" className="form-label">
                  Tarifa de energia (R$ / kWh)
                </label>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={handleApplyOfficialAneelPreset}
                  title="Aplicar referência homologada ANEEL Enel SP B3"
                >
                  Restaurar Ref. ANEEL (R$ 0,79)
                </button>
              </div>
              <input
                id="cfg-tariff"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={50}
                step="0.01"
                className={`form-input tabular-nums ${errors.tariffPerKwh ? 'form-input--error' : ''}`}
                value={tariffRaw}
                onChange={(e) => {
                  setTariffRaw(e.target.value);
                  if (errors.tariffPerKwh) {
                    setErrors((prev) => ({ ...prev, tariffPerKwh: undefined }));
                  }
                }}
                disabled={!canEditSettings}
              />
              <span className="form-hint">
                Fórmula aplicada: Custo estimado (R$) = Consumo (kWh) × Tarifa (R$/kWh).
              </span>
              {errors.tariffPerKwh && <span className="form-error">{errors.tariffPerKwh}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="cfg-threshold" className="form-label">
                Limite percentual para alertas de anomalia (%)
              </label>
              <input
                id="cfg-threshold"
                type="number"
                inputMode="decimal"
                min={5}
                max={200}
                step={1}
                className={`form-input tabular-nums ${
                  errors.anomalyThresholdPercent ? 'form-input--error' : ''
                }`}
                value={thresholdRaw}
                onChange={(e) => {
                  setThresholdRaw(e.target.value);
                  if (errors.anomalyThresholdPercent) {
                    setErrors((prev) => ({ ...prev, anomalyThresholdPercent: undefined }));
                  }
                }}
                disabled={!canEditSettings}
              />
              <input
                type="range"
                min={5}
                max={80}
                step={1}
                className="range-slider"
                value={Math.min(80, Math.max(5, Number(thresholdRaw) || 20))}
                onChange={(e) => {
                  setThresholdRaw(e.target.value);
                  if (errors.anomalyThresholdPercent) {
                    setErrors((prev) => ({ ...prev, anomalyThresholdPercent: undefined }));
                  }
                }}
                disabled={!canEditSettings}
                aria-label="Ajustar limite percentual de alerta"
              />
              {errors.anomalyThresholdPercent && (
                <span className="form-error">{errors.anomalyThresholdPercent}</span>
              )}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="cfg-location" className="form-label">
                Localidade e concessionária de referência
              </label>
              <input
                id="cfg-location"
                type="text"
                className="form-input"
                value={referenceLocation}
                onChange={(e) => setReferenceLocation(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="form-field">
              <label htmlFor="cfg-class" className="form-label">
                Classe de consumo considerada
              </label>
              <input
                id="cfg-class"
                type="text"
                className="form-input"
                value={consumerClass}
                onChange={(e) => setConsumerClass(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="cfg-source" className="form-label">
                Fonte oficial da tarifa
              </label>
              <input
                id="cfg-source"
                type="text"
                className="form-input"
                value={tariffSource}
                onChange={(e) => setTariffSource(e.target.value)}
                maxLength={160}
              />
            </div>

            <div className="form-field">
              <label htmlFor="cfg-ref-date" className="form-label">
                Data / Vigência de referência
              </label>
              <input
                id="cfg-ref-date"
                type="text"
                className="form-input"
                value={tariffReferenceDate}
                onChange={(e) => setTariffReferenceDate(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          {/* Nota Metodológica Obrigatória (Requisito 4) */}
          <div className="status-box status-box--info">
            <div className="status-box-icon">
              <Info size={18} />
            </div>
            <div>
              <h3 className="status-box-title">
                O que está e o que não está incluído na tarifa de referência
              </h3>
              <p className="status-box-text">
                {state.settings.tariffTaxNote ?? OFFICIAL_TARIFF_REFERENCE.tariffTaxNote}
              </p>
              <p className="status-box-text" style={{ marginTop: 6 }}>
                <strong>Nota importante:</strong> As estimativas financeiras apresentadas no
                WattWise são proporcionais ao consumo (kWh × R$/kWh) e <strong>não</strong> devem
                ser interpretadas como o valor exato de uma fatura fiscal da concessionária.
              </p>
            </div>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Anomalias detectadas com este limite</span>
              <strong className="tabular-nums">
                {livePreview.hasEnoughDataForAnomalies
                  ? `${livePreview.anomalies.length} anomalia(s)`
                  : 'Histórico insuficiente (< 4 dias)'}
              </strong>
            </div>
            <div className="settings-preview-item">
              <span>Custo mensal estimado com esta tarifa</span>
              <strong className="tabular-nums text-emerald">
                {livePreview.estimatedMonthlyCostBrl !== null
                  ? formatCurrencyBRL(livePreview.estimatedMonthlyCostBrl)
                  : '—'}
              </strong>
            </div>
          </div>

          <div className="form-footer-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!hasChanges || !canEditSettings}
            >
              <Check size={16} />
              <span>Salvar configurações do cenário</span>
            </button>
          </div>
        </form>
      </section>

      <div className="view-stack">
        {/* Preferências Visuais (Tema Claro e Tema Escuro) */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Preferências Visuais (Tema Claro &amp; Escuro)</h2>
              <p className="panel-subtitle">
                Sua escolha é persistida automaticamente no navegador
              </p>
            </div>
            {theme === 'light' ? (
              <Sun size={18} className="panel-header-icon" />
            ) : (
              <Moon size={18} className="panel-header-icon" />
            )}
          </div>

          <div className="status-toggle-group" role="radiogroup" aria-label="Tema visual">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              className={`status-choice ${theme === 'light' ? 'status-choice--active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={15} />
              <span>Modo Claro Profissional</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              className={`status-choice ${theme === 'dark' ? 'status-choice--active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={15} />
              <span>Modo Escuro (Eco-Tech)</span>
            </button>
          </div>
        </section>

        {/* Gerenciamento do Cenário Demonstrativo Ativo */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                Gerenciamento do Cenário ({activeScenarioMeta.shortLabel})
              </h2>
              <p className="panel-subtitle">
                Alterne entre os 4 cenários ou restaure os dados originais apenas deste cenário
              </p>
            </div>
            <Database size={18} className="panel-header-icon" aria-hidden="true" />
          </div>

          <div className="data-management-stack">
            <div className="form-field">
              <label htmlFor="cfg-scenario-select" className="form-label">
                Cenário demonstrativo ativo
              </label>
              <select
                id="cfg-scenario-select"
                className="form-input"
                value={activeScenarioId}
                onChange={(e) => switchScenario(e.target.value as any)}
              >
                {DEMO_SCENARIO_LIST.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.shortLabel} — {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="data-status-summary">
              <div className="data-status-row">
                <span>Cenário isolado atual</span>
                <strong>{activeScenarioMeta.name}</strong>
              </div>
              <div className="data-status-row">
                <span>Equipamentos cadastrados</span>
                <strong className="tabular-nums">{analysis.totalEquipmentCount}</strong>
              </div>
              <div className="data-status-row">
                <span>Registros diários</span>
                <strong className="tabular-nums">{analysis.totalRecords}</strong>
              </div>
              <div className="data-status-row">
                <span>Chave LocalStorage</span>
                <code>wattwise_v3_scenario_{activeScenarioId}</code>
              </div>
            </div>

            <div className="action-card">
              <div>
                <h3 className="action-card-title">
                  Restaurar cenário {activeScenarioMeta.shortLabel}
                </h3>
                <p className="action-card-desc">
                  Recarrega os equipamentos comerciais reais, a tarifa de referência ANEEL e os 65
                  dias de histórico simulado apenas para{' '}
                  <strong>{activeScenarioMeta.shortLabel}</strong>, sem apagar ou modificar os
                  outros três cenários.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmRestoreOpen(true)}
              >
                <RotateCcw size={15} />
                <span>Restaurar {activeScenarioMeta.shortLabel}</span>
              </button>
            </div>

            <div className="action-card">
              <div>
                <h3 className="action-card-title">Exportar cenário em JSON</h3>
                <p className="action-card-desc">
                  Baixe uma cópia completa dos equipamentos, leituras e configurações deste cenário
                  em formato JSON aberto.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportCurrentJson}
              >
                <FileJson size={15} />
                <span>Exportar JSON</span>
              </button>
            </div>

            <div className="action-card action-card--danger">
              <div>
                <h3 className="action-card-title">
                  Limpar registros e equipamentos deste cenário
                </h3>
                <p className="action-card-desc">
                  Remove os equipamentos e leituras apenas do cenário{' '}
                  <strong>{activeScenarioMeta.shortLabel}</strong> para testar o comportamento do
                  sistema sem dados.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={() => setConfirmClearOpen(true)}
                disabled={
                  (analysis.totalEquipmentCount === 0 && analysis.totalRecords === 0) ||
                  !canEditSettings
                }
              >
                <Trash2 size={15} />
                <span>Limpar dados de {activeScenarioMeta.shortLabel}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirmRestoreOpen}
        title={`Restaurar cenário ${activeScenarioMeta.shortLabel}?`}
        description={`Esta ação restaurará os equipamentos verificados e os 65 dias simulados apenas do cenário "${activeScenarioMeta.name}". Os demais cenários não serão afetados.`}
        confirmLabel={`Restaurar ${activeScenarioMeta.shortLabel}`}
        variant="primary"
        onConfirm={() => {
          restoreDemoData();
          setConfirmRestoreOpen(false);
        }}
        onCancel={() => setConfirmRestoreOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title={`Limpar dados de ${activeScenarioMeta.shortLabel}?`}
        description={`Todos os equipamentos e registros diários do cenário ${activeScenarioMeta.shortLabel} serão removidos. Os outros três cenários continuarão salvos normalmente.`}
        confirmLabel="Limpar cenário atual"
        variant="danger"
        onConfirm={() => {
          clearOperationalData();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
