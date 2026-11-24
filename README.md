# WattWise — Gestão e Inteligência Energética

> **Plataforma web de monitoramento, análise de consumo elétrico e eficiência energética para pequenos estabelecimentos comerciais, desenvolvida para apresentação técnica em Engenharia Mecatrônica.**

O **WattWise** transforma inventários de equipamentos elétricos e registros diários de energia em **diagnósticos claros, comparativos mensais justos, detecção determinística de anomalias, projeções financeiras e estimativas de impacto ambiental (`kg CO₂`)**.

A aplicação funciona **100% no navegador** com persistência isolada por cenário no `LocalStorage`, sem exigir cadastro, login, servidor externo ou chaves de API de terceiros.

---

## Principais Funcionalidades

- **Página Inicial & 4 Demonstrações Isoladas (`/`, `/demonstracoes`):** Acesso imediato e sem login a quatro cenários comerciais completos, com dados independentes e restauração individual em um clique.
- **Dashboard Executivo (`/dashboard`):** Indicadores de consumo no período, custo estimado (`R$`), média diária, projeção para 30 dias, potência nominal ativa (`W`/`kW`), gráfico diário comparativo, comparativo mensal consolidado, alertas recentes e impacto ambiental estimado (`kg CO₂`).
- **Inventário de Equipamentos (`/equipamentos`):** Cadastro, busca, filtros por categoria e status (`Ativo`/`Inativo`), validação de entradas e ficha técnica individual com memória de cálculo e link para a fonte técnica de referência.
- **Registros de Consumo (`/registros`):** Lançamento diário direto (`kWh`) ou cálculo automático por diferença de leituras do medidor acumulativo ($\Delta\text{kWh} = \text{Leitura Atual} - \text{Leitura Anterior}$), com bloqueio de datas duplicadas e exportação em CSV.
- **Análises Técnicas (`/analises`):** Separação explícita entre **Potência Nominal Instalada**, **Consumo Estimado**, **Consumo Simulado** e **Consumo Medido**, regressão linear para tendência e participação percentual por equipamento.
- **Central de Alertas (`/alertas`):** Diagnósticos estruturados com prioridade, motivo, contexto quantitativo, recomendação prática e fluxo de acompanhamento (`Aberto` → `Reconhecido` → `Resolvido`).
- **Relatórios (`/relatorios`):** Exportação em `.csv`, `.json` e visualização formatada para impressão/PDF.
- **Configurações (`/configuracoes`):** Ajuste da tarifa elétrica (`R$/kWh` — referência padrão ANEEL/Enel SP B3 `R$ 0,79/kWh`, homologada em `R$ 0,78938/kWh` sem tributos), sensibilidade de alertas, alternância entre **Modo Claro** e **Modo Escuro**, além de gerenciamento e restauração dos dados locais.
- **Guia & Fórmulas (`/sobre`):** Explicação didática das grandezas elétricas ($\text{W}$, $\text{kW}$, $\text{kWh}$, fator de utilização/ciclo) e roteiro de apresentação.

---

## Demonstrações Disponíveis

Cada cenário possui histórico de 65 dias simulados, inventário técnico dedicado e armazenamento isolado:

1. **Cafeteria Grão & Vapor (`cafeteria`)** — Máquina de expresso 2 grupos, forno de convecção, vitrine e balcão refrigerado, micro-ondas comercial, moinho, climatização inverter e iluminação LED.
2. **Minimercado Bom Bairro (`mercado`)** — Refrigeração comercial 24h (expositores verticais, ilha/freezer horizontal, balcão), climatização, iluminação linear, frente de caixa/balança e cortina de ar.
3. **Barbearia Navalha & Estilo (`barbearia`)** — Secadores profissionais, máquinas de corte, climatização, iluminação LED, frigobar expositor, autoclave e TV/recepção.
4. **Padaria Massa Viva (`padaria`)** — Forno turbo elétrico, amassadeira, câmara fria/balcão, vitrine refrigerada, estufa aquecida, iluminação e batedeira planetária.

---

## Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6
- **Gráficos & Ícones:** Recharts 2.15 + Lucide React
- **Motor Analítico:** TypeScript puro (`src/engine/analysisEngine.ts`) com cálculos determinísticos
- **Persistência:** `LocalStorage` com versionamento de schema e isolamento por cenário (`src/storage/localStorage.ts`)
- **Testes:** Vitest (`src/test/analysisEngine.test.ts`)
- **Hospedagem:** Vercel (SPA com `vercel.json` e cabeçalhos de segurança HTTP)

---

## Instalação e Execução Local

### Pré-requisitos

- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### Passos

```bash
git clone https://github.com/antiavelino/wattwise.git
cd wattwise
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador. A aplicação inicia pronta para uso imediato no Modo Demonstração, sem necessidade de configurar variáveis de ambiente ou banco de dados.

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite. |
| `npm run typecheck` | Valida a tipagem estrita com `tsc --noEmit`. |
| `npm test` | Executa a suíte de testes automatizados com Vitest. |
| `npm run build` | Gera o build de produção otimizado em `dist/`. |
| `npm run preview` | Serve localmente o conteúdo gerado em `dist/`. |

---

## Documentação Complementar

- [Guia do Projeto (`docs/guia-do-projeto.md`)](docs/guia-do-projeto.md)
- [Fontes Técnicas e Premissas (`docs/fontes-e-premissas.md`)](docs/fontes-e-premissas.md)
