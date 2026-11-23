import React from 'react';
import { FlaskConical, RotateCcw, Settings2 } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';

export const DemoBanner: React.FC = () => {
  const { analysis, workspaceMode, setActiveSection, restoreDemoData } = useWattWise();

  if (!analysis.hasDemoData && workspaceMode !== 'demo') return null;

  return (
    <div className="demo-banner" role="status">
      <div className="demo-banner-main">
        <span className="demo-banner-icon" aria-hidden="true">
          <FlaskConical size={16} />
        </span>
        <p className="demo-banner-text">
          <strong>Modo Demonstração (Dados Simulados):</strong>{' '}
          {analysis.demoRecordsCount > 0 || analysis.demoEquipmentCount > 0 ? (
            <>
              exibindo {analysis.demoRecordsCount} registro(s) e {analysis.demoEquipmentCount}{' '}
              equipamento(s) fictícios para demonstração — totalmente isolados de contas reais.
            </>
          ) : (
            <>ambiente demonstrativo pronto para experimentação sem necessidade de login.</>
          )}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {workspaceMode === 'demo' && (
          <button
            type="button"
            className="demo-banner-action"
            onClick={restoreDemoData}
            title="Restaurar o conjunto original de 8 equipamentos e 16 dias simulados"
          >
            <RotateCcw size={14} />
            <span>Restaurar Demo</span>
          </button>
        )}
        <button
          type="button"
          className="demo-banner-action"
          onClick={() => setActiveSection('settings')}
        >
          <Settings2 size={14} />
          <span>Gerenciar dados</span>
        </button>
      </div>
    </div>
  );
};
