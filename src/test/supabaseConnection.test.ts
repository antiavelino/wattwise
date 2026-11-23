import { describe, expect, it } from 'vitest';
import { getBackendConnectionStatus, isSupabaseConfigured } from '../lib/supabase';
import {
  completePasswordReset,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from '../lib/authService';

describe('Supabase Connection & Environment Guard', () => {
  it('confirma que isSupabaseConfigured está ativo e validado pelo .env.local', () => {
    expect(isSupabaseConfigured).toBe(true);
    const status = getBackendConnectionStatus();
    expect(status.mode).toBe('supabase_cloud');
    expect(status.label).toBe('Supabase Cloud Conectado');
    expect(status.description).toContain('Row Level Security ativo');
  });

  it('valida formato de e-mail ao solicitar OTP de recuperação', async () => {
    await expect(requestPasswordResetOtp('')).rejects.toThrow(/e-mail corporativo válido/);
    await expect(requestPasswordResetOtp('email-invalido')).rejects.toThrow(/e-mail corporativo válido/);
  });

  it('valida tamanho do código OTP ao verificar', async () => {
    await expect(verifyPasswordResetOtp('teste@empresa.com', '123')).rejects.toThrow(
      /exatamente 6 dígitos/,
    );
    await expect(verifyPasswordResetOtp('teste@empresa.com', '1234567')).rejects.toThrow(
      /exatamente 6 dígitos/,
    );
  });

  it('valida requisitos mínimos de segurança para nova senha', async () => {
    await expect(completePasswordReset('12345')).rejects.toThrow(
      /no mínimo 6 caracteres/,
    );
  });
});
