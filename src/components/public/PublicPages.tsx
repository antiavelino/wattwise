import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Coffee,
  Cpu,
  Croissant,
  FileSpreadsheet,
  FlaskConical,
  Leaf,
  Moon,
  Scissors,
  ShoppingCart,
  Sun,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  DEMO_SCENARIO_LIST,
  OFFICIAL_EMISSION_REFERENCE,
  OFFICIAL_TARIFF_REFERENCE,
} from '../../data/demoData';
import { DemoScenarioId } from '../../types/energy';
import {
  formatCurrencyBRL,
  formatKwh,
  formatPower,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';

const SCENARIO_ICONS: Record<DemoScenarioId, React.FC<{ size?: number }>> = {
  cafeteria: Coffee,
  mercado: ShoppingCart,
  barbearia: Scissors,
  padaria: Croissant,
};

const FAQ_ITEMS = [
  {
    q: 'Quais são os 4 cenários demonstrativos disponíveis e como eles funcionam?',
    a: 'O WattWise disponibiliza 4 estabelecimentos comerciais independentes: Cafeteria, Minimercado, Barbearia e Padaria. Cada cenário utiliza equipamentos reais do mercado brasileiro (com fabricante, modelo, potência nominal em Watts e link da ficha técnica), além de 65 dias de histórico simulado coerente com a carga instalada.',
  },
  {
    q: 'Como o WattWise diferencia potência instalada (W/kW) de consumo energético (kWh)?',
    a: 'Potência nominal (em W ou kW) é a demanda instantânea dos equipamentos ativos comprovada pelo fabricante. O consumo estimado em kWh aplica a fórmula física: [Potência (W) ÷ 1000] × Horas de uso × Quantidade × Fator de operação (ciclo do termostato/compressor). Já o consumo registrado reflete as leituras diárias ou diferenças acumuladas do medidor.',
  },
  {
    q: 'Qual é a referência tarifária (R$/kWh) utilizada nos cálculos de custo?',
    a: `Adotamos como referência regional documentada a tarifa do Subgrupo B3 Comercial da Enel Distribuição São Paulo homologada pela ANEEL (Resolução Homologatória nº 3.596/2026: TUSD R$ 0,47242 + TE R$ 0,31696 = R$ 0,79/kWh sem tributos variáveis). O usuário pode alterar a tarifa manualmente em Configurações.`,
  },
  {
    q: 'Como a estimativa de impacto ambiental (kg CO₂) é calculada?',
    a: `Utilizamos o fator médio anual oficial do Sistema Interligado Nacional (SIN) publicado pelo MCTI / SIRENE (${OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh.toFixed(4).replace('.', ',')} kg CO₂/kWh — ${OFFICIAL_EMISSION_REFERENCE.emissionFactorYear}). Trata-se de uma estimativa indireta de Escopo 2 proporcional ao consumo elétrico.`,
  },
  {
    q: 'A troca de cenário mistura os dados ou exige login?',
    a: 'Não. Todos os 4 cenários funcionam sem login e são armazenados em chaves independentes no LocalStorage do navegador. Você pode testar cadastros, excluir itens ou restaurar apenas o cenário selecionado sem afetar os demais.',
  },
];

export const PublicPages: React.FC = () => {
  const {
    theme,
    toggleTheme,
    publicPage,
    navigatePublic,
    enterDemoSandbox,
    setActiveSection,
    getScenarioSummary,
  } = useWattWise();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const scenarioSummaries = DEMO_SCENARIO_LIST.map((m) => getScenarioSummary(m.id));

  return (
    <div className="public-shell">
      <header className="public-navbar">
        <div className="public-navbar-inner">
          <button
            type="button"
            className="public-brand-btn"
            onClick={() => navigatePublic('home')}
            aria-label="Página inicial do WattWise"
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
          </button>

          <nav className="public-nav-links" aria-label="Navegação pública">
            <button
              type="button"
              className={`public-nav-link ${publicPage === 'home' ? 'public-nav-link--active' : ''}`}
              onClick={() => navigatePublic('home')}
            >
              Início
            </button>
            <button
              type="button"
              className="public-nav-link"
              onClick={() => setActiveSection('demos')}
            >
              4 Demonstrações
            </button>
            <button
              type="button"
              className="public-nav-link"
              onClick={() => setActiveSection('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="public-nav-link"
              onClick={() => setActiveSection('about')}
            >
              Guia &amp; Fórmulas
            </button>
            <button
              type="button"
              className={`public-nav-link ${
                publicPage === 'features' ? 'public-nav-link--active' : ''
              }`}
              onClick={() => navigatePublic('features')}
            >
              Recursos
            </button>
          </nav>

          <div className="public-nav-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => enterDemoSandbox(undefined, 'dashboard')}
              title="Abrir painel energético interativo"
            >
              <FlaskConical size={15} />
              <span>Abrir Painel</span>
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">
        {publicPage === 'home' && (
          <>
            {/* HERO SECTION */}
            <section className="hero-section">
              <div className="hero-badge-row">
                <Badge tone="emerald">
                  Engenharia Mecatrônica · Gestão e Análise de Consumo Energético
                </Badge>
              </div>
              <h1 className="hero-title">
                WattWise transforma dados de consumo em decisões mais inteligentes.
              </h1>
              <p className="hero-subtitle">
                Sistema técnico de gestão e análise energética para pequenos estabelecimentos
                comerciais. Conecte potência elétrica, equipamentos reais, cálculo físico de kWh,
                tarifa ANEEL e impacto ambiental em uma plataforma clara e determinística.
              </p>

              <div className="hero-cta-group">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => enterDemoSandbox(undefined, 'dashboard')}
                >
                  <Zap size={17} />
                  <span>Abrir Dashboard Energético</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setActiveSection('demos')}
                >
                  <FlaskConical size={17} />
                  <span>Escolher Cenário (Cafeteria, Mercado, Barbearia, Padaria)</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setActiveSection('about')}
                >
                  <BookOpen size={17} />
                  <span>Ver Fórmulas &amp; Guia</span>
                </button>
              </div>

              <div className="hero-pillars">
                <span>
                  <Cpu size={15} className="text-emerald" /> Equipamentos comerciais com ficha
                  técnica real
                </span>
                <span>
                  <Activity size={15} className="text-emerald" /> Tarifa documentada ANEEL (R${' '}
                  {OFFICIAL_TARIFF_REFERENCE.tariffPerKwh.toFixed(2).replace('.', ',')}/kWh)
                </span>
                <span>
                  <Leaf size={15} className="text-emerald" /> Fator oficial SIN/MCTI (
                  {OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh.toFixed(4).replace('.', ',')}{' '}
                  kg CO₂/kWh)
                </span>
              </div>
            </section>

            {/* VITRINE DOS 4 CENÁRIOS DEMONSTRATIVOS */}
            <section className="public-section" aria-label="Cenários demonstrativos disponíveis">
              <div className="section-header-center">
                <Badge tone="emerald">4 Demonstrações Independentes</Badge>
                <h2 className="section-heading">
                  Selecione um estabelecimento comercial para explorar
                </h2>
                <p className="section-lead">
                  Cada cenário possui equipamentos reais verificados, fatores de ciclo físico e 65
                  dias de histórico simulado distribuídos em 3 competências mensais.
                </p>
              </div>

              <div className="scenarios-grid">
                {scenarioSummaries.map(({ meta, analysis }) => {
                  const Icon = SCENARIO_ICONS[meta.id];
                  return (
                    <article key={meta.id} className="public-card scenario-home-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="feature-icon-box">
                            <Icon size={20} />
                          </div>
                          <div>
                            <h3 className="public-card-title">{meta.shortLabel}</h3>
                            <span className="cell-sub">{meta.segment}</span>
                          </div>
                        </div>
                        <Badge tone="demo">Isolado</Badge>
                      </div>

                      <p className="public-card-desc">{meta.description}</p>

                      <div className="scenario-kpis-grid">
                        <div className="scenario-kpi-box">
                          <span>Potência Ativa</span>
                          <strong className="tabular-nums">
                            {formatPower(analysis.activeInstalledPowerWatts)}
                          </strong>
                          <small>{analysis.activeEquipmentCount} equipamentos ativos</small>
                        </div>
                        <div className="scenario-kpi-box">
                          <span>Consumo Estimado</span>
                          <strong className="tabular-nums text-emerald">
                            {formatKwh(analysis.estimatedEquipmentMonthlyKwh)}/mês
                          </strong>
                          <small>
                            {formatCurrencyBRL(analysis.estimatedEquipmentMonthlyCostBrl)}/mês
                          </small>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'auto' }}
                        onClick={() => enterDemoSandbox(meta.id, 'dashboard')}
                      >
                        <span>Explorar {meta.shortLabel}</span>
                        <ArrowRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 1. PROBLEMA & 2. SOLUÇÃO */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="slate">Diagnóstico e Solução</Badge>
                <h2 className="section-heading">
                  Por que pequenos comércios desperdiçam energia elétrica?
                </h2>
                <p className="section-lead">
                  Sem separar potência instalada (W), fator de operação e histórico diário (kWh), o
                  gestor só percebe o desperdício quando a fatura mensal já foi fechada.
                </p>
              </div>

              <div className="problem-solution-grid">
                <article className="public-card public-card--problem">
                  <h3 className="public-card-title">Limitações da gestão tradicional</h3>
                  <ul className="public-check-list">
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Contas de luz mensais agregadas que escondem em qual dia ou turno ocorreu o
                        desperdício.
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Confusão comum entre capacidade térmica (BTU/h), potência nominal (W) e
                        consumo acumulado (kWh).
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Fornos, expositores refrigerados e sistemas de ar-condicionado operando sem
                        controle de ciclo e horário.
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Ausência de comparativo mensal justo quando um mês possui menos dias
                        registrados que o anterior.
                      </span>
                    </li>
                  </ul>
                </article>

                <article className="public-card public-card--solution">
                  <h3 className="public-card-title">A engenharia do WattWise</h3>
                  <ul className="public-check-list">
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Inventário com fabricante, modelo, potência nominal verificada (W), horas de
                        uso e fator de ciclo.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Comparativo Mensal Consolidado com média diária por competência, projeção de
                        fechamento e variação percentual segura.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Alertas baseados em regras reais: anomalias sobre média móvel, aumento entre
                        períodos e concentração de carga.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Tarifa regional ANEEL documentada e configurável + estimativa de emissões de
                        CO₂ com fator oficial do MCTI.
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>

            {/* 3. ARQUITETURA DE PÁGINAS */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="sky">Navegação Estruturada</Badge>
                <h2 className="section-heading">
                  Arquitetura em páginas dedicadas com roteamento direto
                </h2>
              </div>

              <div className="features-grid-3">
                <article className="public-card">
                  <div className="feature-icon-box">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="public-card-title">Dashboard (/dashboard)</h3>
                  <p className="public-card-desc">
                    Visão consolidada com consumo total, custo estimado, média diária, projeção
                    mensal, comparativo entre competências, alertas e pegada de CO₂.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <Cpu size={20} />
                  </div>
                  <h3 className="public-card-title">Equipamentos (/equipamentos)</h3>
                  <p className="public-card-desc">
                    Cadastro completo com fabricante, modelo, potência nominal (W), fator de
                    operação, memória de cálculo físico e URL da fonte técnica consultada.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <Activity size={20} />
                  </div>
                  <h3 className="public-card-title">Registros (/registros)</h3>
                  <p className="public-card-desc">
                    Lançamento de consumo diário em kWh ou cálculo automático da diferença entre
                    duas leituras acumuladas do medidor de energia.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <TrendingDown size={20} />
                  </div>
                  <h3 className="public-card-title">Análises (/analises)</h3>
                  <p className="public-card-desc">
                    Separação das 4 categorias de dados, comparativo mensal consolidado, regressão
                    linear e participação percentual de cada equipamento.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="public-card-title">Alertas (/alertas)</h3>
                  <p className="public-card-desc">
                    Diagnóstico estruturado com título, prioridade, descrição, motivo, data,
                    contexto quantitativo dos dados e recomendação de ação.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className="public-card-title">Configurações &amp; Guia (/configuracoes)</h3>
                  <p className="public-card-desc">
                    Ajuste manual da tarifa em R$/kWh, documentação da resolução ANEEL, alternância
                    de tema Claro/Escuro e restauração individual por cenário.
                  </p>
                </article>
              </div>
            </section>

            {/* 4. FAQ */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="slate">Dúvidas Frequentes</Badge>
                <h2 className="section-heading">Perguntas técnicas e metodológicas</h2>
              </div>

              <div className="faq-list">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={item.q} className="faq-item">
                      <button
                        type="button"
                        className="faq-question"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`faq-chevron ${isOpen ? 'faq-chevron--open' : ''}`}
                        />
                      </button>
                      {isOpen && <p className="faq-answer">{item.a}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {publicPage === 'features' && (
          <section className="public-section">
            <div className="section-header-center">
              <Badge tone="emerald">Especificações do Sistema</Badge>
              <h1 className="section-heading">Recursos Técnicos do WattWise</h1>
              <p className="section-lead">
                Módulos desenvolvidos com rigor físico, cálculos determinísticos locais e fontes
                documentadas para apresentação técnica.
              </p>
            </div>

            <div className="features-grid-3">
              <article className="public-card">
                <div className="feature-icon-box">
                  <Zap size={20} />
                </div>
                <h3 className="public-card-title">Física Energética Aplicada</h3>
                <p className="public-card-desc">
                  Consumo (kWh) = [Potência (W) ÷ 1000] × Tempo (h) × Quantidade × Fator de Ciclo.
                  Distingue demanda instantânea de energia acumulada.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Activity size={20} />
                </div>
                <h3 className="public-card-title">Leitura Direta ou Medidor Acumulado</h3>
                <p className="public-card-desc">
                  Permite informar o consumo diário diretamente ou inserir a leitura anterior e
                  atual do relógio medidor sem jamais somar leituras acumuladas indevidamente.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Leaf size={20} />
                </div>
                <h3 className="public-card-title">Fator Oficial SIN / MCTI</h3>
                <p className="public-card-desc">
                  Estimativa de emissões baseada no fator médio anual publicado pelo MCTI/SIRENE (
                  {OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh.toFixed(4).replace('.', ',')}{' '}
                  kg CO₂/kWh).
                </p>
              </article>
            </div>
          </section>
        )}

        {publicPage === 'terms' && (
          <section className="public-section legal-prose">
            <Badge tone="slate">Documento Informativo</Badge>
            <h1 className="section-heading">Termos de Uso e Premissas — WattWise</h1>
            <p className="legal-updated">Atualizado em Novembro de 2026</p>

            <div className="public-card legal-card">
              <h3>1. Finalidade Educativa e Técnica</h3>
              <p>
                O WattWise é um protótipo funcional de gestão e análise energética desenvolvido para
                apresentação técnica escolar de Mecatrônica, demonstrando a aplicação de física,
                análise de dados e engenharia de software na eficiência energética.
              </p>

              <h3>2. Natureza das Especificações e Históricos</h3>
              <p>
                As potências nominais dos equipamentos demonstrativos baseiam-se em fichas técnicas
                reais de fabricantes comerciais. Os históricos diários de consumo dos 4 cenários são
                simulações matematicamente coerentes com os equipamentos e estão explicitamente
                identificados como dados simulados.
              </p>
            </div>
          </section>
        )}

        {publicPage === 'privacy' && (
          <section className="public-section legal-prose">
            <Badge tone="slate">Armazenamento Local</Badge>
            <h1 className="section-heading">Privacidade e Persistência — WattWise</h1>
            <p className="legal-updated">Isolamento por cenário no navegador</p>

            <div className="public-card legal-card">
              <h3>1. Persistência 100% Local e Isolada</h3>
              <p>
                Todos os dados inseridos ou editados durante a utilização pública ficam armazenados
                exclusivamente no LocalStorage do próprio navegador do visitante, separados por
                cenário (Cafeteria, Mercado, Barbearia e Padaria).
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-brand">
            <strong>WattWise — Smart Energy Intelligence</strong>
            <span>&ldquo;WattWise transforma dados de consumo em decisões mais inteligentes.&rdquo;</span>
          </div>
          <div className="public-footer-links">
            <button type="button" onClick={() => navigatePublic('home')}>
              Início
            </button>
            <button type="button" onClick={() => setActiveSection('demos')}>
              Demonstrações
            </button>
            <button type="button" onClick={() => setActiveSection('dashboard')}>
              Dashboard
            </button>
            <button type="button" onClick={() => setActiveSection('equipment')}>
              Equipamentos
            </button>
            <button type="button" onClick={() => setActiveSection('about')}>
              Guia &amp; Fórmulas
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
