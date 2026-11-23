# Guia do Usuário & Roteiro de Apresentação — WattWise

Bem-vindo ao manual prático do **WattWise — Smart Energy Intelligence**. A plataforma foi construída para ser **100% operacional com registros inseridos pelo usuário**, sem necessidade de sensores físicos nem APIs externas de IA, e conta com um **Modo Demonstração prioritário** acessível direto da Landing Page (inclusive offline).

---

## Sumário

1. [Roteiro de Apresentação Presencial (3 minutos)](#1-roteiro-de-apresentação-presencial-3-minutos)
2. [Usando o Modo Demonstração (Mercato Café & Cozinha)](#2-usando-o-modo-demonstração-mercato-café--cozinha)
3. [Criando sua Conta e Onboarding Multi-Tenant](#3-criando-sua-conta-e-onboarding-multi-tenant)
4. [Cadastrando Equipamentos (Potência, Quantidade e Horas de Uso)](#4-cadastrando-equipamentos-potência-quantidade-e-horas-de-uso)
5. [Registrando Consumo Diário e Medidor Cumulativo](#5-registrando-consumo-diário-e-medidor-cumulativo)
6. [Anomalias, Alertas, Recomendações e Impacto Ambiental (`kg CO₂e`)](#6-anomalias-alertas-recomendações-e-impacto-ambiental-kg-co₂e)
7. [Exportando Relatórios (CSV, JSON e PDF)](#7-exportando-relatórios-csv-json-e-pdf)
8. [Gerenciando Equipe e Papéis de Acesso (RBAC)](#8-gerenciando-equipe-e-papéis-de-acesso-rbac)
9. [Migração Segura de Dados Legados (`localStorage`)](#9-migração-segura-de-dados-legados-localstorage)

---

## 1. Roteiro de Apresentação Presencial (3 minutos)

Este roteiro foi desenhado para apresentar o **WattWise** em **3 minutos exatos** em feiras de ciências, mostras tecnológicas e bancas avaliadoras, usando o **Modo Demonstração** (funcional mesmo sem internet).

| Etapa | Tempo | Foco na Tela | O que mostrar e falar |
| :--- | :---: | :--- | :--- |
| **1. Problema** | `0:00 – 0:20` | Landing Page | Explique a dor real: escolas, cafés e pequenos negócios só descobrem desperdícios de energia quando a conta de luz chega no fim do mês — sem saber *qual* equipamento pesou ou *quando* ocorreu o pico. |
| **2. Abrir WattWise** | `0:20 – 0:35` | Botão de Modo Demonstração na Landing Page | Clique direto em **Explorar Modo Demonstração** (sem login e 100% funcional offline). Destaque que o sistema carrega a organização fictícia **`Mercato Café & Cozinha`** sem depender de hardware externo nem APIs de IA pagas. |
| **3. Dashboard** | `0:35 – 1:05` | Tela **Dashboard** | Mostre os KPIs principais: última leitura diária, média histórica de 16 dias, previsão de fechamento mensal em `kWh` e `R$`, potência nominal ativa instalada e o gráfico de consumo real comparado à linha de base móvel. |
| **4. Equipamento** | `1:05 – 1:30` | Aba **Equipamentos** | Mostre os **8 equipamentos** cadastrados (7 ativos + 1 reserva inativo) e explique a separação rigorosa entre **potência nominal (`W`/`kW`)** e **consumo estimado (`kWh = W × horas × qtd / 1000`)**. Destaque os maiores consumidores (ex.: *Forno Elétrico Combinado 3200 W* e *Ar-condicionado 24.000 BTU*). |
| **5. Registro de consumo** | `1:30 – 1:55` | Aba **Consumo & Leituras** | Abra o formulário de novo registro e mostre os dois modos pensados para qualquer usuário: **Consumo Diário Direto (`kWh`)** e **Medidor Cumulativo (Relógio)**, onde o sistema calcula automaticamente o delta ($\text{Leitura}_{\text{atual}} - \text{Leitura}_{\text{anterior}}$). Se quiser fazer ao vivo, lance um valor alto (ex.: `80 kWh`) para ver tudo recalcular na hora. |
| **6. Anomalia** | `1:55 – 2:20` | Aba **Alertas** / Gráfico | Aponte as **2 anomalias** detectadas automaticamente na série de 16 dias (`71,4 kWh` e `66,8 kWh`). Explique a **inteligência computacional determinística**: janela móvel dos 7 dias anteriores (`ROLLING_BASELINE_WINDOW = 7`), cálculo do desvio percentual, severidade (`Atenção` / `Crítico`), custo excedente em `R$` e fluxo `Aberto → Reconhecido → Resolvido`. |
| **7. Recomendação** | `2:20 – 2:40` | Painel de **Recomendações** (Dashboard / Análises) | Mostre como o motor cruza o pico detectado com o equipamento mais potente e a participação por categoria (*Climatização*, *Maquinário*, *Refrigeração*) para gerar ações concretas e simular a economia de reduzir `10%` do consumo mensal. |
| **8. Impacto ambiental** | `2:40 – 3:00` | Indicador de **Impacto Ambiental (`kg CO₂e`)** | Feche conectando tecnologia e sustentabilidade: mostre a estimativa de emissões em **`kg CO₂e`** calculada com o fator de referência **`0,0817 kg CO₂/kWh`** da matriz elétrica brasileira (SIN) e quantos quilos de $\text{CO}_2$ são evitados ao combater desperdícios. |

> **Dica de Ouro para o Estande**: Se você alterou dados, reconheceu alertas ou cadastrou registros de teste durante uma demonstração, clique no botão **Restaurar Ambiente** no banner do Modo Demonstração. Em 1 segundo, a **`Mercato Café & Cozinha`** volta ao estado original pronta para o próximo visitante.

---

## 2. Usando o Modo Demonstração (`Mercato Café & Cozinha`)

O Modo Demonstração permite testar toda a plataforma instantaneamente, sem criar conta e sem conexão com a internet:
- **Organização**: `Mercato Café & Cozinha (Demonstrativo)` — tarifa de referência `R$ 0,92/kWh` e limiar de anomalia de `20%`.
- **8 Equipamentos**: Forno Elétrico Combinado, 2 aparelhos de Ar-condicionado Split, Balcão Refrigerado Expositor, Freezer Vertical Comercial, Estações de Trabalho/PDV, Iluminação LED e 1 Compressor Auxiliar (inativo).
- **16 Dias de Histórico**: série diária coerente com **2 anomalias simuladas** (`71,4 kWh` e `66,8 kWh`), marcadas explicitamente como `simulated`.
- **Restauração Instantânea**: clique em **Restaurar Ambiente** no banner superior sempre que quiser recomeçar do zero.

---

## 3. Criando sua Conta e Onboarding Multi-Tenant

1. Na **Landing Page**, clique em **Entrar** ou **Criar Conta**.
2. Informe seu **Nome Completo**, **E-mail** e **Senha**.
3. No **Onboarding**, crie sua primeira organização informando nome, tarifa de energia (`R$/kWh`) e limiar de alerta (`%`).
4. Caso gerencie mais de uma unidade (ex.: *Bloco A* e *Laboratório*), alterne entre elas pelo **Seletor de Organização** na barra lateral com isolamento total de dados.

---

## 4. Cadastrando Equipamentos (Potência, Quantidade e Horas de Uso)

Na aba **Equipamentos**, mapeie as cargas elétricas instaladas preenchendo:
- **Nome** (ex.: *Ar-condicionado Split 24.000 BTU*)
- **Categoria** (*Climatização*, *Iluminação*, *Refrigeração*, *Maquinário*, *TI e Escritório* ou *Outros*)
- **Localização / Setor** (ex.: *Salão de Atendimento*, *Laboratório de Informática*)
- **Potência Nominal Unitária (`W`)** — valor da etiqueta do aparelho
- **Quantidade** — número de unidades iguais
- **Uso Médio Diário (`horas/dia`)** — de `0` a `24` horas
- **Status** — `Ativo` (entra na carga instalada ativa) ou `Inativo` (reserva/desligado)

### Exemplo de cálculo automático:
- **Potência Total**: $1600\text{ W} \times 3 = 4800\text{ W}$ ($4{,}80\text{ kW}$)
- **Consumo Estimado Diário**: $\frac{1600 \times 8 \times 3}{1000} = 38{,}40\text{ kWh/dia}$
- **Consumo Estimado Mensal (30 dias)**: $38{,}40 \times 30 = 1152{,}0\text{ kWh/mês}$

---

## 5. Registrando Consumo Diário e Medidor Cumulativo

Na aba **Consumo & Leituras**, todo dado é inserido pelo usuário de forma simples, em dois modos:

### Modo A: Consumo Diário Direto (`kWh`)
- Informe a **Data**, o **Consumo do Dia (`kWh`)**, o **Tipo de Medição** (`Medido`, `Estimado` ou `Simulado`), o equipamento opcional e uma observação.

### Modo B: Leitura Cumulativa do Relógio Medidor (Cálculo Automático de Delta)
Ideal para quem anota o número exibido no medidor de luz da escola, residência ou empresa:
1. Selecione **Medidor Cumulativo**.
2. Informe a **Leitura Anterior (`kWh`)** e a **Leitura Atual (`kWh`)**.
3. O WattWise valida que $\text{Leitura}_{\text{atual}} \ge \text{Leitura}_{\text{anterior}}$ e calcula automaticamente:
   $$\text{Consumo Registrado (kWh)} = \text{Leitura Atual} - \text{Leitura Anterior}$$

---

## 6. Anomalias, Alertas, Recomendações e Impacto Ambiental (`kg CO₂e`)

### 6.1. Detecção de Anomalias
A partir do **4º dia registrado**, o motor compara cada dia com a **média móvel dos até 7 dias anteriores**:
- **Atenção (`warning`)**: desvio $\ge$ limiar configurado (padrão `20%`).
- **Crítico (`critical`)**: desvio $\ge 1{,}5\times$ o limiar configurado (padrão `30%`).

### 6.2. Fluxo de Alertas (`Aberto` → `Reconhecido` → `Resolvido`)
Na aba **Alertas**, a equipe acompanha o ciclo completo:
1. **Aberto (`open`)**: pico recém-detectado aguardando verificação.
2. **Reconhecido (`acknowledged`)**: equipe ciente e investigando a causa.
3. **Resolvido (`resolved`)**: causa tratada e encerrada com registro na trilha de auditoria.

### 6.3. Grau de Confiança da Previsão Mensal (30 dias)
- **Menos de 3 leituras**: previsão bloqueada até atingir base mínima.
- **3 a 6 leituras**: confiança *Preliminar*.
- **7 a 13 leituras**: confiança *Moderada*.
- **14 ou mais leituras**: confiança *Alta*.

### 6.4. Impacto Ambiental Estimado (`kg CO₂e`)
O WattWise converte o consumo elétrico (`kWh`) e o potencial de economia em emissões estimadas de carbono usando o fator de referência da **matriz elétrica brasileira (SIN)**:
$$\text{Impacto Ambiental (kg CO}_2\text{e)} = \text{Consumo (kWh)} \times 0{,}0817$$

---

## 7. Exportando Relatórios (CSV, JSON e PDF)

Na aba **Relatórios**, filtre pelo período desejado e escolha o formato:
- **CSV (`.csv`)**: planilha tabular compatível com Excel e Google Planilhas.
- **JSON (`.json`)**: snapshot estruturado com KPIs, inventário, leituras e anomalias.
- **Impressão / PDF**: layout limpo pronto para salvar em PDF ou imprimir.

---

## 8. Gerenciando Equipe e Papéis de Acesso (RBAC)

Usuários **`Owner`** e **`Admin`** podem gerenciar membros e convites na aba **Equipe & Organização**:

| Papel | Permissões |
| :--- | :--- |
| **`Owner`** | Controle total da organização, configurações, membros, convites e operação completa. |
| **`Admin`** | Convidar/remover membros (`operator`/`viewer`), configurar tarifa e limiar, gerenciar equipamentos, leituras e alertas. |
| **`Operator`** | Cadastrar/editar equipamentos, registrar leituras e reconhecer/resolver alertas. |
| **`Viewer`** | Visualizar dashboards, gráficos, inventário e exportar relatórios (somente leitura). |

---

## 9. Migração Segura de Dados Legados (`localStorage`)

Se houver dados salvos de uma versão anterior na chave `wattwise_state_v1` do navegador:
1. O WattWise exibe o assistente de **Migração de Dados Legados**.
2. Registros demonstrativos antigos (`isDemo: true`) são ignorados automaticamente.
3. Apenas seus equipamentos, leituras reais e tarifa são importados de forma não destrutiva para a organização ativa.
