import React from 'react';
import { FlaskConical, Layers, RotateCcw } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { DEMO_SCENARIO_LIST } from '../../data/demoData';

export const DemoBanner: React.FC = () => {
  const {
    analysis,
    state,
    activeSection,
    activeScenarioId,
    activeScenarioMeta,
    switchScenario,
    setActiveSection,
    restoreDemoData,
  } = useWattWise();

  return (
    <div className="demo-banner no-print" role="status">
      <div className="demo-banner-main">
        <span className="demo-banner-icon" aria-hidden="true">
          <FlaskConical size={16} />
        </span>
        <div>
          <p className="demo-banner-text">
            <strong>{state.settings.establishmentName}:</strong>{' '}
            {analysis.totalEquipmentCount} equipamentos reais verificados · {analysis.totalRecords}{' '}
            dias simulados (isolado no LocalStorage).
          </p>
        </div>
      </div>

      <div className="scenario-quickbar-pills" role="group" aria-label="Alternar cenário demonstrativo">
        {DEMO_SCENARIO_LIST.map((sc) => (
          <button
            key={sc.id}
            type="button"
            className={`scenario-pill-btn ${
              sc.id === activeScenarioId ? 'scenario-pill-btn--active' : ''
            }`}
            onClick={() => switchScenario(sc.id)}
            title={`Mudar para o cenário ${sc.shortLabel}`}
          >
            {sc.shortLabel}
          </button>
        ))}

        {activeSection !== 'demos' && (
          <button
            type="button"
            className="demo-banner-action"
            onClick={() => setActiveSection('demos')}
            title="Comparar os 4 cenários demonstrativos"
          >
            <Layers size={13} />
            <span>Comparar</span>
          </button>
        )}

        <button
          type="button"
          className="demo-banner-action"
          onClick={restoreDemoData}
          title={`Restaurar somente os dados originais de ${activeScenarioMeta.shortLabel}`}
        >
          <RotateCcw size={13} />
          <span>Restaurar {activeScenarioMeta.shortLabel}</span>
        </button>
      </div>
    </div>
  );
};
