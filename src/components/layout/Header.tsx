import React from 'react';
import { Database, Menu, Moon, Plus, SlidersHorizontal, Sun } from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { NavSection, PeriodFilter } from '../../types/energy';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onQuickAddRecord: () => void;
  onQuickAddEquipment: () => void;
  onOpenMigrationModal: () => void;
}

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Visão Geral de Energia',
    subtitle: 'Monitoramento diário, detecção local de anomalias, custos e impacto ambiental',
  },
  equipment: {
    title: 'Inventário de Equipamentos',
    subtitle: 'Gerencie cargas instaladas, categorias, consumo estimado e potência nominal ativa',
  },
  records: {
    title: 'Registros de Consumo',
    subtitle: 'Histórico diário e leituras cumulativas utilizados pelo motor de análise e previsão',
  },
  analysis: {
    title: 'Motor de Inteligência Energética',
    subtitle: 'Fórmulas físicas, regressão linear, confiança da previsão e recomendações com evidência',
  },
  alerts: {
    title: 'Central de Alertas e Anomalias',
    subtitle: 'Gerencie desvios estatísticos com reconhecimento e resolução operacional',
  },
  reports: {
    title: 'Relatórios Executivos e Exportação',
    subtitle: 'Comparativo de períodos e exportação estruturada em CSV, JSON e impressão PDF',
  },
  organization: {
    title: 'Gestão Multi-Tenant da Organização',
    subtitle: 'Identificação da unidade, alternância de ambientes e trilha de auditoria (Audit Logs)',
  },
  team: {
    title: 'Equipe e Controle de Acesso (RBAC)',
    subtitle: 'Membros, convites e permissões por papel (Owner, Admin, Operator e Viewer)',
  },
  settings: {
    title: 'Configurações do Ambiente',
    subtitle: 'Defina estabelecimento, tarifa de energia, sensibilidade de alertas e dados locais',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onQuickAddRecord,
  onQuickAddEquipment,
  onOpenMigrationModal,
}) => {
  const {
    theme,
    toggleTheme,
    activeSection,
    setActiveSection,
    state,
    periodFilter,
    setPeriodFilter,
    workspaceMode,
    legacyMigrationPreview,
    activeRole,
  } = useWattWise();

  const meta = SECTION_META[activeSection];
  const canMutate = activeRole !== 'viewer';

  return (
    <header className="topbar no-print">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu de navegação"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-headings">
          <h1 className="topbar-title">{meta.title}</h1>
          <p className="topbar-subtitle">{meta.subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          aria-label="Alternar tema visual"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          <span className="btn-sm-hide-label">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>

        {workspaceMode === 'saas' &&
          legacyMigrationPreview.hasLegacyData &&
          !legacyMigrationPreview.alreadyMigratedToCurrentOrg &&
          canMutate && (
            <button
              type="button"
              className="btn btn-secondary btn-sm-hide-label"
              onClick={onOpenMigrationModal}
              title="Importar dados detectados no LocalStorage deste navegador"
            >
              <Database size={15} />
              <span>Importar dados locais</span>
            </button>
          )}

        {(activeSection === 'dashboard' || activeSection === 'analysis') && (
          <select
            className="form-input form-input--compact btn-sm-hide-label"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            aria-label="Período de análise"
          >
            <option value="all">Período: Todo o histórico</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        )}

        {activeSection === 'dashboard' && (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm-hide-label"
              onClick={() => setActiveSection('settings')}
              title={`Limite atual de anomalia: ${state.settings.anomalyThresholdPercent}%`}
            >
              <SlidersHorizontal size={16} />
              <span>Limite {state.settings.anomalyThresholdPercent}%</span>
            </button>
            {canMutate && (
              <button type="button" className="btn btn-primary" onClick={onQuickAddRecord}>
                <Plus size={16} />
                <span>Novo registro</span>
              </button>
            )}
          </>
        )}

        {activeSection === 'equipment' && canMutate && (
          <button type="button" className="btn btn-primary" onClick={onQuickAddEquipment}>
            <Plus size={16} />
            <span>Novo equipamento</span>
          </button>
        )}

        {activeSection === 'records' && canMutate && (
          <button type="button" className="btn btn-primary" onClick={onQuickAddRecord}>
            <Plus size={16} />
            <span>Registrar consumo</span>
          </button>
        )}
      </div>
    </header>
  );
};
