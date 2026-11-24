# Fontes Técnicas e Premissas de Engenharia — WattWise

Este documento registra todas as fontes técnicas verificadas, referências regulatórias de tarifa de energia elétrica, fator de emissão ambiental e premissas físicas adotadas nos 4 cenários demonstrativos do **WattWise**.

---

## 1. Referência Tarifária de Energia Elétrica (ANEEL)

- **Concessionária de Referência:** Enel Distribuição São Paulo (Enel SP)
- **Localidade de Referência:** São Paulo / SP (Área de concessão Enel SP)
- **Classe / Subgrupo Considerado:** Grupo B — **Subgrupo B3** (*Demais Classes: Comercial, Serviços e Outras Atividades em Baixa Tensão, Modalidade Convencional*)
- **Ato Regulatório Oficial:** **Resolução Homologatória ANEEL nº 3.596, de 30 de junho de 2026**
- **Período de Vigência:** 04 de julho de 2026 a 03 de julho de 2027
- **Composição da Tarifa de Aplicação Homologada (sem tributos):**
  - **TUSD (Tarifa de Uso do Sistema de Distribuição):** $\text{R\$ } 472,42/\text{MWh} = \text{R\$ } 0,47242/\text{kWh}$
  - **TE (Tarifa de Energia):** $\text{R\$ } 316,96/\text{MWh} = \text{R\$ } 0,31696/\text{kWh}$
  - **Tarifa Total Homologada (TUSD + TE):** $\text{R\$ } 0,78938/\text{kWh}$ (adotada como **$\text{R\$ } 0,79/\text{kWh}$** nos cenários padrão e editável pelo usuário em `/configuracoes`).
- **O que está e o que não está incluído:**
  - **Incluído:** Parcelas reguladas de distribuição (TUSD) e geração/compra de energia (TE) homologadas pela ANEEL.
  - **Não incluído:** Tributos estaduais e federais variáveis (ICMS, PIS/PASEP e COFINS), adicionais de Bandeiras Tarifárias mensais (Verde, Amarela ou Vermelha) e Contribuição para Custeio do Serviço de Iluminação Pública (CIP/COSIP).

---

## 2. Fator de Emissão de $\text{CO}_2$ da Matriz Elétrica Brasileira (MCTI / SIRENE)

- **Órgão Oficial:** Ministério da Ciência, Tecnologia e Inovação (**MCTI**) — Sistema de Registro Nacional de Emissões (**SIRENE**)
- **Indicador:** Fator Médio Anual de Emissão de $\text{CO}_2$ pela geração de energia elétrica no Sistema Interligado Nacional (**SIN**) para Inventários Corporativos (Escopo 2 — *Location-based*)
- **Valor Adotado:** **$0,0385\text{ tCO}_2/\text{MWh}$** = **$0,0385\text{ kg CO}_2/\text{kWh}$**
- **Ano-Base de Referência:** Série consolidada oficial MCTI/SIRENE (fechamento anual de referência 2023/2024)
- **URL Oficial de Referência:** `https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sirene/emissoes/fatores-de-emissao-de-co2-pela-geracao-de-energia-eletrica-no-sistema-interligado-nacional-sin-do-brasil`
- **Fórmula Aplicada:**
  $$\text{Emissões Estimadas (kg CO}_2\text{)} = \text{Consumo (kWh)} \times 0,0385\text{ kg CO}_2/\text{kWh}$$
- **Nota Metodológica:** Trata-se de estimativa indireta de emissões associadas ao consumo de energia elétrica da rede interligada, e não de medição física direta de gases.

---

## 3. Equipamentos Comerciais Reais e Fontes Técnicas por Cenário

Em todos os cenários, o consumo diário estimado de cada equipamento ativo segue a equação física:

$$\text{Consumo Diário (kWh/dia)} = \frac{\text{Potência Nominal (W)}}{1000} \times \text{Quantidade} \times \text{Horas/dia} \times \text{Fator de Operação}$$

### 3.1 Cenário 1: Cafeteria (`cafeteria`) — *Cafeteria Grão & Vapor*

| Equipamento | Fabricante | Modelo | Potência (W) | Qtd | Horas/dia | Fator Ciclo | Consumo Est. (kWh/dia) | Consumo Est. (30d) | Fonte Técnica / URL |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| Máquina de Café Expresso 2 Grupos | Nuova Simonelli | Appia Life 2Gr Volumétrica (11L) | 3.150 W | 1 | 10,0 h | 0,48 | 15,12 kWh | 453,6 kWh | Ficha Técnica Nuova Simonelli (`https://www.nuovasimonelli.it`) |
| Forno Elétrico de Convecção | Prática Technipan | Miniconv Classic (4 assadeiras 35x35) | 2.560 W | 1 | 4,5 h | 0,65 | 7,49 kWh | 224,6 kWh | Ficha Técnica Prática Miniconv 220V (`https://www.praticabr.com`) |
| Ar-Condicionado Split Inverter 24.000 BTU/h | LG | Dual Inverter Voice S4-Q24K231D | 2.040 W | 1 | 9,0 h | 0,62 | 11,38 kWh | 341,5 kWh | Ficha Técnica LG Dual Inverter 24k BTU (`https://www.lg.com/br`) |
| Expositor Refrigerado Vertical 410L | Gelopar | GPTU-40 Porta de Vidro | 248 W | 2 | 24,0 h | 0,42 | 5,00 kWh | 150,0 kWh | Catálogo Técnico Gelopar GPTU-40 (`https://www.gelopar.com.br`) |
| Forno Micro-ondas Profissional Inox 34L | Menumaster (Middleby) | RCS511TS Commercial | 1.550 W | 1 | 2,5 h | 0,85 | 3,29 kWh | 98,8 kWh | Especificação Menumaster RCS511TS (`https://www.middleby.com.br`) |
| Painel LED Comercial Embutir 36W | Philips (Signify) | CoreLine RC132V LED36S/840 | 36 W | 10 | 12,0 h | 1,00 | 4,32 kWh | 129,6 kWh | Catálogo Philips Lighting (`https://www.lighting.philips.com.br`) |
| Moinho Dosador Eletrônico *(Inativo)* | Fiorenzato | F64 Evo On Demand | 350 W | 1 | 1,5 h | 0,50 | 0,00 kWh | 0,0 kWh | Ficha Técnica Fiorenzato (`https://www.fiorenzato.it`) |

- **Potência Nominal Ativa Instalada:** $10.156\text{ W}$ ($10,16\text{ kW}$)
- **Consumo Diário Estimado pelo Inventário:** $46,60\text{ kWh/dia}$ ($1.398,1\text{ kWh/mês}$)

---

### 3.2 Cenário 2: Mercado (`mercado`) — *Minimercado Bom Bairro*

| Equipamento | Fabricante | Modelo | Potência (W) | Qtd | Horas/dia | Fator Ciclo | Consumo Est. (kWh/dia) | Consumo Est. (30d) | Fonte Técnica / URL |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| Expositor Refrigerado Vertical 570L | Gelopar | GRV-57 Porta de Vidro | 390 W | 3 | 24,0 h | 0,50 | 14,04 kWh | 421,2 kWh | Catálogo Técnico Gelopar GRV-57 (`https://www.gelopar.com.br`) |
| Freezer Horizontal 2 Tampas 546L | Metalfrio | DA550 Dupla Ação | 331 W | 2 | 24,0 h | 0,52 | 8,26 kWh | 247,9 kWh | Ficha Técnica Metalfrio DA550 (`https://www.metalfrio.com.br`) |
| Refrigerador Comercial 4 Portas Inox | Gelopar | GREP-4P Gastronômico 1350L | 520 W | 1 | 24,0 h | 0,50 | 6,24 kWh | 187,2 kWh | Catálogo Técnico Gelopar GREP-4P (`https://www.gelopar.com.br`) |
| Ar-Condicionado Split Inverter 24.000 BTU/h | LG | Dual Inverter Voice S4-Q24K231D | 2.040 W | 2 | 11,0 h | 0,60 | 26,93 kWh | 807,8 kWh | Ficha Técnica LG Dual Inverter (`https://www.lg.com/br`) |
| Lâmpada LED Tubular T8 1200mm 18W | Philips (Signify) | Master LEDtube T8 18W/865 | 18 W | 24 | 14,0 h | 1,00 | 6,05 kWh | 181,4 kWh | Ficha Técnica Philips LEDtube (`https://www.lighting.philips.com.br`) |
| Check-out PDV + Balança Digital | Elgin + Toledo | Elgin M10 + Toledo Prix 4 Uno | 180 W | 2 | 13,0 h | 0,85 | 3,98 kWh | 119,3 kWh | Manuais Técnicos Toledo / Elgin (`https://www.toledobrasil.com`) |
| Cortina de Ar Comercial 150cm *(Inativo)* | Elgin | CAD-3015-2 | 260 W | 1 | 8,0 h | 1,00 | 0,00 kWh | 0,0 kWh | Catálogo Elgin Climatização (`https://www.elgin.com.br`) |

- **Potência Nominal Ativa Instalada:** $7.224\text{ W}$ ($7,22\text{ kW}$)
- **Consumo Diário Estimado pelo Inventário:** $65,50\text{ kWh/dia}$ ($1.964,8\text{ kWh/mês}$)

---

### 3.3 Cenário 3: Barbearia (`barbearia`) — *Barbearia Clássica Navalha*

| Equipamento | Fabricante | Modelo | Potência (W) | Qtd | Horas/dia | Fator Ciclo | Consumo Est. (kWh/dia) | Consumo Est. (30d) | Fonte Técnica / URL |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| Secador de Cabelo Profissional 2500W | Taiff | Vulcan V12 2500W (220V) | 2.500 W | 3 | 2,2 h | 0,75 | 12,38 kWh | 371,3 kWh | Ficha Técnica Taiff Vulcan (`https://www.taiff.com.br`) |
| Máquina de Corte Profissional V9000 | Wahl | Legend Classic Series (Com Fio) | 10 W | 4 | 5,0 h | 0,85 | 0,17 kWh | 5,1 kWh | Especificação Wahl Brasil (`https://www.lojawahlbrasil.com.br`) |
| Ar-Condicionado Split Inverter 18.000 BTU/h | LG | Dual Inverter Voice S4-Q18KL31A | 1.640 W | 1 | 10,0 h | 0,58 | 9,51 kWh | 285,4 kWh | Ficha Técnica LG Dual Inverter 18k (`https://www.lg.com/br`) |
| Painel LED Slim 24W Sobrepor | Taschibra | Painel LED 24W 6500K Autovolt | 24 W | 10 | 11,0 h | 1,00 | 2,64 kWh | 79,2 kWh | Catálogo Taschibra (`https://www.taschibra.com.br`) |
| Expositor Refrigerado Compacto 228L | Gelopar | GPTU-230 Porta de Vidro | 184 W | 1 | 24,0 h | 0,40 | 1,77 kWh | 53,0 kWh | Ficha Técnica Gelopar GPTU-230 (`https://www.gelopar.com.br`) |
| Autoclave Horizontal de Bancada 12L | Cristófoli | Vitale Class 12L Inox | 1.200 W | 1 | 1,2 h | 0,80 | 1,15 kWh | 34,6 kWh | Manual Cristófoli Vitale Class (`https://www.cristofoli.com`) |
| Secador Profissional Reserva *(Inativo)* | Taiff | Tourmaline Ion Cerâmica 2100W | 2.100 W | 1 | 1,0 h | 0,75 | 0,00 kWh | 0,0 kWh | Ficha Técnica Taiff Tourmaline (`https://www.taiff.com.br`) |

- **Potência Nominal Ativa Instalada:** $10.804\text{ W}$ ($10,80\text{ kW}$)
- **Consumo Diário Estimado pelo Inventário:** $27,62\text{ kWh/dia}$ ($828,6\text{ kWh/mês}$)

---

### 3.4 Cenário 4: Padaria (`padaria`) — *Padaria & Confeitaria Forno D'Ouro*

| Equipamento | Fabricante | Modelo | Potência (W) | Qtd | Horas/dia | Fator Ciclo | Consumo Est. (kWh/dia) | Consumo Est. (30d) | Fonte Técnica / URL |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| Forno Turbo Elétrico 5 Esteiras | Progás | PRP-5000 New Eletric (58x70 cm) | 8.360 W | 1 | 6,5 h | 0,68 | 36,95 kWh | 1.108,5 kWh | Manual Técnico Progás PRP-5000NE (`https://www.progas.com.br`) |
| Amassadeira / Masseira Rápida 25 kg | G.Paniz | AR-25 Inox (Motor 3 CV = 3 × 736 W) | 2.208 W | 1 | 2,5 h | 0,80 | 4,42 kWh | 132,5 kWh | Ficha Técnica G.Paniz AR-25 (`https://www.gpaniz.com.br`) |
| Refrigerador Comercial 4 Portas Inox | Gelopar | GREP-4P Gastronômico 1350L | 520 W | 1 | 24,0 h | 0,52 | 6,49 kWh | 194,7 kWh | Catálogo Gelopar GREP-4P (`https://www.gelopar.com.br`) |
| Freezer Horizontal Comercial 546L | Metalfrio | DA550 Dupla Ação | 331 W | 1 | 24,0 h | 0,52 | 4,13 kWh | 123,9 kWh | Ficha Técnica Metalfrio DA550 (`https://www.metalfrio.com.br`) |
| Vitrine Estufa Termostática + Fatiador | Titã + Bermar | Vitrine 12 Bandejas + Fatiador BM-19 | 650 W | 1 | 12,0 h | 0,60 | 4,68 kWh | 140,4 kWh | Catálogos Técnicos Bermar / Titã (`https://www.bermar.ind.br`) |
| Luminárias LED Lineares 36W | Philips (Signify) | CoreLine LED 36W 4000K | 36 W | 14 | 14,0 h | 1,00 | 7,06 kWh | 211,7 kWh | Catálogo Philips Lighting (`https://www.lighting.philips.com.br`) |
| Batedeira Planetária 12L *(Inativo)* | G.Paniz | BP-12 Rápida (Motor 0,5 CV) | 370 W | 1 | 1,5 h | 0,70 | 0,00 kWh | 0,0 kWh | Ficha Técnica G.Paniz BP-12 (`https://www.gpaniz.com.br`) |

- **Potência Nominal Ativa Instalada:** $12.573\text{ W}$ ($12,57\text{ kW}$)
- **Consumo Diário Estimado pelo Inventário:** $63,73\text{ kWh/dia}$ ($1.911,7\text{ kWh/mês}$)
