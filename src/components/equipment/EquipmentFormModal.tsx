import React, { useEffect, useMemo, useState } from 'react';
import { useWattWise } from '../../context/WattWiseContext';
import { calculateEnergyCostBrl, calculateEquipmentEnergyKwh } from '../../engine/analysisEngine';
import {
  EQUIPMENT_CATEGORIES,
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
} from '../../types/energy';
import { formatCurrencyBRL, formatKwh } from '../../utils/formatters';
import {
  EquipmentValidationErrors,
  parseNumericInput,
  validateEquipmentInput,
} from '../../utils/validators';
import { Modal } from '../common/Modal';

interface EquipmentFormModalProps {
  isOpen: boolean;
  editingEquipment: Equipment | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: EquipmentCategory;
    location?: string;
    powerWatts: number;
    quantity?: number;
    dailyUsageHours?: number;
    status: EquipmentStatus;
    notes?: string;
  }) => void;
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  editingEquipment,
  onClose,
  onSubmit,
}) => {
  const { state } = useWattWise();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Climatização');
  const [location, setLocation] = useState('Principal');
  const [powerWattsRaw, setPowerWattsRaw] = useState('');
  const [quantityRaw, setQuantityRaw] = useState('1');
  const [dailyUsageHoursRaw, setDailyUsageHoursRaw] = useState('8');
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<EquipmentValidationErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingEquipment) {
      setName(editingEquipment.name);
      setCategory(editingEquipment.category);
      setLocation(editingEquipment.location ?? 'Principal');
      setPowerWattsRaw(String(editingEquipment.powerWatts));
      setQuantityRaw(String(editingEquipment.quantity ?? 1));
      setDailyUsageHoursRaw(String(editingEquipment.dailyUsageHours ?? 8));
      setStatus(editingEquipment.status);
      setNotes(editingEquipment.notes ?? '');
    } else {
      setName('');
      setCategory('Climatização');
      setLocation('Salão Principal');
      setPowerWattsRaw('');
      setQuantityRaw('1');
      setDailyUsageHoursRaw('8');
      setStatus('active');
      setNotes('');
    }
    setErrors({});
  }, [isOpen, editingEquipment]);

  const liveEstimate = useMemo(() => {
    const w = parseNumericInput(powerWattsRaw);
    const q = parseNumericInput(quantityRaw);
    const h = parseNumericInput(dailyUsageHoursRaw);
    if (!Number.isFinite(w) || w <= 0) return null;
    const safeQ = Number.isFinite(q) && q >= 1 ? Math.round(q) : 1;
    const safeH = Number.isFinite(h) && h >= 0 ? Math.min(24, h) : 8;
    const monthlyKwh = calculateEquipmentEnergyKwh(w, safeH, safeQ, 30);
    const monthlyCost = calculateEnergyCostBrl(monthlyKwh, state.settings.tariffPerKwh);
    return { monthlyKwh, monthlyCost };
  }, [powerWattsRaw, quantityRaw, dailyUsageHoursRaw, state.settings.tariffPerKwh]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateEquipmentInput({
      name,
      category,
      location,
      powerWattsRaw,
      quantityRaw,
      dailyUsageHoursRaw,
      status,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit({
      name: name.trim(),
      category,
      location: location.trim() || 'Principal',
      powerWatts: validation.parsedPowerWatts,
      quantity: validation.parsedQuantity,
      dailyUsageHours: validation.parsedDailyUsageHours,
      status,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={editingEquipment ? 'Editar equipamento' : 'Cadastrar equipamento'}
      subtitle="A potência ativa soma (W × quantidade) e o consumo estimado aplica kWh = (W × horas × qtd) / 1000."
      onClose={onClose}
      maxWidth={560}
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="eq-name" className="form-label">
            Nome do equipamento
          </label>
          <input
            id="eq-name"
            type="text"
            className={`form-input ${errors.name ? 'form-input--error' : ''}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Ex.: Ar-condicionado Split 18.000 BTU"
            maxLength={80}
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="eq-category" className="form-label">
              Categoria
            </label>
            <select
              id="eq-category"
              className={`form-input ${errors.category ? 'form-input--error' : ''}`}
              value={category}
              onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
            >
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <span className="form-error">{errors.category}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="eq-location" className="form-label">
              Localização / Setor
            </label>
            <input
              id="eq-location"
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex.: Cozinha, Salão, Escritório"
              maxLength={60}
            />
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-field">
            <label htmlFor="eq-power" className="form-label">
              Potência unitária (Watts)
            </label>
            <input
              id="eq-power"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000000}
              step={1}
              className={`form-input tabular-nums ${errors.powerWatts ? 'form-input--error' : ''}`}
              value={powerWattsRaw}
              onChange={(e) => {
                setPowerWattsRaw(e.target.value);
                if (errors.powerWatts) setErrors((prev) => ({ ...prev, powerWatts: undefined }));
              }}
              placeholder="Ex.: 1800"
            />
            {errors.powerWatts && <span className="form-error">{errors.powerWatts}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="eq-qty" className="form-label">
              Quantidade
            </label>
            <input
              id="eq-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              step={1}
              className={`form-input tabular-nums ${errors.quantity ? 'form-input--error' : ''}`}
              value={quantityRaw}
              onChange={(e) => setQuantityRaw(e.target.value)}
            />
            {errors.quantity && <span className="form-error">{errors.quantity}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="eq-hours" className="form-label">
              Uso médio (h/dia)
            </label>
            <input
              id="eq-hours"
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step="0.5"
              className={`form-input tabular-nums ${errors.dailyUsageHours ? 'form-input--error' : ''}`}
              value={dailyUsageHoursRaw}
              onChange={(e) => setDailyUsageHoursRaw(e.target.value)}
            />
            {errors.dailyUsageHours && <span className="form-error">{errors.dailyUsageHours}</span>}
          </div>
        </div>

        {liveEstimate && (
          <div className="inline-preview-box">
            <span>Consumo mensal estimado (30 dias):</span>
            <strong className="tabular-nums text-emerald">
              {formatKwh(liveEstimate.monthlyKwh)} ({formatCurrencyBRL(liveEstimate.monthlyCost)}/mês)
            </strong>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="eq-notes" className="form-label">
            Observações técnicas (opcional)
          </label>
          <input
            id="eq-notes"
            type="text"
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Revisão preventiva trimestral ou turno de operação"
            maxLength={140}
          />
        </div>

        <div className="form-field">
          <span className="form-label">Status operacional</span>
          <div className="status-toggle-group" role="radiogroup" aria-label="Status do equipamento">
            <button
              type="button"
              role="radio"
              aria-checked={status === 'active'}
              className={`status-choice ${status === 'active' ? 'status-choice--active' : ''}`}
              onClick={() => setStatus('active')}
            >
              <span className="status-dot status-dot--emerald" />
              <span>Ativo</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={status === 'inactive'}
              className={`status-choice ${status === 'inactive' ? 'status-choice--inactive' : ''}`}
              onClick={() => setStatus('inactive')}
            >
              <span className="status-dot status-dot--slate" />
              <span>Inativo</span>
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {editingEquipment ? 'Salvar alterações' : 'Cadastrar equipamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
