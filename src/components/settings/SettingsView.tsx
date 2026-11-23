import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  FileJson,
  RotateCcw,
  Sliders,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
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
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsViewProps {
  onOpenMigrationModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenMigrationModal }) => {
  const {
    state,
    analysis,
    updateSettings,
    restoreDemoData,
    clearOperationalData,
    legacyMigrationPreview,
    workspaceMode,
    activeRole,
    pushToast,
  } = useWattWise();

  const [establishmentName, setEstablishmentName] = useState(state.settings.establishmentName);
  const [tariffRaw, setTariffRaw] = useState(String(state.settings.tariffPerKwh));
  const [thresholdRaw, setThresholdRaw] = useState(String(state.settings.anomalyThresholdPercent));
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const canEditSettings = activeRole === 'owner' || activeRole === 'admin';

  useEffect(() => {
    setEstablishmentName(state.settings.establishmentName);
    setTariffRaw(String(state.settings.tariffPerKwh));
    setThresholdRaw(String(state.settings.anomalyThresholdPercent));
    setErrors({});
  }, [state.settings]);

  const hasChanges = useMemo(() => {
    const parsedTariff = parseNumericInput(tariffRaw);
    const parsedThreshold = parseNumericInput(thresholdRaw);
    return (
      establishmentName.trim() !== state.settings.establishmentName ||
      parsedTariff !== state.settings.tariffPerKwh ||
      parsedThreshold !== state.settings.anomalyThresholdPercent
    );
  }, [establishmentName, tariffRaw, thresholdRaw, state.settings]);

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
      anomalyThresholdPercent: validation.parsedThreshold,
    });
  };

  const handleExportCurrentJson = () => {
    triggerFileDownload(
      `wattwise-dados-${getTodayIsoDate()}.json`,
      JSON.stringify(state, null, 2),
      'application/json;charset=utf-8;',
    );
    pushToast('success', 'Backup JSON exportado', 'Dados salvos no seu computador.');
  };

  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Parâmetros do Estabelecimento</h2>
            <p className="panel-subtitle">
              Ajuste o nome do local, a tarifa de energia e a sensibilidade do motor local de alertas
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
              placeholder="Ex.: Oficina Central Ltda."
              disabled={!canEditSettings}
            />
            {errors.establishmentName && (
              <span className="form-error">{errors.establishmentName}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="cfg-tariff" className="form-label">
                Tarifa de energia (R$ / kWh)
              </label>
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
                Usada para estimar custo diário, custo mensal e impacto de anomalias.
              </span>
              {errors.tariffPerKwh && <span className="form-error">{errors.tariffPerKwh}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="cfg-threshold" className="form-label">
                Limite percentual para alertas (%)
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
              <span className="form-hint">
                Dispara alerta quando o consumo exceder este percentual sobre a média dos dias
                anteriores.
              </span>
              {errors.anomalyThresholdPercent && (
                <span className="form-error">{errors.anomalyThresholdPercent}</span>
              )}
            </div>
          </div>

          <div className="settings-preview-card">
            <div className="settings-preview-item">
              <span>Anomalias detectadas com este limite</span>
              <strong className="tabular-nums">
                {livePreview.hasEnoughDataForAnomalies
                  ? `${livePreview.anomalies.length} alerta(s)`
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
              <span>Salvar configurações</span>
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Migração, Exportação &amp; Dados Demonstrativos</h2>
            <p className="panel-subtitle">
              Gerencie importação do LocalStorage, backup em JSON e ambiente demonstrativo isolado
            </p>
          </div>
          <Database size={18} className="panel-header-icon" aria-hidden="true" />
        </div>

        <div className="data-management-stack">
          <div className="data-status-summary">
            <div className="data-status-row">
              <span>Equipamentos salvos</span>
              <strong className="tabular-nums">{analysis.totalEquipmentCount}</strong>
            </div>
            <div className="data-status-row">
              <span>Registros de consumo</span>
              <strong className="tabular-nums">{analysis.totalRecords}</strong>
            </div>
            <div className="data-status-row">
              <span>Origem atual</span>
              <strong>
                {analysis.hasDemoData ? 'Contém dados demonstrativos' : 'Dados próprios do usuário'}
              </strong>
            </div>
          </div>

          {workspaceMode === 'saas' && legacyMigrationPreview.hasLegacyData && onOpenMigrationModal && (
            <div className="action-card">
              <div>
                <h3 className="action-card-title">
                  Migrar dados anteriores do navegador (LocalStorage v1)
                </h3>
                <p className="action-card-desc">
                  Detectamos {legacyMigrationPreview.equipmentCount} equipamento(s) e{' '}
                  {legacyMigrationPreview.recordsCount} registro(s) salvos localmente no navegador.
                  Importe-os com segurança e sem duplicidades para esta organização.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenMigrationModal}
              >
                <UploadCloud size={15} />
                <span>Abrir assistente de migração</span>
              </button>
            </div>
          )}

          <div className="action-card">
            <div>
              <h3 className="action-card-title">Exportar dados em JSON</h3>
              <p className="action-card-desc">
                Baixe uma cópia completa dos equipamentos, leituras e configurações atuais em
                formato JSON aberto.
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

          <div className="action-card">
            <div>
              <h3 className="action-card-title">Restaurar dados demonstrativos</h3>
              <p className="action-card-desc">
                Abre o ambiente demonstrativo isolado com o cenário fictício de uma pequena empresa
                (8 equipamentos, 16 dias de consumo e 2 anomalias identificáveis), sem misturar com
                organizações reais.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmRestoreOpen(true)}
            >
              <RotateCcw size={15} />
              <span>Restaurar demonstração</span>
            </button>
          </div>

          <div className="action-card action-card--danger">
            <div>
              <h3 className="action-card-title">Limpar registros e equipamentos</h3>
              <p className="action-card-desc">
                Remove todos os equipamentos e leituras diárias do ambiente atual para iniciar com
                seus dados reais do zero (mantém o nome do estabelecimento, tarifa e limite de
                alerta).
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
              <span>Limpar dados</span>
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmRestoreOpen}
        title="Restaurar dados demonstrativos?"
        description="Esta ação carregará o conjunto demonstrativo padrão (8 equipamentos e 16 dias simulados) no sandbox demonstrativo."
        confirmLabel="Restaurar dados demo"
        variant="primary"
        onConfirm={() => {
          restoreDemoData();
          setConfirmRestoreOpen(false);
        }}
        onCancel={() => setConfirmRestoreOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Limpar todos os equipamentos e registros?"
        description="Todos os equipamentos e registros diários do ambiente atual serão apagados. Você poderá restaurar os dados demonstrativos novamente quando quiser."
        confirmLabel="Limpar tudo"
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
