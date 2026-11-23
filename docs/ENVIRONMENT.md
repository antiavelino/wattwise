# Referência de Variáveis de Ambiente — WattWise

Este documento especifica todas as variáveis de ambiente utilizadas pelo **WattWise**, separando rigorosamente as variáveis públicas expostas ao cliente web (**Vite Frontend**) dos segredos exclusivos de servidor (**Supabase Edge Function `team-invite`**).

---

## 1. Regra de Ouro: Separação Cliente vs. Servidor

No Vite (`import.meta.env`), **qualquer variável iniciada por `VITE_`** é incorporada estaticamente no bundle JavaScript entregue ao navegador.

- **Variáveis `VITE_*` (Públicas)**: contêm apenas o endereço da API e a chave pública `anon` do Supabase, segura para uso no cliente porque todo acesso ao banco é controlado por **Row Level Security (RLS)**.
- **Segredos de Servidor (Sem prefixo `VITE_`)**: `SUPABASE_SERVICE_ROLE_KEY` e credenciais `SMTP_*` **nunca** devem receber o prefixo `VITE_` nem ser cadastrados como variáveis públicas do frontend.

---

## 2. Variáveis Públicas do Cliente Web (Frontend Vite)

Configuradas em `.env.local` (desenvolvimento local) e em **Settings → Environment Variables** na Vercel (Preview e Production):

| Variável | Obrigatória? | Exemplo | Descrição |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | Opcional* | `https://seu-projeto.supabase.co` | URL base da API REST e Auth do projeto Supabase Cloud. |
| `VITE_SUPABASE_ANON_KEY` | Opcional* | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | Chave pública `anon` do Supabase, sujeita às políticas de RLS. |
| `VITE_APP_URL` | Recomendada | `https://wattwise.vercel.app` | URL pública da aplicação web, usada em redirecionamentos de autenticação e links de convite. |

> **\*Operação Offline / Zero-Config**: Se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` não estiverem definidas, o WattWise entra automaticamente no **Modo Local (`wattwise_saas_db_v2`)** e mantém o **Modo Demonstração (`Mercato Café & Cozinha`)** 100% funcional offline — ideal para apresentações presenciais em eventos escolares.

---

## 3. Segredos Exclusivos de Servidor (Edge Function `team-invite`)

Configurados exclusivamente no cofre do Supabase via `npx supabase secrets set` (ou em `supabase/.env.local` para testes locais com a CLI):

### 3.1. Credenciais do Runtime Supabase (Injetadas Automaticamente)

| Variável | Escopo | Descrição |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Edge Runtime | URL interna do projeto Supabase. |
| `SUPABASE_ANON_KEY` | Edge Runtime | Usada em `team-invite` para validar o token JWT do usuário autenticado. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Runtime (**Crítico**) | Chave administrativa usada exclusivamente no servidor após validação do JWT e do papel RBAC (`owner`/`admin`). |

### 3.2. Envio Transacional de E-mails (Opcional — Convites de Equipe)

| Variável | Escopo | Descrição |
| :--- | :--- | :--- |
| `SMTP_HOST` | Edge Function (`team-invite`) | Hostname do servidor SMTP transacional (ex.: `smtp.resend.com`). |
| `SMTP_PORT` | Edge Function (`team-invite`) | Porta SMTP (`587` para STARTTLS ou `465` para TLS). |
| `SMTP_USER` | Edge Function (`team-invite`) | Usuário de autenticação SMTP. |
| `SMTP_PASS` | Edge Function (`team-invite`) | Senha ou chave privada do servidor SMTP. |
| `SMTP_FROM` | Edge Function (`team-invite`) | Endereço remetente exibido nos convites (ex.: `no-reply@wattwise.com.br`). |

---

## 4. Modelo de Referência (`.env.local`)

```dotenv
# ==============================================================================
# WATTWISE — SMART ENERGY INTELLIGENCE
# Copie para .env.local para desenvolvimento local.
# NUNCA faça commit de arquivos .env ou .env.local com credenciais reais.
# ==============================================================================

# 1. VARIÁVEIS PÚBLICAS DO CLIENTE WEB (VITE FRONTEND)
# Se deixadas em branco, o WattWise opera localmente/offline com Modo Demonstração.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:5173

# 2. SEGREDOS EXCLUSIVOS DE SERVIDOR (EDGE FUNCTION team-invite)
# Configure via `npx supabase secrets set ...` — NUNCA adicione o prefixo VITE_!
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="WattWise <no-reply@exemplo.com.br>"
```
