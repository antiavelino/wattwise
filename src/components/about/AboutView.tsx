import React from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calculator,
  Cpu,
  ExternalLink,
  Leaf,
  Lightbulb,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import {
  OFFICIAL_EMISSION_REFERENCE,
  OFFICIAL_TARIFF_REFERENCE,
} from '../../data/demoData';
import { formatCurrencyBRL } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export const AboutView: React.FC = () => {
  const { setActiveSection } = useWattWise();

  return (
    <div className="view-stack">
      {/* Banner Principal / Propósito */}
      <section className="panel" aria-label="Objetivo do Projeto WattWise">
        <div className="panel-header panel-header--wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <BookOpen size={18} className="text-emerald" />
              <h2 className="panel-title">
                Sobre o WattWise — Guia Didático e Fundamentos de Engenharia
              </h2>
              <Badge tone="emerald">Apresentação Escolar de Mecatrônica</Badge>
            </div>
            <p className="panel-subtitle">
              &ldquo;WattWise transforma dados de consumo em decisões mais inteligentes.&rdquo;
            </p>
          </div>
        </div>

        <div className="didactic-callout">
          <strong>Objetivo Central do Sistema:</strong>
          <p>
            O WattWise é um sistema web de gestão e análise de consumo energético voltado para
            pequenos estabelecimentos comerciais (cafeterias, minimercados, barbearias e padarias).
            Ele integra conceitos de <strong>eletricidade, potência nominal, fator de operação,
            estatística descritiva e sustentabilidade</strong> para identificar desperdícios sem
            depender de inteligência artificial generativa ou APIs externas pagas.
          </p>
        </div>

        <div className="summary-strip">
          <div className="summary-pill">
            <span className="summary-pill-label">1. Grandezas Físicas Separadas</span>
            <strong className="summary-pill-value">W vs. kWh</strong>
            <span className="summary-pill-sub">
              Diferencia potência instantânea instalada (W/kW) de energia consumida no tempo (kWh)
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">2. Cálculos 100% Determinísticos</span>
            <strong className="summary-pill-value text-emerald">Motor Local</strong>
            <span className="summary-pill-sub">
              Média móvel, regressão linear por mínimos quadrados e regras auditáveis em TypeScript
            </span>
          </div>

          <div className="summary-pill">
            <span className="summary-pill-label">3. Fontes Técnicas Verificadas</span>
            <strong className="summary-pill-value">ANEEL + MCTI</strong>
            <span className="summary-pill-sub">
              Fichas técnicas reais de equipamentos comerciais, tarifa B3 homologada e fator SIN
            </span>
          </div>
        </div>
      </section>

      {/* Conceitos Fundamentais de Eletricidade e Fórmulas */}
      <section className="panel" aria-label="Fórmulas e conceitos elétricos">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Conceitos de Eletricidade: Potência, Consumo, Fator de Operação e Custo
            </h2>
            <p className="panel-subtitle">
              Explicação clara para quem nunca utilizou um sistema de gestão energética
            </p>
          </div>
          <Calculator size={18} className="panel-header-icon" />
        </div>

        <div className="dashboard-split">
          <div className="didactic-concept-card">
            <div className="didactic-concept-header">
              <Zap size={16} className="text-emerald" />
              <h3>O que é Potência Elétrica (W ou kW)?</h3>
            </div>
            <p>
              A <strong>potência nominal</strong> (medida em Watts, <strong>W</strong>, ou
              Quilowatts, <strong>1 kW = 1.000 W</strong>) indica a taxa instantânea em que um
              equipamento demanda energia elétrica da rede quando está em pleno funcionamento.
            </p>
            <div className="formula-box">
              <code>Potência Total Instalada (W) = Potência Unitária (W) × Quantidade</code>
            </div>
            <p className="form-hint">
              <strong>Atenção técnica:</strong> Não confunda potência elétrica de entrada com
              capacidade térmica (ex.: um ar-condicionado de 24.000 BTU/h consome cerca de{' '}
              <strong>2.040 W</strong> elétricos) ou potência mecânica (um motor de 3 CV equivale a{' '}
              <strong>3 × 736 W = 2.208 W</strong>).
            </p>
          </div>

          <div className="didactic-concept-card">
            <div className="didactic-concept-header">
              <Activity size={16} className="text-emerald" />
              <h3>O que é Consumo de Energia (kWh)?</h3>
            </div>
            <p>
              O <strong>Quilowatt-hora (kWh)</strong> é a unidade que aparece na conta de luz. Ele
              representa a potência elétrica multiplicada pelo <strong>tempo</strong> de operação e
              pelo <strong>fator de utilização (ciclo de trabalho)</strong>.
            </p>
            <div className="formula-box">
              <code>
                Consumo (kWh) = [Potência (W) ÷ 1000] × Tempo (h) × Quantidade × Fator de Ciclo
              </code>
            </div>
            <p className="form-hint">
              <strong>Por que usar o Fator de Ciclo?</strong> Geladeiras, freezers, fornos com
              termostato e aparelhos Inverter não consomem 100% da potência nominal durante todas as
              horas em que estão conectados na tomada; o compressor ou resistência liga e desliga
              para manter a temperatura (ex.: fator de 0,42 a 0,68).
            </p>
          </div>

          <div className="didactic-concept-card">
            <div className="didactic-concept-header">
              <Lightbulb size={16} className="text-emerald" />
              <h3>Como o Custo Estimado é Calculado (R$)?</h3>
            </div>
            <p>
              O custo financeiro proporcional ao consumo energético é obtido multiplicando a energia
              consumida em kWh pela tarifa em R$/kWh configurada no cenário:
            </p>
            <div className="formula-box">
              <code>Custo Estimado (R$) = Consumo (kWh) × Tarifa (R$/kWh)</code>
            </div>
            <p className="form-hint">
              <strong>Referência adotada:</strong>{' '}
              {formatCurrencyBRL(OFFICIAL_TARIFF_REFERENCE.tariffPerKwh)}/kWh (
              {OFFICIAL_TARIFF_REFERENCE.tariffSource} — {OFFICIAL_TARIFF_REFERENCE.consumerClass}).
              Limitação explícita: não inclui tributos variáveis (ICMS, PIS/COFINS), bandeiras
              tarifárias ou CIP.
            </p>
          </div>

          <div className="didactic-concept-card">
            <div className="didactic-concept-header">
              <Leaf size={16} className="text-emerald" />
              <h3>Como o Impacto Ambiental é Estimado (kg CO₂)?</h3>
            </div>
            <p>
              Toda energia elétrica consumida do Sistema Interligado Nacional (SIN) possui uma
              pegada de carbono associada ao despacho de usinas da matriz brasileira (Escopo 2):
            </p>
            <div className="formula-box">
              <code>
                Emissões Estimadas (kg CO₂) = Consumo (kWh) ×{' '}
                {OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh.toFixed(4).replace('.', ',')} kg
                CO₂/kWh
              </code>
            </div>
            <p className="form-hint">
              <strong>Fonte oficial:</strong> {OFFICIAL_EMISSION_REFERENCE.emissionFactorSource} (
              {OFFICIAL_EMISSION_REFERENCE.emissionFactorYear}). Trata-se de estimativa indireta, e
              não de medição física direta de gases.
            </p>
          </div>
        </div>
      </section>

      {/* Diferenciação dos 4 Tipos de Dados */}
      <section className="panel" aria-label="Rastreabilidade e natureza dos dados">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Transparência e Rastreabilidade: 4 Categorias Distintas de Dados
            </h2>
            <p className="panel-subtitle">
              O WattWise nunca apresenta dados simulados como se fossem medições reais
            </p>
          </div>
          <ShieldCheck size={18} className="panel-header-icon" />
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Classificação</th>
                <th>O que representa no WattWise</th>
                <th>Origem / Comprovação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Badge tone="emerald">1. Potência Nominal Comprovada</Badge>
                </td>
                <td>
                  Potência elétrica de entrada (em Watts) dos equipamentos comerciais cadastrados.
                </td>
                <td>
                  Fichas técnicas, catálogos e manuais oficiais dos fabricantes (Nuova Simonelli,
                  Prática, Gelopar, Metalfrio, LG, Taiff, Wahl, Progás, G.Paniz, Philips).
                </td>
              </tr>
              <tr>
                <td>
                  <Badge tone="sky">2. Consumo Estimado pelo Inventário</Badge>
                </td>
                <td>
                  Energia teórica calculada a partir da potência nominal, quantidade, horas diárias
                  e fator de utilização do equipamento.
                </td>
                <td>
                  Cálculo físico determinístico: (W ÷ 1000) × Horas × Qtd × Fator de Operação.
                </td>
              </tr>
              <tr>
                <td>
                  <Badge tone="demo">3. Consumo Diário Simulado (Demo)</Badge>
                </td>
                <td>
                  Série histórica de 65 dias criada para demonstrar gráficos, comparativo mensal e
                  detecção de anomalias nos 4 cenários.
                </td>
                <td>
                  Claramente rotulada com o selo <strong>Simulado / Demo</strong>. Coerente com a
                  carga instalada de cada cenário, sem fingir ser leitura real de concessionária.
                </td>
              </tr>
              <tr>
                <td>
                  <Badge tone="emerald">4. Consumo Registrado pelo Usuário</Badge>
                </td>
                <td>
                  Leituras inseridas manualmente pelo usuário (consumo direto em kWh ou diferença
                  entre duas leituras acumuladas do relógio medidor).
                </td>
                <td>
                  Armazenadas localmente no navegador dentro do cenário ativo e classificadas como{' '}
                  <strong>Medido</strong>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Roteiro de Apresentação de 3 Minutos */}
      <section className="panel" aria-label="Roteiro rápido para apresentação escolar">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Roteiro Sugerido para Apresentação Escolar (3 Minutos)
            </h2>
            <p className="panel-subtitle">
              Passos práticos para demonstrar o funcionamento técnico do WattWise à banca e
              visitantes
            </p>
          </div>
          <Cpu size={18} className="panel-header-icon" />
        </div>

        <div className="steps-grid">
          <div className="public-card">
            <span className="step-badge">Minuto 1 · Contexto e Cenários</span>
            <h3 className="public-card-title">Mostre os 4 Estabelecimentos</h3>
            <p className="public-card-desc">
              Abra a página <strong>Demonstrações</strong> (<code>/demonstracoes</code>) e mostre
              como uma Cafeteria, um Mercado, uma Barbearia e uma Padaria possuem perfis de potência
              e consumo completamente diferentes e isolados.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('demos')}
            >
              <span>Ir para Demonstrações</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div className="public-card">
            <span className="step-badge">Minuto 2 · Física e Equipamentos</span>
            <h3 className="public-card-title">Inspecione uma Ficha Técnica</h3>
            <p className="public-card-desc">
              Na página <strong>Equipamentos</strong> (<code>/equipamentos</code>), clique em um
              item (como o Forno Turbo Progás 8.360 W ou a Cafeteira Nuova Simonelli 3.150 W) para
              exibir o fabricante, modelo, fator de ciclo e a fonte oficial verificada.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('equipment')}
            >
              <span>Ir para Equipamentos</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div className="public-card">
            <span className="step-badge">Minuto 3 · Análises e Alertas</span>
            <h3 className="public-card-title">Simule uma Medição ou Tarifa</h3>
            <p className="public-card-desc">
              Mostre o <strong>Comparativo Mensal Consolidado</strong>, registre uma leitura alta em{' '}
              <strong>Registros</strong> (ou via leitura acumulada de medidor) e veja o alerta de
              anomalia e o custo em R$ atualizarem instantaneamente.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveSection('dashboard')}
            >
              <span>Abrir Dashboard</span>
              <AlertTriangle size={13} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
