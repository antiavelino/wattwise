import React from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpen,
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
import { SECTION_TO_PATH, useWattWise } from '../../context/WattWiseContext';
import { DEMO_SCENARIO_LIST } from '../../data/demoData';
import { DemoScenarioId, NavSection } from '../../types/energy';
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
    description: 'Painel geral (/dashboard)',
    icon: Activity,
  },
  {
    id: 'demos',
    label: 'Demonstrações',
    description: '4 cenários (/demonstracoes)',
    icon: FlaskConical,
  },
  {
    id: 'equipment',
    label: 'Equipamentos',
    description: 'Fichas e potências (/equipamentos)',
    icon: Cpu,
  },
  {
    id: 'records',
    label: 'Registros',
    description: 'Histórico diário (/registros)',
    icon: FileBarChart2,
  },
  {
    id: 'analysis',
    label: 'Análises',
    description: 'Mensal e projeção (/analises)',
    icon: LineChart,
  },
  {
    id: 'alerts',
    label: 'Alertas',
    description: 'Diagnóstico e ações (/alertas)',
    icon: BellRing,
  },
  {
    id: 'reports',
    label: 'Relatórios',
    description: 'CSV, JSON e PDF (/relatorios)',
    icon: FileSpreadsheet,
  },
  {
    id: 'settings',
    label: 'Configurações',
    description: 'Tarifa ANEEL e tema (/configuracoes)',
    icon: Settings,
  },
  {
    id: 'about',
    label: 'Guia & Fórmulas',
    description: 'Explicação técnica (/sobre)',
    icon: BookOpen,
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
    activeScenarioId,
    activeScenarioMeta,
    switchScenario,
    navigatePublic,
    restoreDemoData,
  } = useWattWise();

  const handleSelect = (section: NavSection) => {
    setActiveSection(section);
    setSelectedEquipmentId(null);
    onCloseMobile();
  };

  const openAlertsCount = analysis.systemAlerts.filter((a) => a.status !== 'resolved').length;

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
            title="Ir para a página inicial (/)"
          >
            <img
              src={
                theme === 'light'
                  ? '/brand/wattwise-logo-light.svg'
                  : '/brand/wattwise-logo-dark.svg'
              }
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

        {/* Seletor Rápido dos 4 Cenários Demonstrativos */}
        <div className="sidebar-scenario-switcher">
          <label htmlFor="sidebar-scenario-select" className="sidebar-scenario-label">
            Cenário Demonstrativo Ativo
          </label>
          <select
            id="sidebar-scenario-select"
            className="form-input form-input--sm"
            value={activeScenarioId}
            onChange={(e) => switchScenario(e.target.value as DemoScenarioId)}
            aria-label="Selecionar cenário demonstrativo"
          >
            {DEMO_SCENARIO_LIST.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.shortLabel} ({sc.segment.split('&')[0].trim()})
              </option>
            ))}
          </select>
        </div>

        <nav className="sidebar-nav" aria-label="Páginas do sistema">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const href = SECTION_TO_PATH[item.id];

            const badgeCount =
              item.id === 'alerts' && openAlertsCount > 0
                ? openAlertsCount
                : item.id === 'demos'
                  ? 4
                  : item.id === 'equipment'
                    ? analysis.activeEquipmentCount
                    : item.id === 'records'
                      ? analysis.totalRecords
                      : null;

            return (
              <a
                key={item.id}
                href={href}
                className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(item.id);
                }}
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
                      item.id === 'alerts' && openAlertsCount > 0 ? 'nav-item-pill--alert' : ''
                    }`}
                  >
                    {item.id === 'alerts' && openAlertsCount > 0 && (
                      <AlertTriangle size={11} aria-hidden="true" />
                    )}
                    {badgeCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="establishment-card">
            <div className="establishment-header">
              <span className="establishment-label">
                CENÁRIO: {activeScenarioMeta.shortLabel.toUpperCase()}
              </span>
              <span className="demo-mini-tag" title="Histórico simulado coerente com equipamentos reais">
                <FlaskConical size={11} aria-hidden="true" />
                Simulado
              </span>
            </div>
            <p className="establishment-name" title={state.settings.establishmentName}>
              {state.settings.establishmentName}
            </p>
            <div className="establishment-meta">
              <span>Tarifa: R$ {state.settings.tariffPerKwh.toFixed(2).replace('.', ',')}/kWh</span>
              <span>Potência ativa: {formatPower(analysis.activeInstalledPowerWatts)}</span>
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
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>

            <button
              type="button"
              className="text-action-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => navigatePublic('home')}
              title="Voltar para a página inicial (/)"
            >
              <Globe size={13} />
              <span>Início</span>
            </button>

            <button
              type="button"
              className="text-action-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={restoreDemoData}
              title={`Restaurar somente o cenário ${activeScenarioMeta.shortLabel}`}
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
