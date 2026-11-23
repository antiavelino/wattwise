# WattWise — Guia de Configuração da Autenticação & Supabase Auth
**Módulo:** Autenticação Multi-Tenant & Recuperação de Senha via Código OTP de 6 Dígitos  
**Tecnologia:** Supabase Auth (`@supabase/supabase-js`) + PostgreSQL Row Level Security (RLS)

---

## 1. Visão Geral

O sistema de autenticação do **WattWise** foi projetado para operar em dois modos:
1. **Supabase Cloud (Produção / Homologação):** Sessões criptografadas com cookies e JWTs, confirmação de e-mail e recuperação de senha através de **código OTP numérico de 6 dígitos** enviado pelo Supabase Auth.
2. **Banco Relacional Local Multi-Tenant (Fallback Offline / Testes):** Permite executar testes unitários, testes E2E e demonstrações do evento escolar sem dependência de internet ou de provisionamento na nuvem.

---

## 2. Fluxo Completo de Recuperação de Senha via OTP

Diferente de links estáticos de redefinição sujeitos a bloqueios por clientes de e-mail corporativos, o WattWise utiliza o fluxo de verificação de **código OTP de 6 dígitos**:

```
[ Usuário ] -> Solicita recuperação (digita email)
     |
     v
[ Supabase Auth ] -> Dispara resetPasswordForEmail(email)
     |
     v
[ E-mail Transacional ] -> Template personalizado entrega {{ .Token }} (6 dígitos)
     |
     v
[ Usuário ] -> Insere os 6 dígitos na tela 'verify-otp' (OtpInput com auto-avanço)
     |
     v
[ Supabase Auth ] -> Valida com supabase.auth.verifyOtp({ email, token, type: 'recovery' })
     |
     v (Sessão temporária autorizada)
[ Usuário ] -> Digita nova senha em 'reset-password' com PasswordStrengthMeter
     |
     v
[ Supabase Auth ] -> supabase.auth.updateUser({ password: newPassword })
     |
     v
[ Sucesso ] -> Redirecionamento para a tela de Login com notificação toast
```

---

## 3. Variáveis de Ambiente (`.env`)

Crie ou edite o arquivo `.env` na raiz do projeto `WattWise`:

```env
# URL do projeto Supabase (encontrada em Settings > API)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave anônima pública (anon / public key) — NUNCA use a service_role key no frontend
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica-aqui
```

> [!WARNING]
> Nunca versione a `SUPABASE_SERVICE_ROLE_KEY` nem credenciais confidenciais no `.env` do cliente.

---

## 4. Configuração no Painel do Supabase

### 4.1 URL Configuration (Redirect URLs)
1. Acesse **Authentication > URL Configuration**.
2. Defina a **Site URL**:
   - Desenvolvimento local: `http://localhost:5173`
   - Produção Vercel: `https://seu-dominio.vercel.app`
3. Em **Redirect URLs**, adicione:
   - `http://localhost:5173/**`
   - `https://seu-dominio.vercel.app/**`

### 4.2 Provedor de E-mail (Email Provider)
1. Acesse **Authentication > Providers > Email**.
2. Certifique-se de que o provedor **Email** está habilitado.
3. Marque **Confirm email** se desejar confirmação obrigatória de novos cadastros.
4. Defina a complexidade de senha mínima (mínimo 6 caracteres).

### 4.3 Template de E-mail para Recuperação de Senha
1. Acesse **Authentication > Email Templates > Reset Password**.
2. Assunto recomendado: `Código de Verificação de Senha — WattWise`
3. No corpo do e-mail, cole o conteúdo do template criado no repositório:
   `supabase/templates/recovery.html`
4. O template utiliza a tag oficial do Supabase:
   ```html
   <div class="otp-code">{{ .Token }}</div>
   ```

---

## 5. Modo Fallback Offline & Ambiente de Testes

Quando o `VITE_SUPABASE_URL` não estiver configurado (ou estiver com os valores padrão de exemplo):
- O repositório `src/storage/saasRepository.ts` detecta a ausência e ativa o banco relacional local multi-tenant com localStorage.
- Ao clicar em "Esqueci a senha", o sistema gera um código OTP de 6 dígitos aleatório com validade de 15 minutos, armazena no estado do desafio e exibe uma notificação amigável com o código gerado para facilitar a demonstração.
- O fluxo de validação (`verify-otp`) e a definição de nova senha (`reset-password`) funcionam exatamente da mesma forma, garantindo 100% de conformidade nos testes automatizados e apresentações.
