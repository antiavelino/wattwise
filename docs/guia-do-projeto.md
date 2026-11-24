# Guia do Projeto WattWise

> **"WattWise transforma dados de consumo em decisões mais inteligentes."**

---

## 1. Objetivo do WattWise

O **WattWise** é um sistema web de gestão e análise de consumo energético desenvolvido para apresentação técnica em evento escolar de **Engenharia Mecatrônica**.

Seu propósito é conectar conceitos fundamentais de **eletricidade, potência nominal, fator de utilização, análise estatística determinística, engenharia de software e sustentabilidade** em uma ferramenta prática, transparente e operacional voltada a pequenos estabelecimentos comerciais.

---

## 2. Problema que Procura Resolver

Pequenos negócios — como cafeterias, minimercados, barbearias e padarias — frequentemente sofrem com custos elevados de eletricidade sem compreender a origem exata do consumo:

1. **Invisibilidade na fatura agregada:** A conta de energia informa apenas o total acumulado no ciclo mensal, sem revelar em quais dias ou turnos ocorreram os picos de consumo.
2. **Confusão entre grandezas físicas:** É comum confundir capacidade térmica (ex.: $\text{BTU/h}$ de um ar-condicionado) ou potência mecânica (ex.: $\text{CV}$ de um motor) com a potência elétrica nominal de entrada ($\text{W}$ ou $\text{kW}$) e o consumo acumulado no tempo ($\text{kWh}$).
3. **Desconhecimento do ciclo de operação:** Equipamentos com controle termostático (geladeiras, freezers, fornos e sistemas Inverter) não operam 100% do tempo na potência máxima, exigindo modelagem por fator de operação.
4. **Falta de comparação justa entre meses:** Comparar diretamente o total de um mês em andamento (ex.: 20 dias) com um mês anterior fechado (30 ou 31 dias) gera interpretações erradas se a média diária não for normalizada.

---

## 3. Público-Alvo

- **Pequenos estabelecimentos comerciais e de serviços:** cafeterias, lanchonetes, minimercados, mercearias, barbearias, salões e padarias artesanais.
- **Estudantes, professores e avaliadores técnicos:** como plataforma demonstrativa aplicada de Mecatrônica, eficiência energética e análise de dados.

---

## 4. Como Funciona

O WattWise opera integralmente no navegador com persistência estruturada e isolada por cenário no `LocalStorage`, sem exigir login, servidores pagos ou chaves de API de inteligência artificial:

1. **Mapeamento de Equipamentos:** O usuário cadastra os equipamentos elétricos informando fabricante, modelo, categoria, setor, potência elétrica nominal ($\text{W}$), quantidade, horas diárias de funcionamento e fator de operação (ciclo de trabalho).
2. **Registro de Consumo:** O sistema aceita lançamentos diários diretos em $\text{kWh}$ ou o cálculo automático da diferença entre duas leituras consecutivas do medidor acumulativo da concessionária ($\Delta\text{kWh} = \text{Leitura Atual} - \text{Leitura Anterior}$).
3. **Processamento Determinístico Local:** A cada alteração, o motor em TypeScript (`src/engine/analysisEngine.ts`) recalcula instantaneamente indicadores, comparativo mensal consolidado, tendência por regressão linear, anomalias, alertas e impacto ambiental.

---

## 5. O que Cada Página Faz

A aplicação está organizada em páginas independentes com roteamento real via History API:

| Rota / URL | Página | Função Principal |
| :--- | :--- | :--- |
| `/` | **Página Inicial** | Apresenta a proposta do projeto, os fundamentos técnicos e acesso direto aos 4 cenários demonstrativos. |
| `/demonstracoes` | **Demonstrações** | Permite comparar e alternar entre os 4 cenários comerciais isolados (**Cafeteria**, **Mercado**, **Barbearia** e **Padaria**) ou restaurar individualmente cada cenário. |
| `/dashboard` | **Dashboard** | Painel principal com indicadores de consumo total, custo estimado, média diária, projeção mensal, gráfico diário, comparativo mensal consolidado, alertas recentes e impacto ambiental. |
| `/equipamentos` | **Equipamentos** | Inventário completo com busca, filtros por categoria e status, cadastro/edição com validação e ficha técnica individual contendo memória de cálculo e link para a fonte oficial do fabricante. |
| `/registros` | **Registros** | Histórico cronológico de leituras diárias e cumulativas de medidor, com prevenção de duplicidade de datas e exportação em CSV. |
| `/analises` | **Análises** | Separação das 4 categorias de dados (Potência Nominal, Consumo Estimado, Consumo Simulado e Consumo Medido), Comparativo Mensal Consolidado, regressão linear e participação percentual por equipamento. |
| `/alertas` | **Alertas** | Central de diagnóstico estruturado com título, prioridade, descrição, motivo, data, contexto quantitativo dos dados, recomendação de ação e controle de status (Aberto, Reconhecido, Resolvido). |
| `/relatorios` | **Relatórios** | Exportação aberta em CSV, JSON estruturado e visualização formatada para impressão / PDF executivo. |
| `/configuracoes` | **Configurações** | Parametrização da tarifa em $\text{R\$/kWh}$, documentação da referência ANEEL, sensibilidade de alertas, escolha entre Modo Claro e Modo Escuro e gerenciamento de dados do cenário. |
| `/sobre` | **Guia & Fórmulas** | Explicação didática das grandezas elétricas, fórmulas utilizadas e roteiro de 3 minutos para apresentação escolar. |

---

## 6. Conceitos de Potência, Consumo e Custo

### 6.1 Potência Elétrica Nominal ($\text{W}$ ou $\text{kW}$)
Representa a demanda instantânea de potência elétrica na entrada do equipamento quando energizado em regime nominal:

$$\text{Potência Total Instalada (W)} = \text{Potência Unitária (W)} \times \text{Quantidade}$$

$$\text{Potência em Quilowatts (kW)} = \frac{\text{Potência (W)}}{1000}$$

### 6.2 Consumo de Energia Elétrica ($\text{kWh}$)
Representa a energia elétrica efetivamente transformada ao longo do tempo, levando em conta o fator de utilização/ciclo ($\text{F}_{\text{ciclo}} \in [0,05 ; 1,00]$):

$$\text{Consumo (kWh)} = \frac{\text{Potência (W)}}{1000} \times \text{Tempo (horas)} \times \text{Quantidade} \times \text{F}_{\text{ciclo}}$$

### 6.3 Custo Financeiro Estimado ($\text{R\$}$)
Calculado pela multiplicação direta entre a energia consumida e a tarifa configurada:

$$\text{Custo Estimado (R\$)} = \text{Consumo (kWh)} \times \text{Tarifa (R\$/kWh)}$$

---

## 7. Como Funciona o Motor de Análise

O motor analítico (`runEnergyAnalysis`) é 100% determinístico e executa:

1. **Média Diária e Acumulado:** Soma os consumos diários validados e divide pelo número de dias únicos registrados.
2. **Projeção Mensal (30 dias):** Calcula a média diária da janela recente (até 30 dias) e projeta para o ciclo padrão de 30 dias ($\text{Média Diária} \times 30$).
3. **Tendência Linear (Mínimos Quadrados):** Calcula a inclinação ($\text{slope}$, em $\text{kWh/dia}$) da reta de regressão linear sobre a janela recente para indicar se o consumo está em elevação, estável ou em queda.
4. **Coeficiente de Variação ($\text{CV}$):** Mede a dispersão relativa ($\sigma / \mu \times 100\%$) para classificar o grau de confiança da projeção.
5. **Comparativo Mensal Consolidado:** Agrupa os registros pela competência `YYYY-MM` (imune a deslocamentos de fuso horário UTC), contabiliza dias únicos registrados no mês, calcula a média diária mensal, projeta o fechamento para meses parciais e calcula a variação percentual em relação ao mês imediatamente anterior (tratando meses sem base anterior com segurança, sem gerar `NaN` ou `Infinity`).

---

## 8. Como São Gerados os Alertas

Os alertas (`systemAlerts`) são disparados automaticamente por 5 regras auditáveis:

1. **Consumo diário acima da média histórica (Anomalia):** Quando o consumo de um dia (a partir do 4º registro) supera a média móvel dos até 7 dias imediatamente anteriores em percentual igual ou superior ao limite configurado (padrão: $+20\%$ para alerta e $+30\%$ para crítico).
2. **Aumento significativo entre períodos:** Quando a metade mais recente do período analisado apresenta elevação $\ge 6\%$ na comparação com a metade anterior.
3. **Equipamento com potência elevada:** Quando um único equipamento concentra $\ge 35\%$ da potência ativa instalada ou possui potência total $\ge 2.500\text{ W}$.
4. **Projeção de custo superior ao inventário:** Quando o ritmo das leituras diárias projeta um consumo mensal $\ge 10\%$ acima da estimativa teórica dos equipamentos cadastrados.
5. **Dados insuficientes:** Quando o cenário possui menos de 4 registros diários, informando claramente ao usuário em vez de produzir conclusões estatísticas enganosas.

---

## 9. Limitações do Protótipo

- **Ausência de medição física direta (IoT):** O sistema não realiza leitura automática de sensores de corrente; os dados provêm dos cenários demonstrativos ou da inserção manual pelo usuário.
- **Históricos demonstrativos simulados:** Embora as especificações dos equipamentos dos 4 cenários sejam reais e verificadas em fichas técnicas de fabricantes, as séries históricas de 65 dias são simulações matemáticas criadas para fins de demonstração.
- **Estimativa tarifária simplificada:** O cálculo $\text{kWh} \times \text{R\$/kWh}$ utiliza a tarifa de aplicação de referência (TUSD + TE) ou o valor ajustado pelo usuário, não simulando automaticamente alíquotas progressivas de ICMS, variações mensais de PIS/COFINS, bandeiras tarifárias dinâmicas ou a Contribuição de Iluminação Pública (CIP/COSIP).
- **Estimativa indireta de $\text{CO}_2$:** O cálculo ambiental utiliza o fator médio anual do Sistema Interligado Nacional (SIN/MCTI) e não constitui medição direta de emissões.

---

## 10. Possíveis Evoluções Futuras

1. **Simulador de Modalidade Tarifária Branca:** Comparar o custo do estabelecimento na tarifa convencional versus tarifa branca (postos ponta, intermediário e fora de ponta) com base no horário de uso de cada equipamento.
2. **Importação de Planilhas e Faturas:** Permitir upload direto de arquivos CSV de medidores inteligentes ou histórico de faturas dos últimos 12 meses.
3. **Metas Mensais Setoriais:** Definir orçamentos máximos de $\text{kWh/mês}$ por setor (ex.: Cozinha, Salão, Refrigeração) com acompanhamento de consumo acumulado no mês corrente.
