# Arquitetura de Segurança, RLS & Governança Multi-Tenant — WattWise

A segurança do **WattWise** segue o princípio de **Defesa em Profundidade (Defense-in-Depth)**. O isolamento entre organizações não depende apenas de filtros no frontend React: toda leitura e escrita no modo Cloud é validada diretamente no PostgreSQL via **Row Level Security (RLS)** e a emissão de convites de equipe passa por validação autenticada na **Supabase Edge Function (`team-invite`)**.

---

## 1. Modelo Multi-Tenant e Matriz RBAC / RLS

Cada usuário autenticado via Supabase Auth (`auth.uid()`) vincula-se a uma ou mais organizações na tabela `public.organization_members` com um dos quatro papéis hierárquicos:

- **`owner` (Proprietário)**: Criador ou responsável principal pela organização. Possui controle total, incluindo gestão de administradores e exclusão da organização.
- **`admin` (Administrador)**: Gerencia membros (`operator` e `viewer`), convites de equipe, configurações tarifárias, limiar de anomalias, equipamentos, leituras e alertas.
- **`operator` (Operador)**: Focado na rotina operacional. Pode cadastrar e editar equipamentos, registrar leituras de consumo e reconhecer/resolver alertas. Não pode alterar tarifas nem gerenciar membros.
- **`viewer` (Visualizador)**: Acesso estritamente somente leitura (`SELECT`) a dashboards, inventário, histórico, alertas e exportação de relatórios.

### Matriz de Permissões RLS nas 9 Tabelas

| Tabela | Operação | `Owner` | `Admin` | `Operator` | `Viewer` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`profiles`** | `SELECT` (próprio ou colegas da org) | ✅ | ✅ | ✅ | ✅ |
| **`profiles`** | `INSERT / UPDATE` (apenas próprio) | ✅ | ✅ | ✅ | ✅ |
| **`organizations`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`organizations`** | `UPDATE` | ✅ | ✅ | ❌ | ❌ |
| **`organizations`** | `DELETE` | ✅ | ❌ | ❌ | ❌ |
| **`organization_members`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`organization_members`** | `INSERT / UPDATE / DELETE` | ✅ | ✅ *(operator/viewer)* | ❌ *(pode sair)* | ❌ *(pode sair)* |
| **`organization_invitations`** | `SELECT / INSERT / UPDATE / DELETE` | ✅ | ✅ *(operator/viewer no insert)* | ❌ | ❌ |
| **`organization_settings`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`organization_settings`** | `INSERT / UPDATE` (Tarifa / Limiar) | ✅ | ✅ | ❌ | ❌ |
| **`equipment`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`equipment`** | `INSERT / UPDATE` | ✅ | ✅ | ✅ | ❌ |
| **`equipment`** | `DELETE` | ✅ | ✅ | ❌ | ❌ |
| **`energy_readings`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`energy_readings`** | `INSERT / UPDATE` | ✅ | ✅ | ✅ | ❌ |
| **`energy_readings`** | `DELETE` | ✅ | ✅ | ❌ | ❌ |
| **`energy_alerts`** | `SELECT` | ✅ | ✅ | ✅ | ✅ |
| **`energy_alerts`** | `INSERT / UPDATE` (Ack/Resolve) | ✅ | ✅ | ✅ | ❌ |
| **`energy_alerts`** | `DELETE` | ✅ | ✅ | ❌ | ❌ |
| **`audit_logs`** | `SELECT` | ✅ | ✅ | ❌ | ❌ |
| **`audit_logs`** | `INSERT` | ✅ | ✅ | ✅ | ❌ |
| **`audit_logs`** | `UPDATE / DELETE` | ❌ *(Imutável)* | ❌ *(Imutável)* | ❌ | ❌ |

---

## 2. Hardening de Funções `SECURITY DEFINER` (`search_path`)

Para evitar recursão infinita ao consultar `organization_members` dentro de políticas RLS da própria tabela, a migração `20261122000002_rls_and_security_policies.sql` define funções auxiliares `SECURITY DEFINER`:
- `public.get_user_org_role(target_org_id UUID)`
- `public.user_has_org_role(target_org_id UUID, allowed_roles TEXT[])`
- `public.create_organization_with_owner(org_name TEXT, org_slug TEXT, org_timezone TEXT)`

### Proteção Contra Sequestro de `search_path`
Todas as funções `SECURITY DEFINER` fixam explicitamente `SET search_path = public` para impedir sombreamento de objetos em schemas temporários:

```sql
create or replace function public.user_has_org_role(
  target_org_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members om
     where om.organization_id = target_org_id
       and om.user_id = auth.uid()
       and om.role = any(allowed_roles)
  );
$$;
```

- A permissão `EXECUTE` é concedida exclusivamente à role `authenticated`.
- A identidade do usuário é sempre extraída de `auth.uid()` (token JWT validado pelo Supabase Auth), nunca de parâmetros enviados pelo cliente.

---

## 3. Prevenção Contra Spoofing de `organization_id` (Cross-Tenant Injection)

Se um usuário autenticado na **Organização A** tentar forjar uma requisição HTTP alterando o `organization_id` para o UUID da **Organização B**, o banco bloqueia a operação em três camadas:

1. **Cláusulas `USING` e `WITH CHECK` em Todas as Tabelas**:
   Toda escrita exige `WITH CHECK (public.user_has_org_role(organization_id, ARRAY[...]))`. Qualquer tentativa de gravar em um tenant sem permissão retorna erro `42501 (insufficient_privilege)`.
2. **Criação Atômica de Organização via RPC (`create_organization_with_owner`)**:
   Ao criar uma nova organização, a função RPC cria em uma única transação a organização, o vínculo `owner`, as configurações padrão (`organization_settings`) e o registro inicial em `audit_logs`, evitando estados órfãos.
3. **Imutabilidade de `audit_logs`**:
   Não há políticas RLS de `UPDATE` ou `DELETE` para `audit_logs`. Nem mesmo um `owner` consegue alterar ou apagar eventos registrados no histórico de auditoria pelo cliente web.

---

## 4. Segurança da Edge Function `team-invite`

A única Edge Function do WattWise — **`team-invite`** (`supabase/functions/team-invite/index.ts`) — protege o fluxo de convites de equipe com quatro camadas de validação:

1. **Verificação de JWT do Chamador**: valida o cabeçalho `Authorization: Bearer <token>` via `auth.getUser()` antes de qualquer operação.
2. **Autorização RBAC no Servidor**: consulta `organization_members` para confirmar que o solicitante possui papel `owner` ou `admin` na organização alvo (e impede que um `admin` convide outro `admin` se a política restringir a `operator`/`viewer`).
3. **Token Criptográfico com Hash SHA-256**: gera 24 bytes aleatórios via `crypto.getRandomValues`, armazena apenas o **hash SHA-256** (`token_hash`) em `organization_invitations` com data de expiração, e nunca persiste o token em texto puro no banco.
4. **Registro em `audit_logs` e Verificação Honesta de SMTP**: registra a emissão do convite na auditoria e informa claramente se o servidor SMTP está configurado para disparo de e-mail ou se o link deve ser compartilhado manualmente.

---

## 5. Higiene de Segredos no Frontend (Vite Bundle Security)

No Vite, **qualquer** variável com prefixo `VITE_` é embutida no bundle JavaScript público enviado ao navegador. Portanto:

- **Permitido no Frontend (`VITE_*`)**:
  - `VITE_SUPABASE_URL`: URL pública da API REST/Auth do projeto Supabase.
  - `VITE_SUPABASE_ANON_KEY`: Chave pública `anon`, projetada para operar com segurança sob **Row Level Security (RLS)**.
  - `VITE_APP_URL`: URL pública da aplicação web.
- **Estritamente Proibido no Frontend (NUNCA usar prefixo `VITE_`)**:
  - `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS — uso exclusivo interno da Edge Function `team-invite`).
  - `SMTP_PASS` ou credenciais privadas de servidores de e-mail.
- O arquivo `.gitignore` bloqueia `.env`, `.env.local` e arquivos de credenciais locais para evitar exposição acidental no repositório Git.
