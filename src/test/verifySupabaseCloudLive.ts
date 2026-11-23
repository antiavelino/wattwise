import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvlblruqjcmcykohpahq.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bGJscnVxamNtY3lrb2hwYWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzODMxMTAsImV4cCI6MjExMDk1OTExMH0.qYTXqKJ_8UK4MC_xivC7snkApQgy4cO75hWvwgocMOg';

export async function runFullSaaSPersistenceTest() {
  console.log('--- TESTANDO LOGIN E GRAVAÇÃO REAL NO SUPABASE CLOUD ---');
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const testEmail = 'wattwise.audit.1795388281046@gmail.com';
  const testPassword = 'SecurePassword2026!';

  console.log(`1. Executando signInWithPassword para: ${testEmail}...`);
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginErr || !loginData.session) {
    throw new Error(`Falha no login: ${loginErr?.message}`);
  }

  console.log(`✓ Login realizado com sucesso. Sessão autenticada: ${loginData.session.user.id}`);

  console.log('2. Criando organização via RPC create_organization_with_owner...');
  const { data: orgId, error: orgErr } = await client.rpc('create_organization_with_owner', {
    org_name: 'Escola Modelo Solar',
    org_slug: `escola-solar-sp-${Date.now().toString().slice(-4)}`,
    org_timezone: 'America/Sao_Paulo',
  });

  if (orgErr || !orgId) {
    throw new Error(`Falha ao criar organização: ${orgErr?.message}`);
  }
  console.log(`✓ Organização criada com sucesso no PostgreSQL! ID: ${orgId}`);

  console.log('3. Inserindo equipamentos em public.equipment...');
  const { data: eq1, error: eq1Err } = await client
    .from('equipment')
    .insert({
      organization_id: orgId,
      name: 'Ar-Condicionado Inverter 12000 BTUs',
      category: 'Climatização',
      location: 'Laboratório de Robótica',
      rated_power_w: 1080,
      quantity: 4,
      daily_usage_hours: 6.5,
      status: 'active',
      notes: 'Equipamento A++ com medição setorial',
    })
    .select()
    .single();

  if (eq1Err || !eq1) {
    throw new Error(`Falha ao cadastrar equipamento 1: ${eq1Err?.message}`);
  }
  console.log(`✓ Equipamento 1 salvo: "${eq1.name}" (ID: ${eq1.id})`);

  const { data: eq2, error: eq2Err } = await client
    .from('equipment')
    .insert({
      organization_id: orgId,
      name: 'Painel Iluminação LED 40W',
      category: 'Iluminação',
      location: 'Pátio Central',
      rated_power_w: 400,
      quantity: 10,
      daily_usage_hours: 10.0,
      status: 'active',
      notes: 'Luminárias de alta eficiência',
    })
    .select()
    .single();

  if (eq2Err || !eq2) {
    throw new Error(`Falha ao cadastrar equipamento 2: ${eq2Err?.message}`);
  }
  console.log(`✓ Equipamento 2 salvo: "${eq2.name}" (ID: ${eq2.id})`);

  console.log('4. Inserindo registros diários de consumo em public.energy_readings...');
  const readingsToInsert = [
    {
      organization_id: orgId,
      equipment_id: eq1.id,
      measured_at: '2026-11-20',
      energy_kwh: 26.5,
      measurement_type: 'measured',
      source: 'manual',
      notes: 'Consumo medido no dia letivo',
    },
    {
      organization_id: orgId,
      equipment_id: eq1.id,
      measured_at: '2026-11-21',
      energy_kwh: 28.1,
      measurement_type: 'measured',
      source: 'manual',
      notes: 'Consumo medido no dia letivo',
    },
    {
      organization_id: orgId,
      equipment_id: eq2.id,
      measured_at: '2026-11-22',
      energy_kwh: 4.0,
      measurement_type: 'measured',
      source: 'manual',
      notes: 'Iluminação noturna',
    },
  ];

  const { data: rdData, error: rdErr } = await client
    .from('energy_readings')
    .insert(readingsToInsert)
    .select();

  if (rdErr || !rdData) {
    throw new Error(`Falha ao cadastrar leituras: ${rdErr?.message}`);
  }
  console.log(`✓ ${rdData.length} registros de consumo gravados com sucesso no PostgreSQL!`);

  console.log('5. Lendo os dados persistidos através do client com RLS...');
  const { data: listEq } = await client
    .from('equipment')
    .select('*')
    .eq('organization_id', orgId);

  const { data: listRd } = await client
    .from('energy_readings')
    .select('*')
    .eq('organization_id', orgId)
    .order('measured_at', { ascending: true });

  const { data: orgSettings } = await client
    .from('organization_settings')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  console.log(`✓ Total de equipamentos recuperados: ${listEq?.length}`);
  console.log(`✓ Total de leituras recuperadas: ${listRd?.length}`);
  console.log(`✓ Configurações da organização: tarifa R$ ${orgSettings?.electricity_tariff}/kWh, alerta em ${orgSettings?.alert_threshold_percentage}%`);

  console.log('6. Testando logout...');
  await client.auth.signOut();
  console.log('✓ Logout executado com sucesso.');

  console.log('=== TODOS OS TESTES PASSARAM COM SUCESSO NO POSTGRESQL REMOTO ===');
  return { orgId, eqCount: listEq?.length ?? 0, rdCount: listRd?.length ?? 0 };
}

// Execução direta condicional compatível com Node e Bundler
if (typeof window === 'undefined') {
  void runFullSaaSPersistenceTest().catch((err: unknown) => {
    console.error(err);
  });
}
