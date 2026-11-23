import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Cpu,
  FileSpreadsheet,
  FlaskConical,
  Leaf,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { PublicPage } from '../../types/energy';
import { Badge } from '../common/Badge';

const FAQ_ITEMS = [
  {
    q: 'Preciso criar uma conta para testar a plataforma?',
    a: 'Não. Basta clicar em "Explorar Demonstração (Sem Login)" para abrir imediatamente um ambiente completo com organização fictícia, 8 equipamentos, 16 dias de histórico, 2 anomalias identificáveis, recomendações e cálculo de impacto ambiental.',
  },
  {
    q: 'Como o WattWise diferencia potência instalada (kW) de consumo energético (kWh)?',
    a: 'Potência nominal (em W ou kW) é a demanda instantânea dos equipamentos ativos. O consumo estimado em kWh aplica a fórmula física: Potência (W) × horas de uso diário × quantidade ÷ 1.000. Já o consumo medido reflete as leituras inseridas manualmente ou via medidor cumulativo.',
  },
  {
    q: 'O sistema depende de sensores físicos ou APIs externas de IA?',
    a: 'Não. O WattWise opera 100% com registros inseridos pelo usuário e utiliza um motor de inteligência computacional próprio em TypeScript, baseado em fórmulas físicas, médias móveis, regressão linear de tendência e regras determinísticas transparentes.',
  },
  {
    q: 'Como o impacto ambiental (CO₂e) é estimado?',
    a: 'Aplicamos o fator médio de emissão de referência da matriz elétrica brasileira (SIN), de 0,0817 kg CO₂e por kWh consumido, permitindo visualizar a pegada elétrica do período e o potencial de emissões evitadas com metas de economia.',
  },
  {
    q: 'O ambiente demonstrativo funciona mesmo sem internet rápida ou banco remoto?',
    a: 'Sim. O modo demonstração roda integralmente no navegador com persistência local, permitindo cadastrar equipamentos, testar novos registros, simular anomalias e restaurar o cenário original com um único clique.',
  },
];

export const PublicPages: React.FC = () => {
  const {
    theme,
    toggleTheme,
    publicPage,
    navigatePublic,
    enterDemoSandbox,
  } = useWattWise();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
              src={theme === 'light' ? '/brand/wattwise-logo-light.svg' : '/brand/wattwise-logo-dark.svg'}
              alt="WattWise — Smart Energy Intelligence"
              height="36"
              style={{ height: '36px', width: 'auto' }}
            />
          </button>

          <nav className="public-nav-links" aria-label="Navegação pública">
            {(
              [
                { id: 'home', label: 'Início' },
                { id: 'features', label: 'Recursos' },
                { id: 'terms', label: 'Termos' },
                { id: 'privacy', label: 'Privacidade' },
              ] as Array<{ id: PublicPage; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`public-nav-link ${publicPage === item.id ? 'public-nav-link--active' : ''}`}
                onClick={() => navigatePublic(item.id)}
              >
                {item.label}
              </button>
            ))}
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
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={enterDemoSandbox}
              title="Abrir ambiente demonstrativo interativo sem login"
            >
              <FlaskConical size={15} />
              <span>Acessar Demonstração</span>
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
                  Smart Energy Intelligence · Eficiência Energética e Sustentabilidade
                </Badge>
              </div>
              <h1 className="hero-title">
                Entenda seu consumo. Reduza desperdícios. Economize energia.
              </h1>
              <p className="hero-subtitle">
                Uma plataforma web de inteligência computacional para monitorar consumo energético,
                identificar anomalias estatísticas, estimar custos e demonstrar como a tecnologia
                contribui para o uso racional dos recursos naturais.
              </p>

              <div className="hero-cta-group">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={enterDemoSandbox}
                >
                  <FlaskConical size={17} />
                  <span>Acessar Demonstração Pública</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => navigatePublic('features')}
                >
                  <span>Conhecer Recursos</span>
                </button>
              </div>

              <div className="hero-pillars">
                <span>
                  <Activity size={15} className="text-emerald" /> Inteligência estatística local
                </span>
                <span>
                  <Leaf size={15} className="text-emerald" /> Estimativa de impacto ambiental (CO₂e)
                </span>
                <span>
                  <ShieldCheck size={15} className="text-emerald" /> 100% aberto e sem necessidade de login
                </span>
              </div>
            </section>

            {/* 1. PROBLEMA & 2. SOLUÇÃO */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="slate">Diagnóstico e Solução</Badge>
                <h2 className="section-heading">
                  Por que o desperdício energético passa despercebido?
                </h2>
                <p className="section-lead">
                  Escolas, escritórios e pequenos estabelecimentos normalmente descobrem aumentos
                  anormais de consumo apenas quando a fatura mensal chega.
                </p>
              </div>

              <div className="problem-solution-grid">
                <article className="public-card public-card--problem">
                  <h3 className="public-card-title">O problema sem análise de dados</h3>
                  <ul className="public-check-list">
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Contas de luz agregadas que não revelam em qual dia ocorreu o pico de
                        consumo.
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Confusão entre potência nominal instalada (kW) e energia efetivamente
                        consumida (kWh).
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Equipamentos de climatização, refrigeração ou maquinário gerando desperdício
                        contínuo sem visibilidade.
                      </span>
                    </li>
                    <li>
                      <AlertTriangle size={16} className="text-amber" />
                      <span>
                        Falta de conexão clara entre desperdício elétrico, impacto financeiro e
                        emissões de CO₂e.
                      </span>
                    </li>
                  </ul>
                </article>

                <article className="public-card public-card--solution">
                  <h3 className="public-card-title">Como o WattWise transforma dados em ação</h3>
                  <ul className="public-check-list">
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Monitoramento diário em kWh e R$ com comparação automática contra a janela
                        histórica anterior.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Separação rigorosa entre potência nominal (W/kW), consumo estimado por
                        equipamento e consumo medido.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Detecção estatística de anomalias e recomendações com motivo, evidência e
                        impacto estimado.
                      </span>
                    </li>
                    <li>
                      <Check size={16} className="text-emerald" />
                      <span>
                        Cálculo transparente da pegada de carbono elétrica (kg CO₂e) para apoiar
                        decisões sustentáveis.
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>

            {/* 3. COMO FUNCIONA */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="emerald">Inteligência Computacional Transparente</Badge>
                <h2 className="section-heading">Como funciona na prática</h2>
              </div>

              <div className="steps-grid">
                <article className="public-card">
                  <span className="step-badge">Etapa 1</span>
                  <h3 className="public-card-title">Mapeie os equipamentos elétricos</h3>
                  <p className="public-card-desc">
                    Cadastre os equipamentos com categoria, localização, potência em Watts,
                    quantidade e horas médias de uso. O sistema calcula automaticamente o consumo
                    estimado por fórmula física.
                  </p>
                </article>

                <article className="public-card">
                  <span className="step-badge">Etapa 2</span>
                  <h3 className="public-card-title">Registre medições diárias ou do relógio</h3>
                  <p className="public-card-desc">
                    Insira o consumo diário em kWh ou informe duas leituras cumulativas do medidor
                    da concessionária para que o WattWise calcule a diferença automaticamente.
                  </p>
                </article>

                <article className="public-card">
                  <span className="step-badge">Etapa 3</span>
                  <h3 className="public-card-title">Analise anomalias, previsões e CO₂e</h3>
                  <p className="public-card-desc">
                    O motor estatístico detecta picos fora do padrão, projeta o consumo mensal por
                    regressão linear, gera recomendações práticas e estima o impacto ambiental.
                  </p>
                </article>
              </div>
            </section>

            {/* 4. FUNCIONALIDADES & SUSTENTABILIDADE */}
            <section className="public-section">
              <div className="section-header-center">
                <Badge tone="sky">Arquitetura do Produto</Badge>
                <h2 className="section-heading">
                  Tecnologia aplicada à eficiência energética e sustentabilidade
                </h2>
              </div>

              <div className="features-grid-3">
                <article className="public-card">
                  <div className="feature-icon-box">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="public-card-title">Motor Estatístico Determinístico</h3>
                  <p className="public-card-desc">
                    Cálculo físico de energia, média móvel de 7 dias, regressão linear de tendência,
                    coeficiente de variação diária e detecção auditável de anomalias — sem APIs
                    externas de IA.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <Cpu size={20} />
                  </div>
                  <h3 className="public-card-title">Inventário Detalhado de Equipamentos</h3>
                  <p className="public-card-desc">
                    Ficha individual por equipamento com localização, quantidade, regime diário de
                    uso, participação na potência instalada e consumo mensal estimado em kWh e R$.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <Leaf size={20} />
                  </div>
                  <h3 className="public-card-title">Impacto Ambiental (CO₂e)</h3>
                  <p className="public-card-desc">
                    Converte o consumo elétrico em estimativa de emissões (kg CO₂e) com base no
                    fator médio da matriz elétrica brasileira (0,0817 kg CO₂/kWh) e projeta a
                    redução anual com metas de economia.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <FlaskConical size={20} />
                  </div>
                  <h3 className="public-card-title">Ambiente Interativo e Independente</h3>
                  <p className="public-card-desc">
                    Demonstração 100% autônoma que funciona diretamente no navegador com dados
                    locais, sem necessidade de servidores externos, cadastros ou chaves de API.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className="public-card-title">Relatórios Executivos e Exportação</h3>
                  <p className="public-card-desc">
                    Comparativos mensais e exportação aberta em CSV, JSON e visualização otimizada
                    para impressão e geração de PDF executivo.
                  </p>
                </article>

                <article className="public-card">
                  <div className="feature-icon-box">
                    <TrendingDown size={20} />
                  </div>
                  <h3 className="public-card-title">Rastreabilidade de Dados</h3>
                  <p className="public-card-desc">
                    Separação explícita entre dados Medidos, Estimados e Simulados em todas as
                    tabelas, alertas e gráficos da plataforma.
                  </p>
                </article>
              </div>
            </section>

            {/* 5. MODO DEMONSTRAÇÃO (PRIORITÁRIO PARA O EVENTO ESCOLAR) */}
            <section className="public-section">
              <div className="demo-showcase-card">
                <div className="demo-showcase-header">
                  <div>
                    <div className="demo-showcase-badges">
                      <Badge tone="demo">Ambiente Demonstrativo · Dados Simulados</Badge>
                      <Badge tone="emerald">Acesso Direto Sem Login · Funciona Offline</Badge>
                    </div>
                    <h2 className="section-heading" style={{ marginTop: 10 }}>
                      Explore agora: Mercato Café &amp; Cozinha (Simulação)
                    </h2>
                    <p className="section-lead">
                      Um cenário completo e coerente com 8 equipamentos, 16 dias de histórico e 2
                      anomalias detectadas. Experimente cadastrar equipamentos, lançar medições e
                      restaurar o ambiente quando desejar.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={enterDemoSandbox}
                  >
                    <FlaskConical size={16} />
                    <span>Abrir Demonstração Agora</span>
                  </button>
                </div>

                <div className="demo-showcase-kpis">
                  <div className="demo-mini-kpi">
                    <span>Último consumo (Simulado)</span>
                    <strong className="tabular-nums">66,8 kWh</strong>
                    <small className="text-amber">+26,0% vs média anterior (Anomalia)</small>
                  </div>
                  <div className="demo-mini-kpi">
                    <span>Média diária (16 dias)</span>
                    <strong className="tabular-nums">52,0 kWh</strong>
                    <small>Base histórica simulada</small>
                  </div>
                  <div className="demo-mini-kpi">
                    <span>Previsão mensal (30d)</span>
                    <strong className="tabular-nums">1.560,9 kWh</strong>
                    <small>Custo estimado: R$ 1.436,03</small>
                  </div>
                  <div className="demo-mini-kpi">
                    <span>Pegada elétrica estimada</span>
                    <strong className="tabular-nums">127,5 kg CO₂e/mês</strong>
                    <small>Matriz brasileira (0,0817 kg/kWh)</small>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. FAQ */}
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

            {/* 7. CTA FINAL */}
            <section className="public-section">
              <div className="final-cta-card">
                <h2 className="section-heading">
                  Veja na prática como dados reduzem desperdícios de energia
                </h2>
                <p className="section-lead">
                  Explore a demonstração interativa agora mesmo, teste cadastros e veja o motor de análise em tempo real.
                </p>
                <div className="hero-cta-group">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={enterDemoSandbox}
                  >
                    <FlaskConical size={17} />
                    <span>Acessar Demonstração Pública</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {publicPage === 'features' && (
          <section className="public-section">
            <div className="section-header-center">
              <Badge tone="emerald">Especificações Técnicas</Badge>
              <h1 className="section-heading">Recursos do WattWise</h1>
              <p className="section-lead">
                Conheça os módulos de inteligência computacional, eficiência energética e governança
                de dados da plataforma.
              </p>
            </div>

            <div className="features-grid-3">
              <article className="public-card">
                <div className="feature-icon-box">
                  <Zap size={20} />
                </div>
                <h3 className="public-card-title">Cálculo Físico e Financeiro</h3>
                <p className="public-card-desc">
                  Fórmula padronizada kWh = (Potência em W × horas × quantidade) / 1000 e custo =
                  kWh × tarifa. Compara a expectativa teórica do inventário com o consumo medido.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Activity size={20} />
                </div>
                <h3 className="public-card-title">Leituras Manuais e Cumulativas</h3>
                <p className="public-card-desc">
                  Suporta o lançamento direto do consumo diário e o cálculo automático da diferença
                  entre duas leituras consecutivas do medidor da concessionária.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Leaf size={20} />
                </div>
                <h3 className="public-card-title">Impacto Ambiental Transparente</h3>
                <p className="public-card-desc">
                  Calcula emissões estimadas em kg CO₂e a partir do fator médio de referência da
                  matriz elétrica brasileira (0,0817 kg CO₂/kWh) e o potencial anual de redução.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Lock size={20} />
                </div>
                <h3 className="public-card-title">Segurança Multi-Tenant (RLS)</h3>
                <p className="public-card-desc">
                  Políticas Row Level Security no PostgreSQL para SELECT, INSERT, UPDATE e DELETE
                  verificando associação à organização e papel do usuário.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <Users size={20} />
                </div>
                <h3 className="public-card-title">Gestão de Equipe e Auditoria</h3>
                <p className="public-card-desc">
                  Convide membros com funções Owner, Admin, Operator ou Viewer e acompanhe todas as
                  operações relevantes na trilha de Audit Logs.
                </p>
              </article>

              <article className="public-card">
                <div className="feature-icon-box">
                  <FileSpreadsheet size={20} />
                </div>
                <h3 className="public-card-title">Relatórios e Exportação Aberta</h3>
                <p className="public-card-desc">
                  Exportação completa em CSV, JSON e folha de impressão executiva em PDF, além de
                  migração controlada de dados anteriores do navegador.
                </p>
              </article>
            </div>
          </section>
        )}

        {publicPage === 'terms' && (
          <section className="public-section legal-prose">
            <Badge tone="slate">Documento Informativo</Badge>
            <h1 className="section-heading">Termos de Uso — WattWise</h1>
            <p className="legal-updated">Última atualização: Novembro de 2026</p>

            <div className="public-card legal-card">
              <h3>1. Finalidade da Plataforma</h3>
              <p>
                O WattWise é uma plataforma web de monitoramento e análise estatística de consumo
                energético desenvolvida com foco em tecnologia, eficiência energética,
                sustentabilidade e inteligência computacional.
              </p>

              <h3>2. Natureza das Estimativas e Previsões</h3>
              <p>
                As previsões mensais, cálculos de consumo por equipamento, estimativas de CO₂e e
                recomendações geradas pelo motor analítico constituem estimativas técnicas baseadas
                nos registros inseridos pelo usuário. A plataforma não realiza medição automática de
                equipamentos nem substitui medidores homologados pela concessionária.
              </p>

              <h3>3. Isolamento de Dados e Modo Demonstração</h3>
              <p>
                O modo demonstração utiliza dados fictícios claramente identificados como simulados
                e totalmente isolados de qualquer organização real cadastrada na plataforma.
              </p>
            </div>
          </section>
        )}

        {publicPage === 'privacy' && (
          <section className="public-section legal-prose">
            <Badge tone="slate">Privacidade e Proteção de Dados</Badge>
            <h1 className="section-heading">Política de Privacidade — WattWise</h1>
            <p className="legal-updated">Transparência e segurança no tratamento de informações</p>

            <div className="public-card legal-card">
              <h3>1. Dados Tratados</h3>
              <p>
                A plataforma armazena apenas informações necessárias para o monitoramento energético:
                identificação do usuário (quando autenticado), dados da organização, inventário de
                equipamentos, registros de consumo e logs de auditoria.
              </p>

              <h3>2. Isolamento Multi-Tenant</h3>
              <p>
                Registros de organizações autenticadas são protegidos por políticas de Row Level
                Security (RLS), impedindo acesso cruzado entre organizações distintas.
              </p>

              <h3>3. Processamento Local e Sem IA Externa</h3>
              <p>
                Todos os cálculos estatísticos, previsões e recomendações são executados por regras
                determinísticas próprias, sem envio dos seus dados para APIs externas de
                inteligência artificial.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-brand">
            <strong>WattWise — Smart Energy Intelligence</strong>
            <span>
              Tecnologia, eficiência energética, sustentabilidade e inteligência computacional.
            </span>
          </div>
          <div className="public-footer-links">
            <button type="button" onClick={() => navigatePublic('home')}>
              Início
            </button>
            <button type="button" onClick={() => navigatePublic('features')}>
              Recursos
            </button>
            <button type="button" onClick={enterDemoSandbox}>
              Demonstração
            </button>
            <button type="button" onClick={() => navigatePublic('terms')}>
              Termos
            </button>
            <button type="button" onClick={() => navigatePublic('privacy')}>
              Privacidade
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
