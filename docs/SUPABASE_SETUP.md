# Guia de Configuração do Supabase — WattWise

Este guia apresenta o passo a passo para provisionar um projeto **Supabase Cloud**, executar as migrações SQL do banco de dados multi-tenant (**9 tabelas**), configurar o **Supabase Auth**, implantar a **Edge Function (`team-invite`)** e validar as políticas de **Row Level Security (RLS)**.

> **Nota sobre Operação Offline / Evento Escolar**: O Supabase Cloud é opcional para demonstrações e uso local. Sem variáveis do Supabase configuradas, o WattWise opera automaticamente no navegador com o **Modo Demonstração (`Mercato Café & Cozinha`)** e o **Motor Relacional Local (`wattwise_saas_db_v2`)**.

---

## 1. Criação do Projeto no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e clique em **New Project**.
2. Defina:
   - **Name**: `wattwise` (ou `wattwise-prod`).
   - **Database Password**: Gere uma senha forte e armazene-a com segurança.
   - **Region**: Escolha `South America (São Paulo - sa-east-1)` para menor latência no Brasil.
3. Aguarde a conclusão do provisionamento (~2 minutos).
4. Acesse **Project Settings → API** e anote:
   - **Project URL** (`VITE_SUPABASE_URL`).
   - **Project API Keys → `anon` `public`** (`VITE_SUPABASE_ANON_KEY`).
   - **Project API Keys → `service_role` `secret`** (uso exclusivo da Edge Function `team-invite` no servidor, jamais no frontend).

---

## 2. Execução das Migrações SQL (9 Tabelas)

O schema do WattWise está organizado em dois arquivos sequenciais em `supabase/migrations/`:
1. `20261122000001_initial_saas_schema.sql` — Cria as 9 tabelas (`profiles`, `organizations`, `organization_members`, `organization_invitations`, `equipment`, `energy_readings`, `organization_settings`, `energy_alerts`, `audit_logs`), constraints, índices e triggers.
2. `20261122000002_rls_and_security_policies.sql` — Habilita RLS nas 9 tabelas, cria as funções `SECURITY DEFINER` com `SET search_path = public` e aplica as políticas RBAC (`owner`, `admin`, `operator`, `viewer`).

### Opção A: Via Supabase CLI (Recomendado)

```bash
# 1. Autentique-se na CLI do Supabase
npx supabase login

# 2. Vincule o diretório local ao seu projeto remoto
npx supabase link --project-ref <SEU_PROJECT_REF>

# 3. Aplique as migrações no banco remoto
npx supabase db push
```

### Opção B: Via SQL Editor no Supabase Dashboard

1. No painel do Supabase, acesse **SQL Editor → New query**.
2. Copie e execute o conteúdo de `supabase/migrations/20261122000001_initial_saas_schema.sql`.
3. Em uma nova query, copie e execute o conteúdo de `supabase/migrations/20261122000002_rls_and_security_policies.sql`.
4. Acesse **Table Editor** e confirme que as **9 tabelas** estão listadas com o selo **RLS Enabled** ativo.

---

## 3. Configuração do Supabase Auth (E-mail e Redirect URLs)

1. No Supabase Dashboard, acesse **Authentication → URL Configuration**.
2. Configure **Site URL** com a URL principal da aplicação (ex.: `https://wattwise.vercel.app` ou `http://localhost:5173` para desenvolvimento local).
3. Em **Redirect URLs**, adicione:
   - `http://localhost:5173/**`
   - `https://*.vercel.app/**`
   - Seu domínio personalizado (se houver).
4. Em **Authentication → Providers → Email**:
   - Mantenha **Enable Email provider** ativado.
   - Para testes rápidos ou demonstrações com criação de conta ao vivo, você pode desativar temporariamente *Confirm email*; em produção contínua, mantenha *Confirm email* ativado com SMTP configurado.

---

## 4. Deploy da Supabase Edge Function (`team-invite`)

O WattWise possui **1 Edge Function** serverless:

| Edge Function | Caminho | Responsabilidade |
| :--- | :--- | :--- |
| **`team-invite`** | `supabase/functions/team-invite` | Verifica o JWT do usuário, valida se o solicitante é `owner` ou `admin`, cria o convite com token SHA-256 em `organization_invitations`, registra em `audit_logs` e informa o status do envio SMTP. |

### 4.1. Configurar Segredos Opcionais de E-mail (SMTP)

Caso deseje que a função `team-invite` dispare e-mails transacionais automaticamente, configure os segredos no cofre do Supabase:

```bash
npx supabase secrets set \
  SMTP_HOST="smtp.seuprovedor.com" \
  SMTP_PORT="587" \
  SMTP_USER="seu-usuario-smtp" \
  SMTP_PASS="sua-senha-smtp" \
  SMTP_FROM="WattWise <no-reply@suaorganizacao.com.br>"
```

> **Nota**: As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo runtime das Edge Functions do Supabase.

### 4.2. Publicar a Edge Function

```bash
# Deploy da função de convites de equipe (exige JWT válido do usuário autenticado)
npx supabase functions deploy team-invite
```

---

## 5. Como Testar e Validar as Políticas RLS

Execute o roteiro abaixo no **SQL Editor** do Supabase para confirmar que o isolamento multi-tenant está ativo nas 9 tabelas:

```sql
-- 1. Verificar se todas as 9 tabelas públicas possuem RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Resultado esperado: rowsecurity = true para todas as 9 tabelas.

-- 2. Simular contexto de um usuário autenticado específico (substitua pelo UUID de teste)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

-- Deve retornar APENAS organizações das quais o usuário 0000...0001 é membro:
SELECT id, name, slug FROM public.organizations;

-- Tentar inserir equipamento em uma organização alheia deve falhar com erro de violação RLS (42501):
-- INSERT INTO public.equipment (organization_id, name, category, rated_power_w)
-- VALUES ('99999999-9999-9999-9999-999999999999', 'Teste Invasão', 'Outros', 100);

ROLLBACK;
```
