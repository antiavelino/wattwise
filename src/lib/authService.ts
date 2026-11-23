import { isSupabaseConfigured, supabaseClient } from './supabase';
import {
  completePasswordRecovery,
  loadSaasDatabase,
  requestPasswordRecoveryOtp,
  verifyPasswordRecoveryOtp,
} from '../storage/saasRepository';

export interface AuthResetRequestResult {
  ok: boolean;
  message: string;
  mockOtp?: string;
  mode: 'supabase_cloud' | 'local_multitenant';
}

export interface AuthVerifyOtpResult {
  ok: boolean;
  message: string;
  mode: 'supabase_cloud' | 'local_multitenant';
}

export interface AuthPasswordUpdateResult {
  ok: boolean;
  message: string;
}

/**
 * Solicita código OTP de 6 dígitos para recuperação de senha.
 * Se o Supabase estiver configurado, despacha o e-mail transacional via Supabase Auth
 * com o template personalizado (supabase/templates/recovery.html).
 * Se o ambiente for local, simula o desafio gerando um OTP válido no banco local.
 */
export async function requestPasswordResetOtp(email: string): Promise<AuthResetRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Informe um endereço de e-mail corporativo válido.');
  }

  if (isSupabaseConfigured && supabaseClient) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(normalizedEmail);
    if (error) {
      throw new Error(error.message || 'Falha ao solicitar código de recuperação via Supabase.');
    }
    return {
      ok: true,
      message: 'Código de verificação enviado para o seu e-mail.',
      mode: 'supabase_cloud',
    };
  }

  // Fallback offline / banco relacional local
  const db = loadSaasDatabase();
  const { otpCode } = requestPasswordRecoveryOtp(db, normalizedEmail);
  return {
    ok: true,
    message: `Código de verificação gerado para ${normalizedEmail}.`,
    mockOtp: otpCode,
    mode: 'local_multitenant',
  };
}

/**
 * Valida o código OTP de 6 dígitos informado pelo usuário.
 * No Supabase, executa supabase.auth.verifyOtp({ email, token, type: 'recovery' }),
 * estabelecendo a sessão temporária autenticada para redefinição.
 * No ambiente local, valida contra o desafio persistido e marca como verificado.
 */
export async function verifyPasswordResetOtp(
  email: string,
  otpCode: string,
): Promise<AuthVerifyOtpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = otpCode.replace(/\D/g, '').trim();

  if (cleanCode.length !== 6) {
    throw new Error('O código de verificação deve conter exatamente 6 dígitos.');
  }

  if (isSupabaseConfigured && supabaseClient) {
    const { error } = await supabaseClient.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanCode,
      type: 'recovery',
    });
    if (error) {
      throw new Error(error.message || 'Código OTP inválido ou expirado.');
    }
    return {
      ok: true,
      message: 'Código validado com sucesso. Defina sua nova senha.',
      mode: 'supabase_cloud',
    };
  }

  // Fallback local
  const db = loadSaasDatabase();
  verifyPasswordRecoveryOtp(db, normalizedEmail, cleanCode);
  return {
    ok: true,
    message: 'Código validado com sucesso. Defina sua nova senha.',
    mode: 'local_multitenant',
  };
}

/**
 * Atualiza a senha da conta após validação prévia do código OTP.
 * No Supabase, executa supabase.auth.updateUser({ password: newPassword }).
 * No ambiente local, atualiza o hash da senha na conta correspondente.
 */
export async function completePasswordReset(
  newPassword: string,
  email?: string,
): Promise<AuthPasswordUpdateResult> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }

  if (isSupabaseConfigured && supabaseClient) {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(error.message || 'Falha ao atualizar senha via Supabase Auth.');
    }
    return {
      ok: true,
      message: 'Senha atualizada com sucesso pelo Supabase Auth.',
    };
  }

  if (!email) {
    throw new Error('E-mail da conta não fornecido para conclusão da redefinição.');
  }

  const db = loadSaasDatabase();
  completePasswordRecovery(db, email, newPassword);
  return {
    ok: true,
    message: 'Senha atualizada com sucesso no banco local.',
  };
}
