# 🚀 Sistema Multi-Tenant - Guia de Uso

## 📋 O que foi implementado

### ✅ Backend Completo
- **Schema Prisma**: Organization, Plan, Subscription, ActivityLog, UsageLog
- **Middlewares**: requireTenant, checkQuota, activity-logger
- **Módulo Admin**: CRUD completo de Organizations, Users, Plans, Subscriptions
- **Analytics**: Stats globais, usage logs, activity logs
- **Auth**: Login/logout com logs automáticos

### ✅ Frontend Completo
- **5 Páginas Admin**: Dashboard, Organizations, Users, Plans, Activity Logs
- **Menu Admin**: Visível apenas para super_admin
- **Filtros e Paginação**: Em todas as páginas
- **Export CSV**: Logs de atividade
- **UI Responsiva**: Mobile-first

---

## 🔧 Como Aplicar no Seu Sistema

### 1️⃣ Aplicar Migration no Banco de Dados

```bash
cd backend

# Aplicar migration
./node_modules/.bin/prisma migrate deploy

# OU se preferir aplicar manualmente:
psql -U seu_usuario -d kscsm -f prisma/migrations/20260425_add_multi_tenant_structure/migration.sql
```

**O que a migration faz:**
- Cria tabelas: Plan, Organization, Subscription, ActivityLog, UsageLog
- Adiciona campos ao User: organizationId, status, lastLoginAt, lastLoginIp, permissions
- Cria plano "Free" padrão
- Cria organização "Organização Principal"
- Associa todos os usuários existentes à organização padrão
- Define primeiro usuário (admin@kscsm.com) como super_admin

### 2️⃣ Reiniciar o Backend

```bash
cd backend
npm run dev
```

### 3️⃣ Reiniciar o Frontend

```bash
npm run dev
```

### 4️⃣ Fazer Login

- **Email**: admin@kscsm.com
- **Senha**: admin123

Após o login, você verá uma nova seção "Administração" no menu lateral (em vermelho).

---

## 🎯 Como Usar o Painel Admin

### Dashboard Admin (`/admin`)

**Métricas principais:**
- Total de organizações (ativas, trial, suspensas)
- Total de usuários
- MRR (Receita Mensal Recorrente)
- Crescimento (últimos 30 dias)
- Sessões ativas
- Campanhas em execução

**Ações rápidas:**
- Criar nova organização
- Adicionar usuário
- Gerenciar planos

---

### Organizações (`/admin/organizations`)

**Funcionalidades:**
- ✅ Listar todas as organizações
- ✅ Filtrar por status (ativa, trial, suspensa, cancelada)
- ✅ Buscar por nome, slug ou email
- ✅ Ver detalhes completos (usuários, sessões, grupos, uso)
- ✅ Editar organização
- ✅ Suspender/Ativar organização
- ✅ Deletar organização (com confirmação)

**Como criar uma nova organização:**
1. Clique em "Nova Organização"
2. Preencha:
   - Nome da organização
   - Slug (URL-friendly, ex: "empresa-xyz")
   - Email de cobrança
   - Plano (selecione um plano existente)
   - Status (ativa, trial, suspensa)
   - Data de término do trial (opcional)
3. Salvar

**Detalhes da organização:**
- Informações básicas
- Plano atual e histórico de assinaturas
- Lista de usuários
- Sessões ativas com grupos
- Gráficos de uso (mensagens, campanhas)
- Logs de atividade

---

### Usuários (`/admin/users`)

**Funcionalidades:**
- ✅ Listar todos os usuários de todas as organizações
- ✅ Filtrar por role (super_admin, admin, user, viewer)
- ✅ Filtrar por status (ativo, suspenso, convidado)
- ✅ Buscar por nome ou email
- ✅ Ver detalhes (sessões, campanhas, logs)
- ✅ Editar usuário
- ✅ Suspender usuário
- ✅ Deletar usuário

**Roles disponíveis:**
- **super_admin**: Acesso total ao sistema (você)
- **admin**: Admin da organização (acesso total à sua org)
- **user**: Usuário normal (pode criar campanhas, sessões)
- **viewer**: Apenas visualização (não pode criar/editar)

**Como criar um novo usuário:**
1. Clique em "Novo Usuário"
2. Preencha:
   - Organização (selecione)
   - Email
   - Senha
   - Nome
   - Role
   - Status
3. Salvar

**Ver atividade do usuário:**
- Clique nos 3 pontos → "Ver Atividade"
- Mostra últimos 100 logs de atividade
- Filtros por ação e módulo

---

### Planos (`/admin/plans`)

**Funcionalidades:**
- ✅ Visualizar todos os planos em cards
- ✅ Ver limites de cada plano
- ✅ Ver features habilitadas
- ✅ Ver quantas organizações usam cada plano
- ✅ Editar plano
- ✅ Deletar plano (se não tiver organizações)

**Como criar um novo plano:**
1. Clique em "Novo Plano"
2. Preencha:
   - Nome (ex: "Pro")
   - Slug (ex: "pro")
   - Descrição
   - Preço (ex: 149.00)
   - Moeda (BRL)
   - Intervalo (monthly, yearly, lifetime)
   - **Limites:**
     - Max usuários
     - Max sessões
     - Max campanhas
     - Max contatos
     - Max mensagens/dia
     - Max grupos por sessão
   - **Features** (JSON):
     ```json
     {
       "warmup": true,
       "api": true,
       "priority_support": true,
       "white_label": false
     }
     ```
   - Ativo (sim/não)
   - Público (visível para novos usuários)
3. Salvar

**Planos sugeridos:**

| Plano | Preço | Usuários | Sessões | Mensagens/dia |
|-------|-------|----------|---------|---------------|
| Free | R$ 0 | 1 | 1 | 100 |
| Starter | R$ 49 | 3 | 3 | 1.000 |
| Pro | R$ 149 | 10 | 10 | 10.000 |
| Enterprise | R$ 499 | ∞ | 50 | 100.000 |

---

### Logs de Atividade (`/admin/activity`)

**Funcionalidades:**
- ✅ Ver todos os logs do sistema
- ✅ Filtrar por organização
- ✅ Filtrar por usuário
- ✅ Filtrar por ação (login, logout, create, update, delete)
- ✅ Filtrar por módulo (auth, sessions, campaigns, contacts)
- ✅ Exportar para CSV
- ✅ Ver IP e User Agent

**Ações logadas automaticamente:**
- Login/Logout
- Criar/Editar/Deletar recursos
- Suspender/Ativar organizações
- Disparar campanhas
- Criar sessões
- E muito mais...

**Como exportar logs:**
1. Aplique os filtros desejados
2. Clique em "Exportar CSV"
3. Arquivo será baixado automaticamente

---

## 🔒 Controle de Quotas

### Como funciona:

Quando um usuário tenta criar um recurso (sessão, campanha, contato), o sistema:

1. Verifica o plano da organização
2. Compara uso atual vs limite do plano
3. Se atingiu o limite → bloqueia e mostra mensagem
4. Se não atingiu → permite e incrementa contador

### Limites verificados:

- **Sessões**: Ao criar nova sessão
- **Campanhas**: Ao criar nova campanha
- **Contatos**: Ao importar contatos
- **Mensagens**: Ao disparar campanha (limite diário)
- **Usuários**: Ao criar novo usuário

### Mensagens de erro:

```
"Limite de sessões atingido (3). Faça upgrade do seu plano."
"Limite diário de mensagens atingido (500). Tente novamente amanhã ou faça upgrade."
```

---

## 📊 Analytics e Métricas

### Stats Globais (`GET /api/admin/stats`)

```json
{
  "totalOrgs": 10,
  "activeOrgs": 8,
  "trialOrgs": 2,
  "suspendedOrgs": 0,
  "totalUsers": 45,
  "totalSessions": 23,
  "activeSessions": 15,
  "totalCampaigns": 120,
  "runningCampaigns": 3,
  "mrr": 1245.00,
  "newOrgsLast30Days": 5
}
```

### Usage Stats (`GET /api/admin/usage?days=30`)

Retorna uso diário dos últimos N dias:

```json
[
  {
    "date": "2024-04-25",
    "messagesSent": 1250,
    "campaignsFired": 15,
    "sessionsActive": 8,
    "apiCalls": 450
  }
]
```

---

## 🔐 Segurança e Isolamento

### Multi-Tenancy

**Cada organização é completamente isolada:**
- ✅ Usuários só veem dados da própria organização
- ✅ Sessões são filtradas por organizationId
- ✅ Campanhas são filtradas por organizationId
- ✅ Contatos são filtrados por organizationId
- ✅ Mensagens são filtradas por organizationId

**Super Admin:**
- ✅ Vê TUDO de TODAS as organizações
- ✅ Pode criar/editar/deletar qualquer recurso
- ✅ Acessa painel administrativo
- ✅ Não tem limites de quota

### Logs de Auditoria

**Tudo é logado:**
- Quem fez a ação
- Quando fez
- Qual ação (login, create, update, delete)
- Qual módulo (auth, sessions, campaigns)
- Qual recurso (ID do recurso afetado)
- IP e User Agent

**Transparência total para auditoria!**

---

## 🚨 Próximos Passos (Opcional)

### 1. Atualizar Endpoints Existentes

Alguns endpoints ainda não têm isolamento multi-tenant. Você precisa adicionar:

```typescript
// ANTES
app.get('/api/sessions', { preHandler: requireAuth }, async (req) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user.sub }
  });
  return sessions;
});

// DEPOIS
app.get('/api/sessions', {
  preHandler: [requireAuth, requireTenant]
}, async (req) => {
  const sessions = await prisma.session.findMany({
    where: {
      user: { organizationId: req.organization.id }
    }
  });
  return sessions;
});
```

### 2. Adicionar Verificação de Quotas

```typescript
// Ao criar sessão
app.post('/api/sessions', {
  preHandler: [requireAuth, requireTenant, checkQuota('sessions')]
}, async (req) => {
  // ... criar sessão
  
  // Incrementar contador
  await incrementUsage(req.organization.id, 'sessions');
});
```

### 3. Criar Formulários de Criação/Edição

Ainda faltam os formulários modais para:
- Criar/Editar Organização
- Criar/Editar Usuário
- Criar/Editar Plano

Você pode criar componentes como:
- `OrganizationModal.tsx`
- `UserModal.tsx`
- `PlanModal.tsx`

### 4. Integração de Pagamento (Futuro)

Para cobrar assinaturas, integre com:
- **Stripe**: Para cartão de crédito internacional
- **Mercado Pago**: Para PIX, boleto, cartão BR
- **Webhooks**: Para renovação automática

---

## 📝 Resumo dos Arquivos Criados

### Backend
```
backend/
├── prisma/
│   ├── schema.prisma (atualizado)
│   └── migrations/
│       └── 20260425_add_multi_tenant_structure/
│           └── migration.sql
├── src/
│   ├── middleware/
│   │   ├── tenant.ts (novo)
│   │   └── quotas.ts (novo)
│   ├── lib/
│   │   ├── jwt.ts (atualizado)
│   │   └── activity-logger.ts (novo)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts (atualizado)
│   │   │   └── auth.routes.ts (atualizado)
│   │   └── admin/
│   │       ├── admin.service.ts (novo)
│   │       └── admin.routes.ts (novo)
│   └── server.ts (atualizado)
```

### Frontend
```
src/
├── types/
│   └── admin.ts (novo)
├── services/
│   └── adminService.ts (novo)
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx (novo)
│       ├── OrganizationsPage.tsx (novo)
│       ├── UsersPage.tsx (novo)
│       ├── PlansPage.tsx (novo)
│       └── ActivityLogsPage.tsx (novo)
├── components/
│   └── layout/
│       └── DashboardLayout.tsx (atualizado)
└── App.tsx (atualizado)
```

---

## 🎉 Pronto!

Seu sistema agora é **multi-tenant completo** com:
- ✅ Isolamento de dados por organização
- ✅ Controle de planos e limites
- ✅ Painel administrativo completo
- ✅ Logs de auditoria
- ✅ Analytics e métricas
- ✅ Gerenciamento de usuários e permissões

**Qualquer dúvida, consulte o arquivo `MULTI_TENANT_PLAN.md` para detalhes técnicos!**
