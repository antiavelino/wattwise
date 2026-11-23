# WattWise — Smart Energy Intelligence

> **Plataforma SaaS web de inteligência energética desenvolvida para evento escolar com foco em tecnologia, eficiência energética, sustentabilidade e inteligência computacional.**

O **WattWise** transforma dados de equipamentos elétricos e registros diários de consumo em **diagnósticos claros, detecção automática de anomalias, previsões mensais, recomendações acionáveis e estimativa de impacto ambiental (`kg CO₂e`)**.

A plataforma é **100% operacional com registros inseridos pelo usuário**, sem depender de hardware externo nem de APIs de inteligência artificial de terceiros: toda a inteligência computacional é executada por um **motor analítico determinístico** em TypeScript puro, auditável e funcional inclusive offline.

A metodologia do WattWise separa com rigor físico e matemático quatro dimensões complementares:
1. **Potência Nominal Instalada** ($\text{W}$ / $\text{kW}$) — demanda elétrica instalada no inventário de equipamentos.
2. **Consumo Estimado por Equipamento** ($\text{kWh} = \frac{\text{W} \times \text{horas/dia} \times \text{quantidade}}{1000}$) — projeção teórica baseada no regime de uso declarado.
3. **Consumo Registrado** ($\text{kWh}$) — energia efetivamente apurada via leitura diária direta ou cálculo de diferença (delta) de medidor cumulativo (`measurement_type`: `measured`, `estimated` ou `simulated`).
4. **Impacto Ambiental Estimado** ($\text{kg CO}_2\text{e} = \text{kWh} \times 0{,}0817$) — estimativa transparente de emissões de carbono utilizando o fator de referência de **`0,0817 kg CO₂/kWh`** da matriz elétrica brasileira (Sistema Interligado Nacional — SIN).

---

## Sumário

- [Modo Demonstração Prioritário (Acesso Imediato e Offline)](#modo-demonstração-prioritário-acesso-imediato-e-offline)
- [Proposta de Valor e Foco Educacional/Tecnológico](#proposta-de-valor-e-foco-educacionaltecnológico)
- [Arquitetura Full-Stack](#arquitetura-full-stack)
- [Módulos Principais da Plataforma](#módulos-principais-da-plataforma)
- [Quickstart (Desenvolvimento Local)](#quickstart-desenvolvimento-local)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Documentação Técnica Oficial](#documentação-técnica-oficial)

---

## Modo Demonstração Prioritário (Acesso Imediato e Offline)

Pensado para apresentações presenciais, bancas avaliadoras e exploração imediata em eventos escolares, o **Modo Demonstração** tem acesso prioritário direto pela **Landing Page, sem necessidade de login e 100% funcional offline**:

- **Organização Fictícia Pronta**: **`Mercato Café & Cozinha`**, simulando a operação elétrica real de um estabelecimento comercial de pequeno porte.
- **Inventário Completo**: **8 equipamentos** cadastrados (7 ativos e 1 reserva técnica inativo), distribuídos por categorias (*Maquinário*, *Climatização*, *Refrigeração*, *TI e Escritório* e *Iluminação*).
- **Série Histórica de 16 Dias**: histórico coerente de consumo diário em `kWh` com **2 anomalias simuladas** (um pico de `71,4 kWh` e um aumento acentuado de `66,8 kWh` no último dia) claramente identificados como `simulated`.
- **Inteligência Computacional ao Vivo**: detecção imediata de anomalias por linha de base móvel, recomendações práticas priorizadas, projeção de custo mensal em `R$` e estimativa de pegada de carbono em **`kg CO₂e`** (`0,0817 kg CO₂/kWh`).
- **Restauração em Um Clique**: um banner persistente indica o ambiente demonstrativo e oferece um **botão para restaurar o ambiente** ao estado inicial a qualquer momento — ideal para reiniciar a demonstração entre visitas no estande.

---

## Proposta de Valor e Foco Educacional/Tecnológico

Muitos estabelecimentos, escolas e pequenos negócios descobrem desperdícios elétricos apenas quando a fatura mensal chega. O **WattWise** demonstra na prática como a combinação de **engenharia de software, estatística aplicada e sustentabilidade** resolve esse problema sem barreiras de hardware:

- **Tecnologia & Engenharia**: aplicação SPA moderna com isolamento multi-tenant, controle de acesso por papéis (RBAC), banco PostgreSQL com Row Level Security (RLS) e fallback local resiliente.
- **Eficiência Energética**: diferenciação didática e rigorosa entre potência instalada (`W`/`kW`), energia estimada (`kWh`) e energia registrada (`kWh`).
- **Inteligência Computacional Transparente**: motor determinístico sem caixa-preta (sem APIs externas de IA) que calcula média móvel de 7 dias, desvio percentual, severidade de alertas, tendências de curto prazo e recomendações baseadas em evidências.
- **Sustentabilidade Mensurável**: tradução direta do consumo e da economia potencial de energia em **`kg CO₂e`** com base no fator de referência da matriz elétrica brasileira (`0,0817 kg CO₂/kWh` — SIN).

---

## Arquitetura Full-Stack

O WattWise opera sob uma arquitetura **Dual-Layer Multi-Tenant**, funcionando tanto conectado à nuvem (**Supabase Cloud**) quanto em modo autônomo/offline no navegador (**Motor Relacional Local**):

| Camada | Tecnologia | Responsabilidade |
| :--- | :--- | :--- |
| **Frontend & UI** | React 19 + TypeScript 5.8 + Vite 6 | Interface responsiva, acessível, roteamento SPA e acesso direto ao Modo Demonstração |
| **Visualização de Dados** | Recharts 2.15 + Lucide Icons | Gráficos temporais de consumo vs. linha de base móvel, distribuição de carga e diagnósticos |
| **Motor Analítico** | TypeScript Puro (`src/engine/analysisEngine.ts`) | Cálculos determinísticos de média móvel, tendência, previsão 30d, anomalias, recomendações e impacto em `kg CO₂e` |
| **Backend & Banco de Dados** | Supabase PostgreSQL (9 tabelas) + Auth + RLS | Isolamento multi-tenant por `organization_id`, autenticação JWT, RBAC e trilha de auditoria |
| **Edge Function (Serverless)** | Supabase Edge Function (`team-invite`) | Fluxo autenticado de emissão de convites de equipe com token criptográfico SHA-256 |
| **Persistência Local / Offline** | Motor Relacional Local (`wattwise_saas_db_v2`) | Persistência multi-tenant em `localStorage`, Modo Demonstração offline e migração legada |
| **Qualidade & Testes** | Vitest | Testes unitários determinísticos do motor energético e validação de isolamento multi-tenant |
| **Hospedagem & CDN** | Vercel | Deploy contínuo (Preview/Production), rewrites de SPA e cabeçalhos HTTP de segurança |

---

## Módulos Principais da Plataforma

1. **Landing Page & Acesso Direto ao Modo Demonstração**
   - Apresentação clara da proposta do WattWise, acesso imediato ao ambiente **`Mercato Café & Cozinha`** sem login e entrada para criação de conta ou login.
2. **Autenticação & Onboarding Multi-Tenant**
   - Login, cadastro, redefinição de senha, criação de organização e alternância entre múltiplas organizações com isolamento de dados.
3. **Organizações Multi-Tenant & RBAC (`Owner`, `Admin`, `Operator`, `Viewer`)**
   - Gestão de membros da equipe, emissão de convites com papel definido via Edge Function `team-invite` e controle de permissões na UI e no banco de dados (RLS).
4. **Dashboard Executivo & Sustentabilidade**
   - KPIs consolidados: última leitura, variação diária, média histórica, previsão mensal em `kWh` e `R$`, potência nominal ativa, alertas abertos e **impacto ambiental estimado em `kg CO₂e`** (`0,0817 kg CO₂/kWh`).
5. **Inventário de Equipamentos & Detalhamento de Carga**
   - Cadastro com categoria, localização/setor, potência nominal (`W`), quantidade de unidades, horas médias de uso diário (`h/dia`), cálculo automático de consumo estimado diário/mensal e status (`active` / `inactive`).
6. **Registros de Consumo & Medidor Cumulativo**
   - Inserção manual de consumo diário consolidado (`kWh`) ou **cálculo automático por diferença (delta)** entre leitura anterior e leitura atual do relógio medidor ($\text{kWh}_{\text{consumido}} = \text{Leitura}_{\text{atual}} - \text{Leitura}_{\text{anterior}}$), com classificação explícita de `measurement_type` (`measured`, `estimated`, `simulated`).
7. **Motor de Inteligência Energética & Anomalias**
   - Detecção automática de anomalias por janela móvel de 7 dias (`ROLLING_BASELINE_WINDOW = 7`), classificação de severidade (`warning` e `critical`), análise de tendência de curto prazo e recomendações práticas baseadas em evidências.
8. **Fluxo de Gestão de Alertas (Alerts Workflow)**
   - Ciclo de vida auditável para anomalias: `open` (aberto) → `acknowledged` (reconhecido) → `resolved` (resolvido).
9. **Relatórios & Exportação (CSV / JSON / PDF)**
   - Relatórios filtráveis por período, exportação tabular compatível com planilhas (`.csv`), snapshot estruturado (`.json`) e visualização limpa para impressão/PDF.
10. **Migração Controlada de Dados Legados (`wattwise_state_v1`)**
    - Assistente seguro que detecta dados locais legados no navegador e permite importá-los de forma não destrutiva para a organização ativa, filtrando registros marcados como `isDemo`.

---

## Quickstart (Desenvolvimento Local)

### Pré-requisitos
- **Node.js** `>= 20.x` e **npm** `>= 10.x`
- (Opcional) **Supabase CLI** caso deseje aplicar migrações SQL e publicar a Edge Function `team-invite` em um projeto Supabase Cloud.

### 1. Clonar e instalar dependências
```bash
git clone <URL_DO_REPOSITORIO>
cd WattWise
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```
- **Modo Local / Offline (Zero-Config)**: Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não forem preenchidas, o WattWise opera automaticamente com o motor relacional local (`wattwise_saas_db_v2`) e com o **Modo Demonstração** completo no navegador.
- **Modo Supabase Cloud**: Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as credenciais do seu projeto Supabase e siga o guia em [docs/SUPABASE_SETUP.md](file:///c:/antigravity%20sites/WattWise/docs/SUPABASE_SETUP.md).

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173` no navegador e clique em **Explorar Modo Demonstração** (ou crie sua conta) para testar todos os recursos imediatamente.

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite com Hot Module Replacement (HMR). |
| `npm run build` | Executa a verificação de tipos (`tsc -b`) e gera o bundle otimizado de produção em `dist/`. |
| `npm run preview` | Serve localmente o bundle de produção gerado em `dist/` para validação pré-deploy. |
| `npm run typecheck` | Executa o compilador TypeScript (`tsc --noEmit`) para validar tipagem estrita sem emitir arquivos. |
| `npm run lint` | Atalho de verificação estática de tipos (`tsc --noEmit`). |
| `npm test` | Executa a suíte de testes automatizados com Vitest (`vitest run`). |
| `npm run test:watch` | Executa o Vitest em modo interativo de observação contínua. |

---

## Documentação Técnica Oficial

Toda a documentação técnica, de banco de dados, segurança e operação está organizada em [`docs/`](file:///c:/antigravity%20sites/WattWise/docs):

1. **[Arquitetura do Sistema (`docs/ARCHITECTURE.md`)](file:///c:/antigravity%20sites/WattWise/docs/ARCHITECTURE.md)** — Modelo multi-tenant (9 tabelas), persistência dual-layer, Modo Demonstração prioritário, matemática do motor energético e cálculo de impacto ambiental (`kg CO₂e`).
2. **[Banco de Dados & Schema (`docs/DATABASE.md`)](file:///c:/antigravity%20sites/WattWise/docs/DATABASE.md)** — Diagrama ER enxuto, dicionário das 9 tabelas, tipos de medição, índices e ordem de execução das migrações SQL.
3. **[Segurança, RLS & Governança (`docs/SECURITY.md`)](file:///c:/antigravity%20sites/WattWise/docs/SECURITY.md)** — Matriz RBAC/RLS por papel, hardening de `SECURITY DEFINER`, proteção contra spoofing de `organization_id` e segurança de convites (`team-invite`).
4. **[Configuração do Supabase (`docs/SUPABASE_SETUP.md`)](file:///c:/antigravity%20sites/WattWise/docs/SUPABASE_SETUP.md)** — Passo a passo para provisionar o projeto Supabase, aplicar as migrações das 9 tabelas, configurar Auth e publicar a Edge Function `team-invite`.
5. **[Variáveis de Ambiente (`docs/ENVIRONMENT.md`)](file:///c:/antigravity%20sites/WattWise/docs/ENVIRONMENT.md)** — Separação entre variáveis públicas do cliente Vite (`VITE_*`) e segredos exclusivos de servidor/Edge Function.
6. **[Deploy na Vercel (`docs/DEPLOYMENT.md`)](file:///c:/antigravity%20sites/WattWise/docs/DEPLOYMENT.md)** — Publicação na Vercel (Preview/Production), rewrites de SPA, cabeçalhos de segurança e checklist pré-evento/go-live.
7. **[Guia do Usuário & Roteiro de Apresentação (`docs/USER_GUIDE.md`)](file:///c:/antigravity%20sites/WattWise/docs/USER_GUIDE.md)** — Manual prático de uso (Modo Demonstração, equipamentos, leituras, alertas, relatórios, equipe) e **Roteiro de Apresentação Presencial (3 minutos)**.
