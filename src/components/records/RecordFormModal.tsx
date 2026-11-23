import React, { useEffect, useMemo, useState } from 'react';
import { useWattWise } from '../../context/WattWiseContext';
import { calculateCumulativeMeterDelta } from '../../engine/analysisEngine';
import { ConsumptionRecord, MeasurementType, ReadingSource } from '../../types/energy';
import { formatCurrencyBRL, formatKwh, getTodayIsoDate } from '../../utils/formatters';
import {
  parseNumericInput,
  RecordValidationErrors,
  validateRecordInput,
} from '../../utils/validators';
import { Modal } from '../common/Modal';

interface RecordFormModalProps {
  isOpen: boolean;
  editingRecord: ConsumptionRecord | null;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    consumptionKwh: number;
    equipmentId?: string;
    measurementType?: MeasurementType;
    source?: ReadingSource;
    meterPreviousKwh?: number;
    meterCurrentKwh?: number;
    note?: string;
  }) => void;
}

type EntryMode = 'direct' | 'cumulative_meter';

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  editingRecord,
  onClose,
  onSubmit,
}) => {
  const { state } = useWattWise();
  const [entryMode, setEntryMode] = useState<EntryMode>('direct');
  const [date, setDate] = useState(getTodayIsoDate());
  const [consumptionKwhRaw, setConsumptionKwhRaw] = useState('');
  const [meterPrevRaw, setMeterPrevRaw] = useState('');
  const [meterCurrRaw, setMeterCurrRaw] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('measured');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<RecordValidationErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setEntryMode(editingRecord.source === 'meter_cumulative' ? 'cumulative_meter' : 'direct');
      setDate(editingRecord.date);
      setConsumptionKwhRaw(String(editingRecord.consumptionKwh));
      setMeterPrevRaw(
        editingRecord.meterPreviousKwh !== undefined ? String(editingRecord.meterPreviousKwh) : '',
      );
      setMeterCurrRaw(
        editingRecord.meterCurrentKwh !== undefined ? String(editingRecord.meterCurrentKwh) : '',
      );
      setEquipmentId(editingRecord.equipmentId ?? '');
      setMeasurementType(editingRecord.measurementType ?? 'measured');
      setNote(editingRecord.note ?? '');
    } else {
      setEntryMode('direct');
      setDate(getTodayIsoDate());
      setConsumptionKwhRaw('');
      setMeterPrevRaw('');
      setMeterCurrRaw('');
      setEquipmentId('');
      setMeasurementType('measured');
      setNote('');
    }
    setErrors({});
  }, [isOpen, editingRecord]);

  const meterDeltaResult = useMemo(() => {
    if (entryMode !== 'cumulative_meter') return null;
    const prev = parseNumericInput(meterPrevRaw);
    const curr = parseNumericInput(meterCurrRaw);
    return calculateCumulativeMeterDelta(prev, curr);
  }, [entryMode, meterPrevRaw, meterCurrRaw]);

  const effectiveKwhRaw =
    entryMode === 'cumulative_meter' && meterDeltaResult?.isValid
      ? String(meterDeltaResult.deltaKwh)
      : consumptionKwhRaw;

  const estimatedCostPreview = useMemo(() => {
    const parsed = parseNumericInput(effectiveKwhRaw);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed * state.settings.tariffPerKwh;
  }, [effectiveKwhRaw, state.settings.tariffPerKwh]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (entryMode === 'cumulative_meter') {
      const prev = parseNumericInput(meterPrevRaw);
      const curr = parseNumericInput(meterCurrRaw);
      const delta = calculateCumulativeMeterDelta(prev, curr);
      if (!delta.isValid) {
        setErrors({
          meterReadings: delta.error ?? 'Informe leituras válidas do medidor.',
        });
        return;
      }
    }

    const validation = validateRecordInput(
      {
        date,
        consumptionKwhRaw: effectiveKwhRaw,
        note,
        equipmentId: equipmentId || undefined,
      },
      state.records,
      editingRecord?.id,
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const prevNum = entryMode === 'cumulative_meter' ? parseNumericInput(meterPrevRaw) : undefined;
    const currNum = entryMode === 'cumulative_meter' ? parseNumericInput(meterCurrRaw) : undefined;

    onSubmit({
      date,
      consumptionKwh: validation.parsedKwh,
      equipmentId: equipmentId || undefined,
      measurementType,
      source: entryMode === 'cumulative_meter' ? 'meter_cumulative' : 'manual',
      meterPreviousKwh: prevNum,
      meterCurrentKwh: currNum,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={editingRecord ? 'Editar registro diário' : 'Registrar consumo diário'}
      subtitle="Os indicadores do dashboard, previsão mensal e detecção de anomalias são atualizados automaticamente."
      onClose={onClose}
      maxWidth={560}
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="segmented-control" role="group" aria-label="Modo de entrada da medição">
          <button
            type="button"
            className={`segmented-btn ${entryMode === 'direct' ? 'segmented-btn--active' : ''}`}
            onClick={() => {
              setEntryMode('direct');
              setErrors({});
            }}
          >
            Consumo Direto do Dia (kWh)
          </button>
          <button
            type="button"
            className={`segmented-btn ${
              entryMode === 'cumulative_meter' ? 'segmented-btn--active' : ''
            }`}
            onClick={() => {
              setEntryMode('cumulative_meter');
              setErrors({});
            }}
          >
            Leitura Cumulativa de Medidor
          </button>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="rec-date" className="form-label">
              Data da medição
            </label>
            <input
              id="rec-date"
              type="date"
              className={`form-input tabular-nums ${errors.date ? 'form-input--error' : ''}`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
            />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>

          {entryMode === 'direct' ? (
            <div className="form-field">
              <label htmlFor="rec-kwh" className="form-label">
                Consumo do dia (kWh)
              </label>
              <input
                id="rec-kwh"
                type="number"
                inputMode="decimal"
                min={0}
                max={100000}
                step="0.1"
                className={`form-input tabular-nums ${
                  errors.consumptionKwh ? 'form-input--error' : ''
                }`}
                value={consumptionKwhRaw}
                onChange={(e) => {
                  setConsumptionKwhRaw(e.target.value);
                  if (errors.consumptionKwh) {
                    setErrors((prev) => ({ ...prev, consumptionKwh: undefined }));
                  }
                }}
                placeholder="Ex.: 52,4"
                autoFocus
              />
              {errors.consumptionKwh && (
                <span className="form-error">{errors.consumptionKwh}</span>
              )}
            </div>
          ) : (
            <div className="form-field">
              <span className="form-label">Consumo calculado (Atual − Anterior)</span>
              <div className="form-input tabular-nums" style={{ opacity: 0.9 }}>
                {meterDeltaResult?.isValid
                  ? formatKwh(meterDeltaResult.deltaKwh, 2)
                  : 'Informe as duas leituras abaixo'}
              </div>
            </div>
          )}
        </div>

        {entryMode === 'cumulative_meter' && (
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="rec-meter-prev" className="form-label">
                Leitura anterior do relógio (kWh)
              </label>
              <input
                id="rec-meter-prev"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                className="form-input tabular-nums"
                value={meterPrevRaw}
                onChange={(e) => {
                  setMeterPrevRaw(e.target.value);
                  setErrors((prev) => ({ ...prev, meterReadings: undefined }));
                }}
                placeholder="Ex.: 14520,0"
              />
            </div>

            <div className="form-field">
              <label htmlFor="rec-meter-curr" className="form-label">
                Leitura atual do relógio (kWh)
              </label>
              <input
                id="rec-meter-curr"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                className="form-input tabular-nums"
                value={meterCurrRaw}
                onChange={(e) => {
                  setMeterCurrRaw(e.target.value);
                  setErrors((prev) => ({ ...prev, meterReadings: undefined }));
                }}
                placeholder="Ex.: 14572,4"
              />
            </div>
            {errors.meterReadings && (
              <span className="form-error" style={{ gridColumn: '1 / -1' }}>
                {errors.meterReadings}
              </span>
            )}
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="rec-eq" className="form-label">
              Escopo / Equipamento (opcional)
            </label>
            <select
              id="rec-eq"
              className="form-input"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
            >
              <option value="">Medição Geral do Estabelecimento</option>
              {state.equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="rec-mtype" className="form-label">
              Classificação da medição
            </label>
            <select
              id="rec-mtype"
              className="form-input"
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value as MeasurementType)}
            >
              <option value="measured">Medido (Leitura real)</option>
              <option value="estimated">Estimado (Cálculo operacional)</option>
            </select>
          </div>
        </div>

        {estimatedCostPreview !== null && (
          <div className="inline-preview-box">
            <span>
              Custo diário estimado com tarifa atual ({formatCurrencyBRL(state.settings.tariffPerKwh)}
              /kWh):
            </span>
            <strong className="tabular-nums text-emerald">
              {formatCurrencyBRL(estimatedCostPreview)}
            </strong>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="rec-note" className="form-label">
            Observação (opcional)
          </label>
          <input
            id="rec-note"
            type="text"
            className={`form-input ${errors.note ? 'form-input--error' : ''}`}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
            }}
            placeholder="Ex.: Dia de calor intenso, manutenção ou expediente estendido"
            maxLength={160}
          />
          {errors.note && <span className="form-error">{errors.note}</span>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {editingRecord ? 'Salvar alterações' : 'Registrar consumo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
