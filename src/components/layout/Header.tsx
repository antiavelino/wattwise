import React from 'react';
import { Menu, Moon, Plus, SlidersHorizontal, Sun } from 'lucide-react';
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
    title: 'Painel Geral de Energia',
    subtitle: 'WattWise transforma dados de consumo em decisões mais inteligentes',
  },
  demos: {
    title: 'Cenários de Demonstração',
    subtitle: '4 estabelecimentos comerciais isolados com equipamentos reais verificados',
  },
  equipment: {
    title: 'Equipamentos e Especificações Técnicas',
    subtitle: 'Gerencie fabricantes, modelos, potência nominal (W), fator de operação e fontes',
  },
  records: {
    title: 'Registros e Leituras de Consumo',
    subtitle: 'Consumo diário em kWh e cálculo de diferenças em leituras acumuladas de medidor',
  },
  analysis: {
    title: 'Análises Energéticas e Comparativo Mensal',
    subtitle: 'Separação física de grandezas, consolidação mensal, regressão linear e participação',
  },
  alerts: {
    title: 'Alertas e Recomendações Operacionais',
    subtitle: 'Diagnóstico estruturado com motivo, evidência nos dados e ação recomendada',
  },
  reports: {
    title: 'Relatórios Executivos e Exportação',
    subtitle: 'Comparativo de períodos e exportação estruturada em CSV, JSON e impressão PDF',
  },
  about: {
    title: 'Guia do Projeto, Fórmulas e Premissas',
    subtitle: 'Conceitos de potência (W), consumo (kWh), tarifa ANEEL e fator ambiental SIN/MCTI',
  },
  organization: {
    title: 'Gestão da Organização',
    subtitle: 'Identificação da unidade e trilha de auditoria',
  },
  team: {
    title: 'Equipe e Permissões',
    subtitle: 'Membros e controle de acesso',
  },
  settings: {
    title: 'Configurações, Tarifas e Preferências',
    subtitle: 'Defina tarifa energética (R$/kWh), referência ANEEL, tema visual e dados do cenário',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onQuickAddRecord,
  onQuickAddEquipment,
}) => {
  const {
    theme,
    toggleTheme,
    activeSection,
    setActiveSection,
    state,
    periodFilter,
    setPeriodFilter,
    activeRole,
  } = useWattWise();

  const meta = SECTION_META[activeSection] ?? SECTION_META.dashboard;
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
          <span className="btn-sm-hide-label">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>

        {(activeSection === 'dashboard' ||
          activeSection === 'analysis' ||
          activeSection === 'records') && (
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
              title={`Tarifa atual: R$ ${state.settings.tariffPerKwh.toFixed(2).replace('.', ',')}/kWh · Limite: ${state.settings.anomalyThresholdPercent}%`}
            >
              <SlidersHorizontal size={16} />
              <span>R$ {state.settings.tariffPerKwh.toFixed(2).replace('.', ',')}/kWh</span>
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
