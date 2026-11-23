import { AppDataState, ConsumptionRecord, Equipment } from '../types/energy';
import { shiftIsoDate } from '../utils/formatters';

export const DATA_SCHEMA_VERSION = 2;

/**
 * Conjunto coerente de dados fictícios/demonstrativos para uma pequena empresa comercial
 * (Mercato Café & Cozinha). Todos os itens são marcados explicitamente com `isDemo: true`
 * e `measurementType: 'simulated'` para nunca serem confundidos com medições reais.
 */
export function createDemoDataState(): AppDataState {
  const nowIso = new Date().toISOString();

  const equipment: Equipment[] = [
    {
      id: 'demo_eq_1',
      name: 'Forno Elétrico Combinado 6 Bandejas',
      category: 'Maquinário',
      location: 'Cozinha de Produção',
      powerWatts: 3200,
      quantity: 1,
      dailyUsageHours: 6.5,
      status: 'active',
      notes: 'Operação concentrada nos turnos da manhã e tarde (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_2',
      name: 'Ar-condicionado Split 24.000 BTU (Salão)',
      category: 'Climatização',
      location: 'Salão de Atendimento',
      powerWatts: 2250,
      quantity: 1,
      dailyUsageHours: 9,
      status: 'active',
      notes: 'Climatização principal do salão (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_3',
      name: 'Ar-condicionado Split 12.000 BTU (Escritório)',
      category: 'Climatização',
      location: 'Escritório Administrativo',
      powerWatts: 1180,
      quantity: 1,
      dailyUsageHours: 7.5,
      status: 'active',
      notes: 'Uso em horário comercial (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_4',
      name: 'Balcão Refrigerado Expositor',
      category: 'Refrigeração',
      location: 'Salão de Atendimento',
      powerWatts: 960,
      quantity: 1,
      dailyUsageHours: 14,
      status: 'active',
      notes: 'Ciclo contínuo com compressor inverter (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_5',
      name: 'Freezer Vertical Comercial 420L',
      category: 'Refrigeração',
      location: 'Estoque Frio',
      powerWatts: 480,
      quantity: 1,
      dailyUsageHours: 14,
      status: 'active',
      notes: 'Armazenamento de insumos (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_6',
      name: 'Estações de Trabalho, PDV e Rede',
      category: 'TI e Escritório',
      location: 'Caixa e Escritório',
      powerWatts: 310,
      quantity: 2,
      dailyUsageHours: 10,
      status: 'active',
      notes: '2 terminais de atendimento + roteadores (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_7',
      name: 'Iluminação LED Salão e Vitrine',
      category: 'Iluminação',
      location: 'Salão de Atendimento',
      powerWatts: 440,
      quantity: 1,
      dailyUsageHours: 11,
      status: 'active',
      notes: 'Circuitos LED de vitrine e salão (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
    {
      id: 'demo_eq_8',
      name: 'Compressor Auxiliar de Manutenção',
      category: 'Maquinário',
      location: 'Área Técnica',
      powerWatts: 1500,
      quantity: 1,
      dailyUsageHours: 1,
      status: 'inactive',
      notes: 'Reserva técnica (simulado)',
      isDemo: true,
      updatedAt: nowIso,
    },
  ];

  const dailySeries: Array<{
    offset: number;
    kwh: number;
    equipmentId?: string;
    note?: string;
  }> = [
    { offset: -15, kwh: 47.6, note: 'Operação regular (dado demonstrativo)' },
    { offset: -14, kwh: 49.2, note: 'Operação regular (dado demonstrativo)' },
    { offset: -13, kwh: 46.8, note: 'Movimento moderado (dado demonstrativo)' },
    { offset: -12, kwh: 50.4, note: 'Operação regular (dado demonstrativo)' },
    { offset: -11, kwh: 51.1, note: 'Turno de produção ampliado (dado demonstrativo)' },
    { offset: -10, kwh: 48.5, note: 'Operação regular (dado demonstrativo)' },
    { offset: -9, kwh: 49.8, note: 'Operação regular (dado demonstrativo)' },
    {
      offset: -8,
      kwh: 51.3,
      equipmentId: 'demo_eq_2',
      note: 'Dia quente — climatização contínua (dado demonstrativo)',
    },
    { offset: -7, kwh: 49.6, note: 'Operação regular (dado demonstrativo)' },
    {
      offset: -6,
      kwh: 71.4,
      equipmentId: 'demo_eq_1',
      note: 'Pico simulado: forno e climatização em carga máxima por expediente estendido',
    },
    { offset: -5, kwh: 50.2, note: 'Retorno ao padrão normal (dado demonstrativo)' },
    { offset: -4, kwh: 48.9, note: 'Operação regular (dado demonstrativo)' },
    { offset: -3, kwh: 49.5, note: 'Operação regular (dado demonstrativo)' },
    { offset: -2, kwh: 51.0, note: 'Operação regular (dado demonstrativo)' },
    { offset: -1, kwh: 50.4, note: 'Operação regular (dado demonstrativo)' },
    {
      offset: 0,
      kwh: 66.8,
      equipmentId: 'demo_eq_2',
      note: 'Anomalia simulada: aumento acentuado no consumo do último dia',
    },
  ];

  const records: ConsumptionRecord[] = dailySeries.map((item, index) => ({
    id: `demo_rec_${index + 1}`,
    date: shiftIsoDate(item.offset),
    consumptionKwh: item.kwh,
    equipmentId: item.equipmentId,
    measurementType: 'simulated',
    source: 'demo_seed',
    note: item.note,
    isDemo: true,
    updatedAt: nowIso,
  }));

  return {
    version: DATA_SCHEMA_VERSION,
    equipment,
    records,
    settings: {
      establishmentName: 'Mercato Café & Cozinha (Demonstrativo)',
      tariffPerKwh: 0.92,
      anomalyThresholdPercent: 20,
      preferredCurrency: 'BRL',
      timezone: 'America/Sao_Paulo',
      isDemoProfile: true,
    },
    alertStates: {},
  };
}
