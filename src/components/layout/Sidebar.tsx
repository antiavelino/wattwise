import React from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Cpu,
  FileBarChart2,
  FileSpreadsheet,
  FlaskConical,
  Globe,
  LineChart,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { NavSection } from '../../types/energy';
import { formatPower } from '../../utils/formatters';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  description: string;
  icon: React.FC<{ size?: number }>;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Indicadores e análise',
    icon: Activity,
  },
  {
    id: 'equipment',
    label: 'Equipamentos',
    description: 'Potência e status',
    icon: Cpu,
  },
  {
    id: 'records',
    label: 'Registros',
    description: 'Consumo diário (kWh)',
    icon: FileBarChart2,
  },
  {
    id: 'analysis',
    label: 'Análises',
    description: 'Previsão e evidências',
    icon: LineChart,
  },
  {
    id: 'alerts',
    label: 'Alertas',
    description: 'Anomalias e tratativas',
    icon: BellRing,
  },
  {
    id: 'reports',
    label: 'Relatórios',
    description: 'CSV, JSON e PDF',
    icon: FileSpreadsheet,
  },
  {
    id: 'settings',
    label: 'Configurações',
    description: 'Tarifa e alertas',
    icon: Settings,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const {
    theme,
    toggleTheme,
    activeSection,
    setActiveSection,
    setSelectedEquipmentId,
    state,
    analysis,
    workspaceMode,
    activeOrganization,
    userOrganizations,
    switchOrganization,
    activeRole,
    navigatePublic,
    restoreDemoData,
  } = useWattWise();

  const handleSelect = (section: NavSection) => {
    setActiveSection(section);
    setSelectedEquipmentId(null);
    onCloseMobile();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isMobileOpen ? 'sidebar--open' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-top">
          <div
            className="brand"
            onClick={() => navigatePublic('home')}
            style={{ cursor: 'pointer' }}
            title="Ir para a página inicial"
          >
            <img
              src={theme === 'light' ? '/brand/wattwise-logo-light.svg' : '/brand/wattwise-logo-dark.svg'}
              alt="WattWise — Smart Energy Intelligence"
              height="36"
              style={{ height: '36px', width: 'auto' }}
            />
          </div>

          <button
            type="button"
            className="icon-btn sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {workspaceMode === 'saas' && userOrganizations.length > 1 && activeOrganization && (
          <div style={{ marginBottom: 12 }}>
            <select
              className="form-input"
              value={activeOrganization.id}
              onChange={(e) => switchOrganization(e.target.value)}
              aria-label="Alternar organização ativa"
            >
              {userOrganizations.map(({ organization, role }) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const openAnomaliesCount = analysis.anomalies.filter(
              (a) => a.status !== 'resolved',
            ).length;

            const badgeCount =
              (item.id === 'dashboard' || item.id === 'alerts') && openAnomaliesCount > 0
                ? openAnomaliesCount
                : item.id === 'equipment'
                  ? analysis.activeEquipmentCount
                  : item.id === 'records'
                    ? analysis.totalRecords
                    : null;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-item-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <span className="nav-item-copy">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-desc">{item.description}</span>
                </span>
                {badgeCount !== null && (
                  <span
                    className={`nav-item-pill ${
                      (item.id === 'dashboard' || item.id === 'alerts') && openAnomaliesCount > 0
                        ? 'nav-item-pill--alert'
                        : ''
                    }`}
                  >
                    {(item.id === 'dashboard' || item.id === 'alerts') &&
                      openAnomaliesCount > 0 && <AlertTriangle size={11} aria-hidden="true" />}
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="establishment-card">
            <div className="establishment-header">
              <span className="establishment-label">
                {workspaceMode === 'saas'
                  ? `PERFIL: ${activeRole.toUpperCase()}`
                  : 'Modo Demonstração'}
              </span>
              {analysis.hasDemoData && (
                <span className="demo-mini-tag" title="Contém dados simulados para demonstração">
                  <FlaskConical size={11} aria-hidden="true" />
                  Demo
                </span>
              )}
            </div>
            <p className="establishment-name" title={state.settings.establishmentName}>
              {state.settings.establishmentName}
            </p>
            <div className="establishment-meta">
              <span>Tarifa: R$ {state.settings.tariffPerKwh.toFixed(2).replace('.', ',')}/kWh</span>
              <span>Carga ativa: {formatPower(analysis.activeInstalledPowerWatts)}</span>
            </div>
          </div>

          <div className="sidebar-quick-links">
            <button
              type="button"
              className="text-action-btn"
              style={{ justifyContent: 'center' }}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              aria-label="Alternar tema visual"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
            </button>

            <button
              type="button"
              className="text-action-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => navigatePublic('home')}
            >
              <Globe size={13} />
              <span>Início</span>
            </button>

            <button
              type="button"
              className="text-action-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={restoreDemoData}
              title="Restaurar dados originais da demonstração"
            >
              <RotateCcw size={13} />
              <span>Restaurar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
