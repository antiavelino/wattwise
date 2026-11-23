import React, { useState } from 'react';
import { Check, Database, Download, ShieldCheck } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { STORAGE_KEY as LEGACY_STORAGE_KEY } from '../../storage/localStorage';
import {
  formatFullDate,
  formatKwh,
  formatWatts,
  getTodayIsoDate,
  triggerFileDownload,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface LegacyMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegacyMigrationModal: React.FC<LegacyMigrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { legacyMigrationPreview, activeOrganization, migrateLegacyData, pushToast } =
    useWattWise();

  const [includeDemo, setIncludeDemo] = useState(true);

  const handleExportLegacyJson = () => {
    const raw =
      typeof window !== 'undefined' ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null;
    if (!raw) return;
    triggerFileDownload(
      `wattwise-backup-localstorage-${getTodayIsoDate()}.json`,
      raw,
      'application/json;charset=utf-8;',
    );
    pushToast('success', 'Backup JSON exportado', 'Cópia local salva no seu dispositivo.');
  };

  const handleConfirmMigration = () => {
    migrateLegacyData({ includeSimulatedDemoItems: includeDemo });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Importar Dados do Navegador (LocalStorage)"
      subtitle={`Migração idempotente e segura para a organização "${activeOrganization?.name ?? 'Ativa'}"`}
      onClose={onClose}
      maxWidth={620}
    >
      <div className="form-stack">
        <div className="status-box status-box--info">
          <Database size={18} className="status-box-icon" />
          <div>
            <h3 className="status-box-title">
              Encontramos dados salvos anteriormente neste navegador
            </h3>
            <p className="status-box-text">
              Origem detectada: <strong>{legacyMigrationPreview.establishmentName}</strong>. A
              importação evita duplicidades automaticamente e mantém uma cópia de segurança em{' '}
              <code>wattwise_state_v1_backup</code>.
            </p>
          </div>
        </div>

        <div className="settings-preview-card">
          <div className="settings-preview-item">
            <span>Equipamentos encontrados</span>
            <strong className="tabular-nums">
              {legacyMigrationPreview.equipmentCount} total (
              {legacyMigrationPreview.realEquipmentCount} próprios ·{' '}
              {legacyMigrationPreview.demoEquipmentCount} demo)
            </strong>
          </div>
          <div className="settings-preview-item">
            <span>Registros de consumo</span>
            <strong className="tabular-nums">
              {legacyMigrationPreview.recordsCount} total (
              {legacyMigrationPreview.realRecordsCount} próprios ·{' '}
              {legacyMigrationPreview.demoRecordsCount} demo)
            </strong>
          </div>
        </div>

        {legacyMigrationPreview.sampleEquipment.length > 0 && (
          <div>
            <span className="form-label">Prévia de equipamentos (primeiros 5):</span>
            <ul className="top-consumers-list" style={{ marginTop: 6 }}>
              {legacyMigrationPreview.sampleEquipment.map((eq) => (
                <li key={eq.id} className="top-consumer-row">
                  <div className="top-consumer-info">
                    <span className="top-consumer-name">
                      {eq.name} {eq.isDemo && <Badge tone="demo">Demo</Badge>}
                    </span>
                    <span className="top-consumer-cat">{eq.category}</span>
                  </div>
                  <strong className="top-consumer-power tabular-nums">
                    {formatWatts(eq.powerWatts)}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {legacyMigrationPreview.sampleRecords.length > 0 && (
          <div>
            <span className="form-label">Prévia de registros recentes (últimos 5):</span>
            <ul className="top-consumers-list" style={{ marginTop: 6 }}>
              {legacyMigrationPreview.sampleRecords.map((rec) => (
                <li key={rec.id} className="top-consumer-row">
                  <span className="tabular-nums">
                    {formatFullDate(rec.date)} {rec.isDemo && <Badge tone="demo">Simulado</Badge>}
                  </span>
                  <strong className="tabular-nums text-emerald">
                    {formatKwh(rec.consumptionKwh)}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeDemo}
            onChange={(e) => setIncludeDemo(e.target.checked)}
          />
          <span>
            Incluir também itens demonstrativos na importação (serão mantidos com a marcação{' '}
            <code>Simulado / Demo</code> para não se misturarem com medições reais)
          </span>
        </label>

        <div className="status-box status-box--positive">
          <ShieldCheck size={17} className="status-box-icon" />
          <span className="status-box-text">
            Operação idempotente: registros existentes na mesma data ou equipamentos com mesmo nome
            e potência não serão sobrescritos nem duplicados.
          </span>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={handleExportLegacyJson}>
            <Download size={15} />
            <span>Exportar backup JSON</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirmMigration}>
            <Check size={15} />
            <span>Confirmar importação</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
