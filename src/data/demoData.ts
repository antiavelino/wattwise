import {
  AppDataState,
  AppSettings,
  ConsumptionRecord,
  DemoScenarioId,
  DemoScenarioMeta,
  Equipment,
} from '../types/energy';
import { shiftIsoDate } from '../utils/formatters';

export const DATA_SCHEMA_VERSION = 3;

export const DEFAULT_DEMO_SCENARIO_ID: DemoScenarioId = 'cafeteria';

/**
 * Referência Tarifária Oficial Documentada:
 * Concessionária: Enel Distribuição São Paulo (Enel SP)
 * Ato Regulatório: Resolução Homologatória ANEEL nº 3.596, de 30 de junho de 2026
 * Vigência: 04/07/2026 a 03/07/2027
 * Subgrupo B3 (Demais Classes — Comércio e Serviços em Baixa Tensão, Modalidade Convencional):
 * TUSD = R$ 0,47242/kWh + TE = R$ 0,31696/kWh => Tarifa de Aplicação Homologada = R$ 0,78938/kWh (arredondada para R$ 0,79/kWh sem tributos).
 */
export const OFFICIAL_TARIFF_REFERENCE = {
  tariffPerKwh: 0.79,
  referenceLocation: 'São Paulo / SP — Área de Concessão Enel Distribuição São Paulo',
  consumerClass: 'Grupo B · Subgrupo B3 — Comercial, Serviços e Outras Atividades (Baixa Tensão Convencional)',
  tariffSource:
    'ANEEL — Resolução Homologatória nº 3.596, de 30/06/2026 (TUSD R$ 0,47242/kWh + TE R$ 0,31696/kWh = R$ 0,78938/kWh)',
  tariffReferenceDate: 'Vigência: 04/07/2026 a 03/07/2027',
  tariffTaxNote:
    'Valor referente à tarifa de aplicação homologada pela ANEEL (TUSD + TE), sem inclusão de tributos variáveis (ICMS, PIS/COFINS), adicionais de bandeiras tarifárias mensais ou Contribuição de Iluminação Pública (CIP/COSIP). O usuário pode ajustar a tarifa manualmente para simular o valor final com impostos da sua fatura.',
};

/**
 * Referência Oficial do Fator Médio Anual de Emissão de CO2 da Matriz Elétrica Brasileira (SIN):
 * Fonte: Ministério da Ciência, Tecnologia e Inovação (MCTI) — Sistema de Registro Nacional de Emissões (SIRENE).
 * Valor consolidado: 0,0385 tCO2/MWh = 0,0385 kg CO2/kWh.
 */
export const OFFICIAL_EMISSION_REFERENCE = {
  emissionFactorKgPerKwh: 0.0385,
  emissionFactorSource:
    'MCTI / SIRENE — Fator Médio Anual de Emissão de CO₂ do Sistema Interligado Nacional (SIN) para Inventários Corporativos',
  emissionFactorYear: 'Ano-base consolidado 2023/2024 (0,0385 tCO₂/MWh)',
};

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenarioMeta> = {
  cafeteria: {
    id: 'cafeteria',
    name: 'Cafeteria Grão & Vapor (Demonstrativo)',
    shortLabel: 'Cafeteria',
    segment: 'Alimentação & Cafeteria Especial',
    description:
      'Cafeteria urbana com máquina de expresso profissional de 2 grupos, forno de convecção para folhados, vitrines refrigeradas, climatização inverter e iluminação LED.',
    operatingHoursSummary: 'Seg a Sáb · 07h00 às 19h00 (12h de atendimento)',
    floorAreaM2: 85,
    highlightNote:
      'Destaque técnico: separação entre potência térmica da caldeira de expresso (3.150 W) e consumo efetivo modulado por pressostato.',
  },
  mercado: {
    id: 'mercado',
    name: 'Minimercado Bom Bairro (Demonstrativo)',
    shortLabel: 'Mercado',
    segment: 'Varejo Alimentar & Mercearia',
    description:
      'Minimercado de bairro com operação 24h de refrigeração comercial (expositores verticais e freezers horizontais), climatização de salão, iluminação linear e frente de caixa (PDV).',
    operatingHoursSummary: 'Seg a Dom · 07h00 às 21h00 (Refrigeração ligada 24h)',
    floorAreaM2: 180,
    highlightNote:
      'Destaque técnico: carga base contínua 24h de compressores frigoríficos combinada com climatização em horário comercial.',
  },
  barbearia: {
    id: 'barbearia',
    name: 'Barbearia Clássica Navalha (Demonstrativo)',
    shortLabel: 'Barbearia',
    segment: 'Serviços Pessoais & Estética Masculina',
    description:
      'Barbearia com 4 cadeiras de atendimento, secadores profissionais de alta potência (2.500 W), máquinas de corte com motor eletromagnético V9000, autoclave de biossegurança e frigobar.',
    operatingHoursSummary: 'Ter a Sáb · 09h00 às 20h00 (Pico às sextas e sábados)',
    floorAreaM2: 65,
    highlightNote:
      'Destaque técnico: contraste entre alta potência instantânea de secadores (7,5 kW somados) e baixo consumo de máquinas de corte (10 W).',
  },
  padaria: {
    id: 'padaria',
    name: "Padaria & Confeitaria Forno D'Ouro (Demonstrativo)",
    shortLabel: 'Padaria',
    segment: 'Panificação & Confeitaria Artesanal',
    description:
      'Padaria com forno turbo elétrico industrial de 5 esteiras (8.360 W), amassadeira rápida de 25 kg (3 CV), câmara refrigerada 4 portas, freezer de insumos e estufa térmica.',
    operatingHoursSummary: 'Seg a Dom · Produção a partir das 04h30 · Atendimento até 20h00',
    floorAreaM2: 150,
    highlightNote:
      'Destaque técnico: domínio energético de equipamentos eletrotérmicos trifásicos (forno turbo de 8,36 kW) nos turnos da madrugada e tarde.',
  },
};

export const DEMO_SCENARIO_LIST: DemoScenarioMeta[] = [
  DEMO_SCENARIOS.cafeteria,
  DEMO_SCENARIOS.mercado,
  DEMO_SCENARIOS.barbearia,
  DEMO_SCENARIOS.padaria,
];

function buildScenarioEquipment(scenarioId: DemoScenarioId, nowIso: string): Equipment[] {
  switch (scenarioId) {
    case 'cafeteria':
      return [
        {
          id: 'caf_eq_1',
          name: 'Máquina de Café Expresso Profissional 2 Grupos',
          manufacturer: 'Nuova Simonelli',
          model: 'Appia Life 2 Grupos Volumétrica (Caldeira 11L)',
          category: 'Cocção e Aquecimento',
          location: 'Balcão de Barista',
          powerWatts: 3150,
          quantity: 1,
          dailyUsageHours: 10,
          usageFactor: 0.48,
          status: 'active',
          technicalSource:
            'Ficha Técnica Oficial Nuova Simonelli Appia Life 2Gr (220V Monofásico — Resistência 3.150 W)',
          sourceUrl: 'https://www.nuovasimonelli.it',
          notes:
            'Potência elétrica nominal da resistência da caldeira (3.150 W). Fator de ciclo de 48% devido ao isolamento Drytex Thermal e controle por pressostato.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_2',
          name: 'Forno Elétrico de Convecção 4 Assadeiras',
          manufacturer: 'Prática Technipan',
          model: 'Miniconv Classic (35x35 cm · 220V)',
          category: 'Cocção e Aquecimento',
          location: 'Copa de Apoio',
          powerWatts: 2560,
          quantity: 1,
          dailyUsageHours: 4.5,
          usageFactor: 0.65,
          status: 'active',
          technicalSource:
            'Ficha Técnica Prática Miniconv 220V Monofásico — Potência Elétrica Instalada 2,56 kW (16 A)',
          sourceUrl: 'https://www.praticabr.com',
          notes:
            'Utilizado para assar pães de queijo, croissants e folhados em lotes. Termostato modula a resistência em ~65% do tempo ligado.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_3',
          name: 'Ar-Condicionado Split Inverter 24.000 BTU/h',
          manufacturer: 'LG',
          model: 'Dual Inverter Voice S4-Q24K231D',
          category: 'Climatização',
          location: 'Salão de Clientes',
          powerWatts: 2040,
          quantity: 1,
          dailyUsageHours: 9,
          usageFactor: 0.62,
          status: 'active',
          technicalSource:
            'Ficha Técnica LG Dual Inverter Voice 24.000 BTU/h — Potência elétrica de entrada em refrigeração: 2.040 W (Classificação A Inmetro)',
          sourceUrl: 'https://www.lg.com/br',
          notes:
            'Importante: 24.000 BTU/h é a capacidade térmica; a potência elétrica nominal de entrada é 2.040 W. O compressor Inverter opera em carga parcial média de 62%.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_4',
          name: 'Expositor Refrigerado Vertical 410 Litros',
          manufacturer: 'Gelopar',
          model: 'GPTU-40 Porta de Vidro (0°C a +7°C)',
          category: 'Refrigeração',
          location: 'Salão e Retaguarda',
          powerWatts: 248,
          quantity: 2,
          dailyUsageHours: 24,
          usageFactor: 0.42,
          status: 'active',
          technicalSource:
            'Catálogo Técnico Gelopar GPTU-40 — Potência nominal elétrica: 248 W (Consumo médio de referência ~2,1 a 2,5 kWh/dia por unidade)',
          sourceUrl: 'https://www.gelopar.com.br',
          notes:
            'Permanece energizado 24h/dia. O compressor aciona sob demanda do controlador eletrônico digital (~42% do tempo).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_5',
          name: 'Forno Micro-ondas Profissional Inox 34L',
          manufacturer: 'Menumaster (Middleby)',
          model: 'RCS511TS Commercial',
          category: 'Cocção e Aquecimento',
          location: 'Balcão de Atendimento',
          powerWatts: 1550,
          quantity: 1,
          dailyUsageHours: 2.5,
          usageFactor: 0.85,
          status: 'active',
          technicalSource:
            'Especificação Técnica Menumaster RCS511TS — Potência elétrica de entrada: 1.550 W (Potência útil de saída RF: 1.100 W)',
          sourceUrl: 'https://www.middleby.com.br',
          notes:
            'Considera-se a potência elétrica de entrada da rede (1.550 W) e não a potência de cocção por micro-ondas (1.100 W).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_6',
          name: 'Painel LED Comercial de Embutir 36W',
          manufacturer: 'Philips (Signify)',
          model: 'CoreLine RC132V LED36S/840 PSU W60L60',
          category: 'Iluminação',
          location: 'Salão, Balcão e Copa',
          powerWatts: 36,
          quantity: 10,
          dailyUsageHours: 12,
          usageFactor: 1.0,
          status: 'active',
          technicalSource:
            'Catálogo Philips Lighting Brasil — Luminária LED 36 W (Fator de potência > 0,92)',
          sourceUrl: 'https://www.lighting.philips.com.br',
          notes: 'Carga resistiva/driver constante (fator de operação 100% durante o expediente).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'caf_eq_7',
          name: 'Moinho Dosador Eletrônico de Café (Reserva)',
          manufacturer: 'Fiorenzato',
          model: 'F64 Evo On Demand',
          category: 'Maquinário',
          location: 'Bancada de Torra / Reserva',
          powerWatts: 350,
          quantity: 1,
          dailyUsageHours: 1.5,
          usageFactor: 0.5,
          status: 'inactive',
          technicalSource:
            'Ficha Técnica Fiorenzato F64 Evo — Motor elétrico 350 W (220V / 60Hz)',
          sourceUrl: 'https://www.fiorenzato.it',
          notes: 'Equipamento reserva mantido desligado na operação padrão.',
          isDemo: true,
          updatedAt: nowIso,
        },
      ];

    case 'mercado':
      return [
        {
          id: 'mer_eq_1',
          name: 'Expositor Refrigerado Vertical 570 Litros',
          manufacturer: 'Gelopar',
          model: 'GRV-57 Porta de Vidro (Bebidas e Laticínios)',
          category: 'Refrigeração',
          location: 'Corredor de Bebidas e Frios',
          powerWatts: 390,
          quantity: 3,
          dailyUsageHours: 24,
          usageFactor: 0.5,
          status: 'active',
          technicalSource:
            'Catálogo Técnico Gelopar Linha GRV-57 — Potência nominal 390 W (Consumo médio ~3,7 a 4,6 kWh/dia conforme abertura de portas)',
          sourceUrl: 'https://www.gelopar.com.br',
          notes:
            '3 expositores ligados 24h/dia com ciclo médio de compressor de 50% devido à abertura frequente de portas pelos clientes.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_2',
          name: 'Freezer Horizontal Comercial 2 Tampas 546L',
          manufacturer: 'Metalfrio',
          model: 'DA550 Dupla Ação',
          category: 'Refrigeração',
          location: 'Ilha de Congelados',
          powerWatts: 331,
          quantity: 2,
          dailyUsageHours: 24,
          usageFactor: 0.52,
          status: 'active',
          technicalSource:
            'Ficha Técnica Metalfrio DA550 Convencional — Potência elétrica nominal: 331 W (Capacidade 546 L)',
          sourceUrl: 'https://www.metalfrio.com.br',
          notes: 'Operação contínua 24h em modo freezer (-18°C a -22°C).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_3',
          name: 'Refrigerador Comercial 4 Portas Inox 1350L',
          manufacturer: 'Gelopar',
          model: 'GREP-4P Gastronômico',
          category: 'Refrigeração',
          location: 'Retaguarda de Frios e Açougue',
          powerWatts: 520,
          quantity: 1,
          dailyUsageHours: 24,
          usageFactor: 0.5,
          status: 'active',
          technicalSource:
            'Catálogo Técnico Gelopar GREP-4P — Potência nominal de referência: 520 W (Consumo médio ~5,5 a 6,2 kWh/dia)',
          sourceUrl: 'https://www.gelopar.com.br',
          notes: 'Conservação de frios e perecíveis em regime 24h.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_4',
          name: 'Ar-Condicionado Split Inverter 24.000 BTU/h',
          manufacturer: 'LG',
          model: 'Dual Inverter Voice S4-Q24K231D',
          category: 'Climatização',
          location: 'Salão de Vendas',
          powerWatts: 2040,
          quantity: 2,
          dailyUsageHours: 11,
          usageFactor: 0.6,
          status: 'active',
          technicalSource:
            'Ficha Técnica LG Dual Inverter Voice 24.000 BTU/h — Potência elétrica nominal: 2.040 W por unidade',
          sourceUrl: 'https://www.lg.com/br',
          notes: '2 aparelhos climatizando o salão comercial para conforto térmico e menor carga nos expositores.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_5',
          name: 'Lâmpada LED Tubular T8 1200mm 18W',
          manufacturer: 'Philips (Signify)',
          model: 'Master LEDtube T8 18W/865 G13',
          category: 'Iluminação',
          location: 'Corredores, Gôndolas e Estoque',
          powerWatts: 18,
          quantity: 24,
          dailyUsageHours: 14,
          usageFactor: 1.0,
          status: 'active',
          technicalSource:
            'Ficha Técnica Philips Master LEDtube 1200mm — Potência elétrica unitária: 18 W',
          sourceUrl: 'https://www.lighting.philips.com.br',
          notes: '24 tubos LED totalizando 432 W em regime contínuo durante as 14h de loja aberta.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_6',
          name: 'Check-out PDV + Balança Computadora Digital',
          manufacturer: 'Elgin + Toledo do Brasil',
          model: 'Terminal Elgin M10 + Balança Toledo Prix 4 Uno',
          category: 'TI e Escritório',
          location: 'Frente de Caixa (2 Check-outs)',
          powerWatts: 180,
          quantity: 2,
          dailyUsageHours: 13,
          usageFactor: 0.85,
          status: 'active',
          technicalSource:
            'Manuais Técnicos Toledo Prix 4 Uno e Elgin Automação Comercial (Computador PDV + Monitor + Impressora Térmica + Balança)',
          sourceUrl: 'https://www.toledobrasil.com',
          notes: 'Conjunto por caixa: computador compacto, monitor touch, leitor óptico e balança.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'mer_eq_7',
          name: 'Cortina de Ar Comercial 150cm (Entrada Lateral)',
          manufacturer: 'Elgin',
          model: 'CAD-3015-2 (220V)',
          category: 'Climatização',
          location: 'Acesso Secundário',
          powerWatts: 260,
          quantity: 1,
          dailyUsageHours: 8,
          usageFactor: 1.0,
          status: 'inactive',
          technicalSource:
            'Catálogo Elgin Climatização — Cortina de Ar 1,50 m (Potência elétrica: 260 W)',
          sourceUrl: 'https://www.elgin.com.br',
          notes: 'Acesso lateral fechado no momento.',
          isDemo: true,
          updatedAt: nowIso,
        },
      ];

    case 'barbearia':
      return [
        {
          id: 'bar_eq_1',
          name: 'Secador de Cabelo Profissional 2500W',
          manufacturer: 'Taiff',
          model: 'Vulcan V12 2500W Íons (220V)',
          category: 'Cocção e Aquecimento',
          location: 'Bancadas de Atendimento 1 a 3',
          powerWatts: 2500,
          quantity: 3,
          dailyUsageHours: 2.2,
          usageFactor: 0.75,
          status: 'active',
          technicalSource:
            'Ficha Técnica Oficial Taiff Vulcan 220V — Potência elétrica nominal: 2.500 W (Motor AC Profissional V12)',
          sourceUrl: 'https://www.taiff.com.br',
          notes:
            'Alta potência instantânea (7.500 W somados), mas uso intermitente (~2,2h acumuladas/dia por bancada em finalizações).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_2',
          name: 'Máquina de Corte Profissional Motor V9000',
          manufacturer: 'Wahl',
          model: 'Legend Classic Series (Com Fio)',
          category: 'Maquinário',
          location: 'Bancadas de Atendimento 1 a 4',
          powerWatts: 10,
          quantity: 4,
          dailyUsageHours: 5,
          usageFactor: 0.85,
          status: 'active',
          technicalSource:
            'Especificação Técnica Wahl Clipper Brasil — Máquina de Corte Motor Eletromagnético V9000 (Potência nominal: 10 W)',
          sourceUrl: 'https://www.lojawahlbrasil.com.br',
          notes:
            'Excelente exemplo didático: apesar do uso intenso (5h/dia em 4 bancadas), a potência elétrica é de apenas 10 W por máquina.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_3',
          name: 'Ar-Condicionado Split Inverter 18.000 BTU/h',
          manufacturer: 'LG',
          model: 'Dual Inverter Voice S4-Q18KL31A',
          category: 'Climatização',
          location: 'Salão Principal da Barbearia',
          powerWatts: 1640,
          quantity: 1,
          dailyUsageHours: 10,
          usageFactor: 0.58,
          status: 'active',
          technicalSource:
            'Ficha Técnica LG Dual Inverter Voice 18.000 BTU/h — Potência elétrica de entrada em refrigeração: 1.640 W',
          sourceUrl: 'https://www.lg.com/br',
          notes: 'Climatização contínua durante o expediente para compensar o calor dissipado pelos secadores.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_4',
          name: 'Painel LED Slim 24W + Iluminação de Espelhos',
          manufacturer: 'Taschibra',
          model: 'Painel LED Sobrepor 24W 6500K',
          category: 'Iluminação',
          location: 'Bancadas de Corte e Recepção',
          powerWatts: 24,
          quantity: 10,
          dailyUsageHours: 11,
          usageFactor: 1.0,
          status: 'active',
          technicalSource:
            'Catálogo Técnico Taschibra Iluminação — Painel LED 24 W Autovolt',
          sourceUrl: 'https://www.taschibra.com.br',
          notes: 'Iluminação de alto índice de reprodução de cor para precisão nos cortes.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_5',
          name: 'Expositor Refrigerado Compacto 228 Litros',
          manufacturer: 'Gelopar',
          model: 'GPTU-230 Porta de Vidro',
          category: 'Refrigeração',
          location: 'Recepção / Lounge de Espera',
          powerWatts: 184,
          quantity: 1,
          dailyUsageHours: 24,
          usageFactor: 0.4,
          status: 'active',
          technicalSource:
            'Ficha Técnica Gelopar GPTU-230 — Potência nominal declarada: 184 W (Consumo de referência ~1,4 a 1,8 kWh/dia)',
          sourceUrl: 'https://www.gelopar.com.br',
          notes: 'Geladeira de bebidas para clientes na recepção, ligada 24h com controle termostático.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_6',
          name: 'Autoclave Horizontal de Bancada 12 Litros',
          manufacturer: 'Cristófoli',
          model: 'Vitale Class 12L Inox',
          category: 'Cocção e Aquecimento',
          location: 'Área de Esterilização',
          powerWatts: 1200,
          quantity: 1,
          dailyUsageHours: 1.2,
          usageFactor: 0.8,
          status: 'active',
          technicalSource:
            'Manual Técnico Cristófoli Vitale Class 12L — Potência elétrica: 1.200 W (220V)',
          sourceUrl: 'https://www.cristofoli.com',
          notes: 'Realiza 2 ciclos diários de esterilização de navalhas, tesouras e instrumentais metálicos.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'bar_eq_7',
          name: 'Secador Profissional Reserva 2100W',
          manufacturer: 'Taiff',
          model: 'Tourmaline Ion Cerâmica 2100W',
          category: 'Cocção e Aquecimento',
          location: 'Armário Técnico',
          powerWatts: 2100,
          quantity: 1,
          dailyUsageHours: 1,
          usageFactor: 0.75,
          status: 'inactive',
          technicalSource:
            'Ficha Técnica Oficial Taiff Tourmaline — Potência elétrica nominal: 2.100 W',
          sourceUrl: 'https://www.taiff.com.br',
          notes: 'Equipamento suplente mantido inativo.',
          isDemo: true,
          updatedAt: nowIso,
        },
      ];

    case 'padaria':
      return [
        {
          id: 'pad_eq_1',
          name: 'Forno Turbo Elétrico 5 Esteiras',
          manufacturer: 'Progás',
          model: 'PRP-5000 New Eletric (58x70 cm)',
          category: 'Cocção e Aquecimento',
          location: 'Setor de Fornos (Produção)',
          powerWatts: 8360,
          quantity: 1,
          dailyUsageHours: 6.5,
          usageFactor: 0.68,
          status: 'active',
          technicalSource:
            'Manual Técnico Progás PRP-5000 New Eletric — Potência elétrica total instalada: 8.360 W (8,36 kW)',
          sourceUrl: 'https://www.progas.com.br',
          notes:
            'Principal carga elétrica da padaria. Opera em fornadas concentradas na madrugada (04h30–08h30) e à tarde (14h30–17h00).',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_2',
          name: 'Amassadeira / Masseira Rápida 25 kg (3 CV)',
          manufacturer: 'G.Paniz',
          model: 'AR-25 Cuba em Aço Inox',
          category: 'Maquinário',
          location: 'Setor de Massas',
          powerWatts: 2208,
          quantity: 1,
          dailyUsageHours: 2.5,
          usageFactor: 0.8,
          status: 'active',
          technicalSource:
            'Ficha Técnica G.Paniz AR-25 — Motor elétrico de 3 CV (Conversão física: 3 × 736 W = 2.208 W)',
          sourceUrl: 'https://www.gpaniz.com.br',
          notes: 'Acionada em bateladas de 10 a 15 minutos para preparo de massa de pão francês e pães especiais.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_3',
          name: 'Refrigerador Comercial 4 Portas Inox 1350L',
          manufacturer: 'Gelopar',
          model: 'GREP-4P Gastronômico',
          category: 'Refrigeração',
          location: 'Área de Confeitaria e Insumos',
          powerWatts: 520,
          quantity: 1,
          dailyUsageHours: 24,
          usageFactor: 0.52,
          status: 'active',
          technicalSource:
            'Catálogo Técnico Gelopar GREP-4P — Potência nominal elétrica: 520 W',
          sourceUrl: 'https://www.gelopar.com.br',
          notes: 'Operação 24h em ambiente de cozinha com maior carga térmica.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_4',
          name: 'Freezer Horizontal Comercial 546 Litros',
          manufacturer: 'Metalfrio',
          model: 'DA550 Dupla Ação',
          category: 'Refrigeração',
          location: 'Estoque de Congelados',
          powerWatts: 331,
          quantity: 1,
          dailyUsageHours: 24,
          usageFactor: 0.52,
          status: 'active',
          technicalSource:
            'Ficha Técnica Metalfrio DA550 — Potência elétrica nominal: 331 W',
          sourceUrl: 'https://www.metalfrio.com.br',
          notes: 'Armazenamento de salgados, folhados ultracongelados e polpas.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_5',
          name: 'Vitrine Estufa Termostática + Fatiador de Frios',
          manufacturer: 'Titã + Bermar',
          model: 'Vitrine Aquecida 12 Bandejas + Fatiador BM-19 Inox',
          category: 'Cocção e Aquecimento',
          location: 'Balcão de Atendimento',
          powerWatts: 650,
          quantity: 1,
          dailyUsageHours: 12,
          usageFactor: 0.6,
          status: 'active',
          technicalSource:
            'Catálogos Técnicos Titã Eletrocomerciais (Resistência 400 W) e Bermar BM-19 (Motor 1/3 CV ~250 W)',
          sourceUrl: 'https://www.bermar.ind.br',
          notes: 'Equipamentos auxiliares de balcão em funcionamento ao longo do atendimento.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_6',
          name: 'Luminárias LED Lineares 36W (Produção e Salão)',
          manufacturer: 'Philips (Signify)',
          model: 'CoreLine LED 36W 4000K',
          category: 'Iluminação',
          location: 'Salão de Vendas e Panificação',
          powerWatts: 36,
          quantity: 14,
          dailyUsageHours: 14,
          usageFactor: 1.0,
          status: 'active',
          technicalSource:
            'Catálogo Philips Lighting Brasil — Luminária LED 36 W (14 un. = 504 W instalados)',
          sourceUrl: 'https://www.lighting.philips.com.br',
          notes: 'Operação contínua desde a abertura da produção às 04h30.',
          isDemo: true,
          updatedAt: nowIso,
        },
        {
          id: 'pad_eq_7',
          name: 'Batedeira Planetária Industrial 12 Litros',
          manufacturer: 'G.Paniz',
          model: 'BP-12 Rápida (Motor 0,5 CV)',
          category: 'Maquinário',
          location: 'Bancada de Confeitaria',
          powerWatts: 370,
          quantity: 1,
          dailyUsageHours: 1.5,
          usageFactor: 0.7,
          status: 'inactive',
          technicalSource:
            'Ficha Técnica G.Paniz BP-12 — Motor 1/2 CV (370 W)',
          sourceUrl: 'https://www.gpaniz.com.br',
          notes: 'Acionada apenas em dias específicos de encomenda de bolos confeitados.',
          isDemo: true,
          updatedAt: nowIso,
        },
      ];
  }
}

interface ScenarioProfileSeed {
  baseDailyKwh: number;
  weekendFactor: number;
  primaryHotEquipmentId: string;
  secondaryHotEquipmentId: string;
  anomaly1Note: string;
  anomaly2Note: string;
  normalNote: string;
}

const SCENARIO_SEEDS: Record<DemoScenarioId, ScenarioProfileSeed> = {
  cafeteria: {
    baseDailyKwh: 46.6,
    weekendFactor: 0.88,
    primaryHotEquipmentId: 'caf_eq_1',
    secondaryHotEquipmentId: 'caf_eq_3',
    anomaly1Note:
      'Pico simulado: evento corporativo com uso contínuo do forno de convecção Prática Miniconv e ar-condicionado LG 24k BTU',
    anomaly2Note:
      'Anomalia simulada: dia de calor intenso com climatização em carga máxima e extração contínua na Nuova Simonelli',
    normalNote: 'Operação regular da cafeteria (histórico demonstrativo simulado)',
  },
  mercado: {
    baseDailyKwh: 65.5,
    weekendFactor: 1.05,
    primaryHotEquipmentId: 'mer_eq_4',
    secondaryHotEquipmentId: 'mer_eq_1',
    anomaly1Note:
      'Pico simulado: recebimento e resfriamento de lote grande de bebidas quentes nos 3 expositores Gelopar GRV-57',
    anomaly2Note:
      'Anomalia simulada: falha de vedação em porta de expositor refrigerado + ar-condicionado operando acima do regime habitual',
    normalNote: 'Operação regular do minimercado com refrigeração 24h (histórico simulado)',
  },
  barbearia: {
    baseDailyKwh: 27.6,
    weekendFactor: 1.12,
    primaryHotEquipmentId: 'bar_eq_1',
    secondaryHotEquipmentId: 'bar_eq_3',
    anomaly1Note:
      'Pico simulado: véspera de feriado com expediente estendido, 3 secadores Taiff Vulcan 2500W e ciclos extras de autoclave',
    anomaly2Note:
      'Anomalia simulada: sábado de agenda lotada com uso simultâneo dos secadores e ar-condicionado LG 18k BTU no mínimo',
    normalNote: 'Atendimento normal nas bancadas da barbearia (histórico simulado)',
  },
  padaria: {
    baseDailyKwh: 63.7,
    weekendFactor: 1.08,
    primaryHotEquipmentId: 'pad_eq_1',
    secondaryHotEquipmentId: 'pad_eq_2',
    anomaly1Note:
      'Pico simulado: fornadas extras no Forno Turbo Progás PRP-5000 (8,36 kW) para atender encomenda de coffeebreak',
    anomaly2Note:
      'Anomalia simulada: pré-aquecimento prolongado do forno turbo e bateladas adicionais na masseira G.Paniz 3 CV',
    normalNote: 'Ciclo diário de panificação e refrigeração (histórico simulado)',
  },
};

/**
 * Gera 65 dias de histórico determinístico (abrangendo 3 meses de calendário)
 * perfeitamente coerente com a soma física dos equipamentos do cenário.
 */
function buildScenarioRecords(scenarioId: DemoScenarioId, nowIso: string): ConsumptionRecord[] {
  const seed = SCENARIO_SEEDS[scenarioId];
  const totalDays = 65;
  const records: ConsumptionRecord[] = [];

  // Variação senoidal determinística suave para simular flutuação diária real sem Math.random()
  const deterministicOffsets = [
    -0.04, 0.01, -0.02, 0.03, 0.02, -0.01, -0.03, 0.02, 0.04, -0.02,
    0.01, -0.03, 0.02, 0.03, -0.01, 0.0, 0.02, -0.04, 0.01, 0.03,
  ];

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const dayOffset = -i;
    const dateStr = shiftIsoDate(dayOffset);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
    const isSunday = dayOfWeek === 0;

    // Evolução sutil entre meses para tornar o Comparativo Mensal Consolidado rico e didático:
    // Há 2 meses (i >= 45): ~95% da base; Mês anterior (15 <= i < 45): ~100% da base; Recente: ~102% com 2 picos.
    const monthProgressionFactor = i >= 45 ? 0.95 : i >= 20 ? 0.99 : 1.02;
    const wave = deterministicOffsets[i % deterministicOffsets.length];
    const dayFactor = isSunday ? seed.weekendFactor : 1.0;

    let kwh =
      Math.round(seed.baseDailyKwh * monthProgressionFactor * dayFactor * (1 + wave) * 10) / 10;
    let note = seed.normalNote;
    let equipmentId: string | undefined;

    // Inserir 2 anomalias claras nos últimos 10 dias para demonstração imediata
    if (i === 6) {
      kwh = Math.round(seed.baseDailyKwh * 1.38 * 10) / 10;
      note = seed.anomaly1Note;
      equipmentId = seed.primaryHotEquipmentId;
    } else if (i === 0) {
      kwh = Math.round(seed.baseDailyKwh * 1.33 * 10) / 10;
      note = seed.anomaly2Note;
      equipmentId = seed.secondaryHotEquipmentId;
    } else if (i === 28) {
      kwh = Math.round(seed.baseDailyKwh * 1.29 * 10) / 10;
      note = seed.anomaly1Note;
      equipmentId = seed.primaryHotEquipmentId;
    }

    records.push({
      id: `${scenarioId}_rec_${totalDays - i}`,
      date: dateStr,
      consumptionKwh: kwh,
      equipmentId,
      measurementType: 'simulated',
      source: 'demo_seed',
      note,
      isDemo: true,
      updatedAt: nowIso,
    });
  }

  return records;
}

export function createScenarioDefaultSettings(scenarioId: DemoScenarioId): AppSettings {
  const meta = DEMO_SCENARIOS[scenarioId];
  return {
    establishmentName: meta.name,
    establishmentDescription: meta.description,
    scenarioId,
    tariffPerKwh: OFFICIAL_TARIFF_REFERENCE.tariffPerKwh,
    referenceLocation: OFFICIAL_TARIFF_REFERENCE.referenceLocation,
    consumerClass: OFFICIAL_TARIFF_REFERENCE.consumerClass,
    tariffSource: OFFICIAL_TARIFF_REFERENCE.tariffSource,
    tariffReferenceDate: OFFICIAL_TARIFF_REFERENCE.tariffReferenceDate,
    tariffTaxNote: OFFICIAL_TARIFF_REFERENCE.tariffTaxNote,
    anomalyThresholdPercent: 20,
    emissionFactorKgPerKwh: OFFICIAL_EMISSION_REFERENCE.emissionFactorKgPerKwh,
    emissionFactorSource: OFFICIAL_EMISSION_REFERENCE.emissionFactorSource,
    emissionFactorYear: OFFICIAL_EMISSION_REFERENCE.emissionFactorYear,
    preferredCurrency: 'BRL',
    timezone: 'America/Sao_Paulo',
    isDemoProfile: true,
  };
}

/**
 * Cria o estado demonstrativo isolado para um cenário específico (Cafeteria, Mercado, Barbearia ou Padaria).
 */
export function createDemoDataState(
  scenarioId: DemoScenarioId = DEFAULT_DEMO_SCENARIO_ID,
): AppDataState {
  const nowIso = new Date().toISOString();
  const validScenario: DemoScenarioId = DEMO_SCENARIOS[scenarioId]
    ? scenarioId
    : DEFAULT_DEMO_SCENARIO_ID;

  return {
    version: DATA_SCHEMA_VERSION,
    scenarioId: validScenario,
    equipment: buildScenarioEquipment(validScenario, nowIso),
    records: buildScenarioRecords(validScenario, nowIso),
    settings: createScenarioDefaultSettings(validScenario),
    alertStates: {},
  };
}
