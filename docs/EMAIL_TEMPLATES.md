# WattWise — Catálogo de Templates de E-mail Supabase
**Identidade Visual:** Precision Eco-Tech  
**Diretório:** `supabase/templates/`

---

## 1. Visão Geral

Todos os templates de e-mail transacionais do WattWise foram desenvolvidos utilizando HTML responsivo baseado em tabelas para máxima compatibilidade com clientes de e-mail (Gmail, Apple Mail, Outlook desktop/mobile, Yahoo e navegadores).

Os templates incorporam as cores oficiais da marca:
- Fundo exterior: `#0B1714` (Deep Forest)
- Container de leitura: `#102620` (Forest Green)
- Destaques e botões: `#24B47E` (Energy Green)
- Código OTP destacado: `#C8F36B` (Lime Signal)

---

## 2. Templates Disponíveis

### 2.1 Recuperação de Senha (`supabase/templates/recovery.html`)
- **Objetivo:** Enviar o código OTP de 6 dígitos para o usuário que esqueceu a senha.
- **Tag Principal do Supabase:** `{{ .Token }}` (exibe os 6 dígitos numéricos)
- **Tag Secundária:** `{{ .ConfirmationURL }}` (link de contingência)
- **Onde configurar no Supabase:**  
  Acesse **Authentication > Email Templates > Reset Password**.  
  Copie o conteúdo de `supabase/templates/recovery.html` e cole no editor do Supabase.

### 2.2 Confirmação de Cadastro (`supabase/templates/confirmation.html`)
- **Objetivo:** Validar o e-mail informado no momento do cadastro inicial.
- **Tag Principal:** `{{ .ConfirmationURL }}`
- **Onde configurar no Supabase:**  
  Acesse **Authentication > Email Templates > Confirm Signup**.

### 2.3 Convite de Membro para Equipe (`supabase/templates/invite.html`)
- **Objetivo:** Convidar novos colaboradores para a organização com função pré-definida.
- **Tag Principal:** `{{ .ConfirmationURL }}`
- **Onde configurar no Supabase:**  
  Acesse **Authentication > Email Templates > Invite User**.

---

## 3. Guia Rápido de Instalação no Painel Supabase

1. Abra o dashboard do seu projeto no Supabase (`https://supabase.com/dashboard`).
2. No menu lateral esquerdo, clique no ícone de chave **Authentication**.
3. Selecione a aba **Email Templates**.
4. Para cada template:
   - Abra a seção correspondente (Reset Password / Confirm Signup / Invite User).
   - Defina o assunto do e-mail (ex: `Código de Verificação de Senha — WattWise`).
   - Cole o código HTML correspondente do diretório `supabase/templates/`.
   - Clique em **Save** no canto inferior direito.
5. Faça um disparo de teste informando seu próprio e-mail para validar a entrega visual.
