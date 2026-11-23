import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { getBackendConnectionStatus } from '../../lib/supabase';
import { parseNumericInput } from '../../utils/validators';
import { Badge } from '../common/Badge';
import { OtpInput } from './OtpInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

export const AuthViews: React.FC = () => {
  const {
    theme,
    toggleTheme,
    publicPage,
    navigatePublic,
    registerAccount,
    loginAccount,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    completePasswordReset,
    createOrganization,
    currentUser,
    logoutAccount,
    enterDemoSandbox,
  } = useWattWise();

  const backendStatus = getBackendConnectionStatus();

  // Estados de formulário
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [tariffRaw, setTariffRaw] = useState('0.92');
  const [thresholdRaw, setThresholdRaw] = useState('20');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      await loginAccount({ email, password });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Cadastro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      await registerAccount({
        fullName,
        email,
        password,
        organizationName: orgName.trim() || undefined,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Esqueci a senha -> Solicita código OTP de 6 dígitos
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Informe um endereço de e-mail válido para receber o código.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordResetOtp(email.trim());
      setInfoMsg(
        result.mockOtp
          ? `Código de verificação gerado no ambiente local: ${result.mockOtp}`
          : 'Código de 6 dígitos enviado para seu e-mail. Verifique sua caixa de entrada.',
      );
      navigatePublic('verify-otp');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Valida código OTP de 6 dígitos
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (otpCode.replace(/\D/g, '').length !== 6) {
      setErrorMsg('Preencha os 6 dígitos do código de verificação recebido.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyPasswordResetOtp(email.trim(), otpCode);
      setInfoMsg('Código autenticado com sucesso. Defina sua nova senha de acesso.');
      navigatePublic('reset-password');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código OTP
  const handleResendOtp = async () => {
    clearMessages();
    if (!email.trim()) return;
    try {
      const result = await requestPasswordResetOtp(email.trim());
      setInfoMsg(
        result.mockOtp
          ? `Novo código gerado no ambiente local: ${result.mockOtp}`
          : 'Novo código de 6 dígitos enviado por e-mail.',
      );
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // 3. Atualiza nova senha
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordReset(newPassword, email.trim());
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Onboarding
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const parsedTariff = parseNumericInput(tariffRaw);
    const parsedThreshold = parseNumericInput(thresholdRaw);

    if (!orgName.trim() || orgName.trim().length < 2) {
      setErrorMsg('Informe o nome da sua empresa ou unidade (mínimo 2 caracteres).');
      return;
    }
    if (Number.isNaN(parsedTariff) || parsedTariff <= 0) {
      setErrorMsg('Informe uma tarifa válida em R$/kWh.');
      return;
    }
    if (Number.isNaN(parsedThreshold) || parsedThreshold < 5 || parsedThreshold > 200) {
      setErrorMsg('O limite de anomalia deve estar entre 5% e 200%.');
      return;
    }

    try {
      createOrganization({
        name: orgName.trim(),
        timezone: 'America/Sao_Paulo',
        tariffPerKwh: parsedTariff,
        anomalyThresholdPercent: parsedThreshold,
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* PAINEL ESQUERDO: IMERSÃO DE MARCA & TELEMETRIA PRECISION ECO-TECH */}
      <aside className="auth-brand-pane">
        <div className="auth-brand-pane-content">
          <div className="auth-brand-header">
            <div className="auth-brand-logo-wrap">
              <img
                src={theme === 'light' ? '/brand/wattwise-logo-light.svg' : '/brand/wattwise-logo-dark.svg'}
                alt="WattWise — Smart Energy Intelligence"
                className="auth-brand-logo"
                height="42"
              />
            </div>
            <div className="brand-badge-pill">
              <span className="brand-pulse-dot" />
              <span>PRECISION ECO-TECH</span>
            </div>
          </div>

          <div className="auth-brand-pitch">
            <h2 className="auth-brand-pitch-title">
              Inteligência analítica e telemetria energética em tempo real.
            </h2>
            <p className="auth-brand-pitch-desc">
              Transforme dados brutos de medição em economia operacional tangível, detecção
              automática de anomalias por desvio estatístico e relatórios de sustentabilidade ESG.
            </p>
          </div>

          {/* CARD DE TELEMETRIA SIMULADA */}
          <div className="auth-telemetry-preview-card">
            <div className="auth-telemetry-preview-header">
              <div className="auth-telemetry-preview-title">
                <Zap size={14} className="text-emerald" />
                <span>Telemetria Algorítmica Ativa</span>
              </div>
              <span className="badge badge-subtle">SaaS Live</span>
            </div>

            <div className="auth-telemetry-stats-grid">
              <div className="auth-telemetry-stat">
                <span className="auth-telemetry-stat-label">Eficiência Atual</span>
                <span className="auth-telemetry-stat-value tabular-nums">94,8%</span>
                <span className="auth-telemetry-stat-trend text-emerald">↑ +3,2% no ciclo</span>
              </div>
              <div className="auth-telemetry-stat">
                <span className="auth-telemetry-stat-label">Desvio Z-Score</span>
                <span className="auth-telemetry-stat-value tabular-nums">+0,82σ</span>
                <span className="auth-telemetry-stat-trend" style={{ color: 'var(--brand-mint)' }}>
                  Padrão Nominal
                </span>
              </div>
            </div>

            <div className="auth-telemetry-checklist">
              <div className="auth-telemetry-check-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Isolamento estrito multi-tenant (RLS PostgreSQL)</span>
              </div>
              <div className="auth-telemetry-check-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Recuperação de credenciais via código OTP de 6 dígitos</span>
              </div>
              <div className="auth-telemetry-check-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Auditoria operacional com RBAC granular</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer-note">
            <span>WattWise v2.0 • Projeto Acadêmico & Tecnológico para Feira de Ciências</span>
          </div>
        </div>
      </aside>

      {/* PAINEL DIREITO: FORMULÁRIO DE AUTENTICAÇÃO */}
      <main className="auth-form-pane">
        <div className="auth-form-container">
          {/* BARRA SUPERIOR DE AÇÕES */}
          <div className="auth-top-bar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigatePublic('home')}
            >
              <ArrowLeft size={14} />
              <span>Início</span>
            </button>

            <div className="auth-top-bar-right">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
              </button>

              <Badge tone={backendStatus.mode === 'supabase_cloud' ? 'emerald' : 'sky'}>
                {backendStatus.label}
              </Badge>
            </div>
          </div>

          {/* MENSAGENS DE FEEDBACK */}
          {errorMsg && (
            <div className="auth-alert auth-alert--error" role="alert">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="auth-alert auth-alert--info" role="status">
              {infoMsg}
            </div>
          )}

          {/* 1. TELA DE LOGIN */}
          {publicPage === 'login' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <h1 className="auth-title">Entrar na plataforma</h1>
                <p className="auth-subtitle">
                  Acesse sua organização para acompanhar telemetria, custos e eficiência energética.
                </p>
              </div>

              <form className="form-stack" onSubmit={handleLoginSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="auth-login-email" className="form-label">
                    E-mail corporativo ou educacional
                  </label>
                  <input
                    id="auth-login-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com.br"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-field">
                  <div className="auth-label-row">
                    <label htmlFor="auth-login-password" className="form-label">
                      Senha de acesso
                    </label>
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={() => {
                        clearMessages();
                        navigatePublic('forgot-password');
                      }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <input
                    id="auth-login-password"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  <LogIn size={16} />
                  <span>{isLoading ? 'Autenticando...' : 'Entrar na plataforma'}</span>
                </button>
              </form>

              <div className="auth-footer-links">
                <span>Não possui uma conta?</span>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('register');
                  }}
                >
                  Criar conta gratuita
                </button>
              </div>

              <div className="auth-demo-divider">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={enterDemoSandbox}
                >
                  Explorar modo demonstrativo sem login
                </button>
              </div>
            </div>
          )}

          {/* 2. TELA DE CADASTRO */}
          {publicPage === 'register' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <h1 className="auth-title">Criar conta no WattWise</h1>
                <p className="auth-subtitle">
                  Inicie o monitoramento inteligente dos equipamentos da sua instituição.
                </p>
              </div>

              <form className="form-stack" onSubmit={handleRegisterSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="auth-reg-name" className="form-label">
                    Nome completo
                  </label>
                  <input
                    id="auth-reg-name"
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex.: Mariana Costa"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="auth-reg-email" className="form-label">
                    E-mail institucional
                  </label>
                  <input
                    id="auth-reg-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mariana@empresa.com.br"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="auth-reg-password" className="form-label">
                    Senha de acesso
                  </label>
                  <input
                    id="auth-reg-password"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <PasswordStrengthMeter password={password} />
                </div>

                <div className="form-field">
                  <label htmlFor="auth-reg-org" className="form-label">
                    Nome da organização (opcional)
                  </label>
                  <input
                    id="auth-reg-org"
                    type="text"
                    className="form-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex.: Escola Técnica Estadual"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  <UserPlus size={16} />
                  <span>{isLoading ? 'Criando conta...' : 'Concluir cadastro'}</span>
                </button>
              </form>

              <div className="auth-footer-links">
                <span>Já possui uma conta?</span>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('login');
                  }}
                >
                  Fazer login
                </button>
              </div>
            </div>
          )}

          {/* 3. TELA DE ESQUECI A SENHA (SOLICITA OTP) */}
          {publicPage === 'forgot-password' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <Badge tone="emerald">Recuperação por OTP</Badge>
                <h1 className="auth-title" style={{ marginTop: 8 }}>
                  Recuperar acesso
                </h1>
                <p className="auth-subtitle">
                  Informe seu e-mail cadastrado. Enviaremos um código de verificação seguro de 6
                  dígitos para redefinição da sua senha.
                </p>
              </div>

              <form className="form-stack" onSubmit={handleForgotSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="auth-forgot-email" className="form-label">
                    E-mail da sua conta
                  </label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com.br"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  <Mail size={16} />
                  <span>{isLoading ? 'Enviando código...' : 'Enviar código de 6 dígitos'}</span>
                </button>
              </form>

              <div className="auth-footer-links">
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('login');
                  }}
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          )}

          {/* 4. TELA DE VERIFICAÇÃO OTP (6 DÍGITOS) */}
          {publicPage === 'verify-otp' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <Badge tone="emerald">Código de Verificação</Badge>
                <h1 className="auth-title" style={{ marginTop: 8 }}>
                  Digite o código OTP
                </h1>
                <p className="auth-subtitle">
                  Inserimos um código de 6 dígitos enviado para{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{email || 'seu e-mail'}</strong>.
                </p>
              </div>

              <form className="form-stack" onSubmit={handleVerifyOtpSubmit}>
                <div className="form-field" style={{ textAlign: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 16 }}>
                    Código de 6 dígitos
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={() => {
                      /* auto avanço */
                    }}
                    onResend={handleResendOtp}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading || otpCode.replace(/\D/g, '').length !== 6}
                >
                  <KeyRound size={16} />
                  <span>{isLoading ? 'Validando...' : 'Verificar código e prosseguir'}</span>
                </button>
              </form>

              <div className="auth-footer-links">
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('forgot-password');
                  }}
                >
                  Alterar e-mail informado
                </button>
                <span>•</span>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('login');
                  }}
                >
                  Cancelar e ir ao login
                </button>
              </div>
            </div>
          )}

          {/* 5. TELA DE NOVA SENHA */}
          {publicPage === 'reset-password' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <Badge tone="emerald">Sessão de Recuperação Autenticada</Badge>
                <h1 className="auth-title" style={{ marginTop: 8 }}>
                  Criar nova senha
                </h1>
                <p className="auth-subtitle">
                  Código verificado com sucesso. Digite sua nova senha de acesso para{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                </p>
              </div>

              <form className="form-stack" onSubmit={handleResetSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="auth-reset-password" className="form-label">
                    Nova senha
                  </label>
                  <input
                    id="auth-reset-password"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                <div className="form-field">
                  <label htmlFor="auth-reset-confirm" className="form-label">
                    Confirmar nova senha
                  </label>
                  <input
                    id="auth-reset-confirm"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  <KeyRound size={16} />
                  <span>{isLoading ? 'Salvando nova senha...' : 'Salvar nova senha e entrar'}</span>
                </button>
              </form>

              <div className="auth-footer-links">
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => {
                    clearMessages();
                    navigatePublic('login');
                  }}
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          )}

          {/* 6. TELA DE ONBOARDING */}
          {publicPage === 'onboarding' && (
            <div className="auth-form-body">
              <div className="auth-header">
                <Badge tone="emerald">Onboarding Multi-Tenant</Badge>
                <h1 className="auth-title" style={{ marginTop: 8 }}>
                  Configure sua Organização
                </h1>
                <p className="auth-subtitle">
                  {currentUser
                    ? `Olá, ${currentUser.fullName}. Configure o ambiente isolado da sua unidade para iniciar o monitoramento.`
                    : 'Crie o ambiente da sua instituição para iniciar o monitoramento.'}
                </p>
              </div>

              <form className="form-stack" onSubmit={handleOnboardingSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="onb-org-name" className="form-label">
                    Nome da empresa ou unidade
                  </label>
                  <input
                    id="onb-org-name"
                    type="text"
                    className="form-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex.: Colégio Técnico — Campus Central"
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="onb-tariff" className="form-label">
                      Tarifa de energia (R$/kWh)
                    </label>
                    <input
                      id="onb-tariff"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input tabular-nums"
                      value={tariffRaw}
                      onChange={(e) => setTariffRaw(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="onb-threshold" className="form-label">
                      Limite de anomalia (%)
                    </label>
                    <input
                      id="onb-threshold"
                      type="number"
                      step="1"
                      min="5"
                      max="200"
                      className="form-input tabular-nums"
                      value={thresholdRaw}
                      onChange={(e) => setThresholdRaw(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  <Building2 size={16} />
                  <span>Criar organização e acessar painel</span>
                </button>
              </form>

              {currentUser && (
                <div className="auth-footer-links">
                  <span>Conectado como {currentUser.email}</span>
                  <button type="button" className="auth-inline-link" onClick={logoutAccount}>
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="auth-security-note">
            <ShieldCheck size={15} className="text-emerald" />
            <span>
              Segurança por Design: isolamento multi-tenant por Row Level Security (RLS) e
              autenticação criptografada.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
