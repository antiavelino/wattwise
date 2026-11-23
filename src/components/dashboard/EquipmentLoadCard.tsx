import React from 'react';
import { ArrowRight, Cpu } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { formatPercent, formatPower, formatWatts } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';

interface EquipmentLoadCardProps {
  onAddEquipment: () => void;
}

export const EquipmentLoadCard: React.FC<EquipmentLoadCardProps> = ({ onAddEquipment }) => {
  const { analysis, setActiveSection } = useWattWise();

  return (
    <section className="panel" aria-label="Distribuição de potência ativa">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Distribuição de Carga Ativa</h2>
          <p className="panel-subtitle">
            Participação por categoria na potência nominal instalada ({formatPower(analysis.activeInstalledPowerWatts)})
          </p>
        </div>

        <button
          type="button"
          className="text-action-btn"
          onClick={() => setActiveSection('equipment')}
        >
          <span>Gerenciar</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {analysis.activeEquipmentCount === 0 ? (
        <EmptyState
          icon={<Cpu size={22} />}
          title="Nenhum equipamento ativo"
          description="Cadastre ou ative equipamentos para visualizar quais categorias concentram maior potência instalada."
          actionLabel="Cadastrar equipamento"
          onAction={onAddEquipment}
          compact
        />
      ) : (
        <div className="load-breakdown-grid">
          <div className="load-categories">
            {analysis.categoryLoads.map((cat) => (
              <div key={cat.category} className="load-bar-row">
                <div className="load-bar-meta">
                  <span className="load-bar-name">
                    {cat.category}{' '}
                    <span className="load-bar-count">({cat.activeCount})</span>
                  </span>
                  <span className="load-bar-value tabular-nums">
                    {formatPower(cat.powerWatts)} · {formatPercent(cat.percentage)}
                  </span>
                </div>
                <div className="load-bar-track" aria-hidden="true">
                  <div
                    className="load-bar-fill"
                    style={{ width: `${Math.max(4, Math.min(100, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="top-consumers">
            <h3 className="top-consumers-title">Maiores potências ativas</h3>
            <ul className="top-consumers-list">
              {analysis.topActiveEquipment.map((eq) => (
                <li key={eq.id} className="top-consumer-row">
                  <div className="top-consumer-info">
                    <span className="top-consumer-name">{eq.name}</span>
                    <span className="top-consumer-cat">{eq.category}</span>
                  </div>
                  <strong className="top-consumer-power tabular-nums">
                    {formatWatts(eq.powerWatts)}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};
