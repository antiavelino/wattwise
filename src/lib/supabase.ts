import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

/**
 * Verifica se as variáveis públicas do Supabase foram configuradas no ambiente.
 * Nunca utiliza a service_role key no cliente.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('seu-projeto.supabase.co') &&
    supabaseAnonKey !== 'sua-chave-anon-publica',
);

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getBackendConnectionStatus(): {
  mode: 'supabase_cloud' | 'local_multitenant';
  label: string;
  description: string;
} {
  if (isSupabaseConfigured) {
    return {
      mode: 'supabase_cloud',
      label: 'Supabase Cloud Conectado',
      description: 'Autenticação e banco PostgreSQL sincronizados com Row Level Security ativo.',
    };
  }
  return {
    mode: 'local_multitenant',
    label: 'Banco Relacional Local Multi-Tenant',
    description:
      'Isolamento multi-tenant, RBAC e persistência ativos localmente. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para sincronizar com o Supabase Cloud.',
  };
}
