# Guia de Deploy em Produção (Vercel) — WattWise

Este guia documenta como publicar o **WattWise — Smart Energy Intelligence** na **Vercel** (ambientes de Preview e Production), detalhando o roteamento SPA, os cabeçalhos HTTP de segurança em `vercel.json`, as variáveis de ambiente e o checklist de verificação antes do evento ou lançamento.

---

## 1. Pré-Requisitos

Antes de publicar na Vercel, confirme localmente:
1. `npm run typecheck` passa sem erros de TypeScript.
2. `npm test` passa com 100% da suíte Vitest aprovada.
3. `npm run build` gera `dist/` sem erros.
4. *(Opcional)* Caso utilize persistência em nuvem, o projeto **Supabase Cloud** está configurado conforme [docs/SUPABASE_SETUP.md](file:///c:/antigravity%20sites/WattWise/docs/SUPABASE_SETUP.md) com as 9 tabelas e RLS habilitado.
   - **Dica para Evento Escolar**: Mesmo sem configurar variáveis do Supabase na Vercel, a aplicação publicada funciona integralmente no navegador com o **Modo Demonstração (`Mercato Café & Cozinha`)** e o **Motor Relacional Local**.

---

## 2. Importação do Projeto na Vercel

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard) e clique em **Add New... → Project**.
2. Importe o repositório Git do **WattWise**.
3. Em **Build and Output Settings**, valide a detecção automática para **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (`tsc -b && vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 3. Variáveis de Ambiente no Vercel Dashboard

Caso conecte ao Supabase Cloud, acesse **Settings → Environment Variables** e cadastre **apenas as variáveis públicas (`VITE_*`)**:

| Chave | Valor | Ambientes |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://<SEU_PROJECT_REF>.supabase.co` | `Production`, `Preview`, `Development` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | `Production`, `Preview`, `Development` |
| `VITE_APP_URL` | `https://wattwise.vercel.app` | `Production` |

> **Alerta de Segurança**: **NUNCA** cadastre `SUPABASE_SERVICE_ROLE_KEY` ou `SMTP_PASS` nas variáveis do frontend na Vercel. Esses segredos pertencem exclusivamente ao cofre da Edge Function `team-invite` no Supabase (`npx supabase secrets set`).

---

## 4. Rewrites de SPA e Cabeçalhos de Segurança (`vercel.json`)

O arquivo [vercel.json](file:///c:/antigravity%20sites/WattWise/vercel.json) na raiz do projeto garante:
1. Redirecionamento de rotas SPA para `/index.html` sem erro `404` ao recarregar o navegador.
2. Cabeçalhos HTTP de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) e cache imutável para assets compilados em `/assets/*`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!assets/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 5. Ambientes de Preview vs. Production

- **Preview Deployments**: cada branch ou Pull Request gera uma URL dedicada (`https://wattwise-git-<branch>.vercel.app`). Se usar Supabase Auth, mantenha `https://*.vercel.app/**` em **Redirect URLs**.
- **Production Deployment**: merges na branch `main` atualizam a URL principal de produção automaticamente.

---

## 6. Checklist Pré-Evento / Go-Live

- [ ] **Qualidade & Build Local**:
  - [ ] `npm run typecheck` finalizado com código `0`.
  - [ ] `npm test` aprovado em 100% dos testes Vitest.
  - [ ] `npm run build` concluído sem erros.
- [ ] **Higiene de Segredos**:
  - [ ] Confirmado que o bundle em `dist/assets/*.js` não contém `service_role` nem senhas SMTP.
- [ ] **Banco de Dados (se Supabase Cloud estiver ativo)**:
  - [ ] Migrações `20261122000001_initial_saas_schema.sql` e `20261122000002_rls_and_security_policies.sql` aplicadas.
  - [ ] Todas as **9 tabelas** do schema `public` exibem **RLS Enabled**.
  - [ ] URL de produção cadastrada em **Authentication → URL Configuration**.
- [ ] **Smoke Test Pós-Deploy (Essencial para Apresentação)**:
  - [ ] Landing Page abre sem erros no console e dá acesso direto ao **Modo Demonstração** sem login.
  - [ ] Organização demonstrativa **`Mercato Café & Cozinha`** carrega 8 equipamentos, 16 dias de histórico, 2 anomalias, recomendações e impacto ambiental em `kg CO₂e` (`0,0817 kg CO₂/kWh`).
  - [ ] Cadastrar novo equipamento e nova leitura (direta ou por medidor cumulativo) atualiza KPIs, gráfico e alertas instantaneamente.
  - [ ] Botão **Restaurar Ambiente** redefine o Modo Demonstração ao estado inicial limpo.
  - [ ] Exportação em **CSV**, **JSON** e visualização **PDF** funciona corretamente.
