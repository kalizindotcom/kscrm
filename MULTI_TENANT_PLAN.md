# Plano de Migração: Sistema Multi-Tenant com Admin Master

## 📊 Análise da Estrutura Atual

### ✅ O que já existe:
- Sistema de autenticação JWT (access + refresh tokens)
- Model `User` com campo `role` (admin | user)
- Middleware de autenticação (`requireAuth`)
- Todas as entidades já têm `userId` (Sessions, Campaigns, Contacts, etc.)
- Sistema de logs e auditoria básico

### ❌ O que falta:
- **Planos/Assinaturas**: Não existe controle de planos
- **Limites por plano**: Sem controle de quotas (sessões, campanhas, mensagens)
- **Painel Admin**: Não existe interface administrativa
- **Multi-tenancy completo**: Isolamento de dados não está 100% garantido
- **Billing/Pagamentos**: Sem integração de pagamento
- **Logs de acesso**: Sem rastreamento de login/atividade por usuário
- **Permissões granulares**: Role atual é muito simples (apenas admin/user)

---

## 🏗️ Arquitetura Proposta

### 1. **Modelo de Dados (Prisma Schema)**

#### 1.1 Tabela `Organization` (Tenant)
```prisma
model Organization {
  id              String    @id @default(cuid())
  name            String
  slug            String    @unique  // URL-friendly identifier
  domain          String?   @unique  // Custom domain (opcional)
  logo            String?
  
  // Billing
  planId          String
  plan            Plan      @relation(fields: [planId], references: [id])
  planStartedAt   DateTime  @default(now())
  planExpiresAt   DateTime?
  billingEmail    String
  
  // Status
  status          String    @default("active") // active | suspended | cancelled | trial
  trialEndsAt     DateTime?
  
  // Limites atuais (cache do plano)
  maxUsers        Int       @default(1)
  maxSessions     Int       @default(1)
  maxCampaigns    Int       @default(10)
  maxContacts     Int       @default(1000)
  maxMessagesDay  Int       @default(500)
  
  // Uso atual
  currentUsers    Int       @default(0)
  currentSessions Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  users           User[]
  subscriptions   Subscription[]
  usageLogs       UsageLog[]
}
```

#### 1.2 Tabela `Plan` (Planos de Assinatura)
```prisma
model Plan {
  id              String    @id @default(cuid())
  name            String    // "Free", "Starter", "Pro", "Enterprise"
  slug            String    @unique
  description     String?
  
  // Preço
  price           Decimal   @default(0)
  currency        String    @default("BRL")
  interval        String    @default("monthly") // monthly | yearly | lifetime
  
  // Limites
  maxUsers        Int       @default(1)
  maxSessions     Int       @default(1)
  maxCampaigns    Int       @default(10)
  maxContacts     Int       @default(1000)
  maxMessagesDay  Int       @default(500)
  maxGroupsPerSession Int   @default(50)
  
  // Features
  features        Json      // { "warmup": true, "api": false, "priority_support": false }
  
  // Status
  isActive        Boolean   @default(true)
  isPublic        Boolean   @default(true) // Visível para novos usuários
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  organizations   Organization[]
  subscriptions   Subscription[]
}
```

#### 1.3 Tabela `Subscription` (Histórico de Assinaturas)
```prisma
model Subscription {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  planId          String
  plan            Plan      @relation(fields: [planId], references: [id])
  
  status          String    // active | cancelled | expired | pending
  startedAt       DateTime
  expiresAt       DateTime?
  cancelledAt     DateTime?
  
  // Pagamento
  paymentMethod   String?   // credit_card | pix | boleto | manual
  paymentStatus   String?   // pending | paid | failed | refunded
  amount          Decimal?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([organizationId, status])
}
```

#### 1.4 Atualizar `User` (adicionar Organization)
```prisma
model User {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  email           String    @unique
  passwordHash    String
  name            String
  role            String    @default("user") // super_admin | admin | user | viewer
  avatar          String?
  
  // Status
  status          String    @default("active") // active | suspended | invited
  lastLoginAt     DateTime?
  lastLoginIp     String?
  
  // Permissões específicas (JSON)
  permissions     Json?     // { "campaigns.create": true, "sessions.delete": false }
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  sessions        Session[]
  campaigns       Campaign[]
  refreshTokens   RefreshToken[]
  contacts        Contact[]
  templates       MessageTemplate[]
  imports         ContactImport[]
  warmupPlans     WarmupPlan[]
  activityLogs    ActivityLog[]
  
  @@index([organizationId])
  @@index([email])
}
```

#### 1.5 Tabela `ActivityLog` (Logs de Atividade)
```prisma
model ActivityLog {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String?
  user            User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  action          String    // login | logout | session.create | campaign.fire | etc
  module          String    // auth | sessions | campaigns | contacts
  resource        String?   // ID do recurso afetado
  details         Json?     // Dados adicionais
  
  ipAddress       String?
  userAgent       String?
  
  timestamp       DateTime  @default(now())
  
  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
  @@index([action, timestamp])
}
```

#### 1.6 Tabela `UsageLog` (Uso de Recursos)
```prisma
model UsageLog {
  id              String    @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  date            DateTime  @db.Date
  
  // Contadores diários
  messagesSent    Int       @default(0)
  campaignsFired  Int       @default(0)
  sessionsActive  Int       @default(0)
  apiCalls        Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([organizationId, date])
  @@index([organizationId, date])
}
```

---

### 2. **Backend - Mudanças Necessárias**

#### 2.1 Middleware de Multi-Tenancy
```typescript
// backend/src/middleware/tenant.ts
export async function requireTenant(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user; // Já populado pelo requireAuth
  if (!user) throw new UnauthorizedError('Not authenticated');
  
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: { plan: true }
  });
  
  if (!org) throw new NotFoundError('Organization not found');
  if (org.status === 'suspended') throw new ForbiddenError('Organization suspended');
  if (org.status === 'cancelled') throw new ForbiddenError('Organization cancelled');
  
  // Verificar expiração do plano
  if (org.planExpiresAt && org.planExpiresAt < new Date()) {
    throw new ForbiddenError('Plan expired');
  }
  
  req.organization = org;
  req.plan = org.plan;
}
```

#### 2.2 Middleware de Limites (Quotas)
```typescript
// backend/src/middleware/quotas.ts
export function checkQuota(resource: 'sessions' | 'campaigns' | 'contacts' | 'messages') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const org = req.organization;
    const plan = req.plan;
    
    switch (resource) {
      case 'sessions':
        if (org.currentSessions >= plan.maxSessions) {
          throw new ForbiddenError(`Limite de sessões atingido (${plan.maxSessions})`);
        }
        break;
      case 'campaigns':
        const count = await prisma.campaign.count({ where: { userId: req.user.sub } });
        if (count >= plan.maxCampaigns) {
          throw new ForbiddenError(`Limite de campanhas atingido (${plan.maxCampaigns})`);
        }
        break;
      // ... outros recursos
    }
  };
}
```

#### 2.3 Novos Endpoints - Admin Master

```typescript
// backend/src/modules/admin/admin.routes.ts

// ─── Organizations ───
GET    /api/admin/organizations          // Listar todas as orgs
GET    /api/admin/organizations/:id      // Detalhes de uma org
POST   /api/admin/organizations          // Criar nova org
PUT    /api/admin/organizations/:id      // Editar org
DELETE /api/admin/organizations/:id      // Deletar org
POST   /api/admin/organizations/:id/suspend    // Suspender org
POST   /api/admin/organizations/:id/activate   // Ativar org

// ─── Users (Admin) ───
GET    /api/admin/users                  // Listar todos os usuários
GET    /api/admin/users/:id              // Detalhes de um usuário
POST   /api/admin/users                  // Criar usuário
PUT    /api/admin/users/:id              // Editar usuário
DELETE /api/admin/users/:id              // Deletar usuário
POST   /api/admin/users/:id/suspend      // Suspender usuário
GET    /api/admin/users/:id/activity     // Logs de atividade

// ─── Plans ───
GET    /api/admin/plans                  // Listar planos
POST   /api/admin/plans                  // Criar plano
PUT    /api/admin/plans/:id              // Editar plano
DELETE /api/admin/plans/:id              // Deletar plano

// ─── Subscriptions ───
GET    /api/admin/subscriptions          // Listar assinaturas
POST   /api/admin/subscriptions          // Criar assinatura manual
PUT    /api/admin/subscriptions/:id      // Atualizar assinatura

// ─── Analytics ───
GET    /api/admin/stats                  // Estatísticas gerais
GET    /api/admin/usage                  // Uso de recursos
GET    /api/admin/activity               // Logs de atividade global

// ─── Sessions (Admin View) ───
GET    /api/admin/sessions               // Ver todas as sessões de todos os usuários
GET    /api/admin/sessions/:id/groups    // Ver grupos de uma sessão
```

#### 2.4 Atualizar Endpoints Existentes

Todos os endpoints existentes precisam:
1. Adicionar `requireTenant` middleware
2. Filtrar por `organizationId` nas queries
3. Verificar quotas antes de criar recursos

Exemplo:
```typescript
// ANTES
app.post('/api/sessions', { preHandler: requireAuth }, async (req) => {
  const session = await prisma.session.create({
    data: { userId: req.user.sub, ...body }
  });
  return session;
});

// DEPOIS
app.post('/api/sessions', {
  preHandler: [requireAuth, requireTenant, checkQuota('sessions')]
}, async (req) => {
  const session = await prisma.session.create({
    data: {
      userId: req.user.sub,
      ...body
    }
  });
  
  // Incrementar contador
  await prisma.organization.update({
    where: { id: req.organization.id },
    data: { currentSessions: { increment: 1 } }
  });
  
  return session;
});
```

---

### 3. **Frontend - Mudanças Necessárias**

#### 3.1 Nova Página: Admin Dashboard
```
src/pages/admin/
├── AdminDashboard.tsx          // Overview geral
├── OrganizationsPage.tsx       // Gerenciar organizações
├── UsersManagementPage.tsx     // Gerenciar usuários
├── PlansPage.tsx               // Gerenciar planos
├── SubscriptionsPage.tsx       // Gerenciar assinaturas
├── ActivityLogsPage.tsx        // Logs de atividade
├── UsageAnalyticsPage.tsx      // Analytics de uso
└── SystemSettingsPage.tsx      // Configurações do sistema
```

#### 3.2 Componentes Admin
```
src/components/admin/
├── OrganizationCard.tsx
├── OrganizationModal.tsx
├── UserTable.tsx
├── UserModal.tsx
├── PlanCard.tsx
├── PlanModal.tsx
├── ActivityLogTable.tsx
├── UsageChart.tsx
└── QuotaIndicator.tsx
```

#### 3.3 Atualizar Layout
```typescript
// src/components/layout/DashboardLayout.tsx
// Adicionar item no menu apenas para super_admin:

{user.role === 'super_admin' && (
  <NavItem icon={Shield} label="Admin" to="/admin" />
)}
```

#### 3.4 Atualizar Store
```typescript
// src/store/index.ts
interface AuthState {
  user: User & {
    organization: Organization;
    plan: Plan;
  };
  // ...
}
```

#### 3.5 Indicadores de Quota na UI
```typescript
// Mostrar em todas as páginas relevantes:
<QuotaIndicator
  current={organization.currentSessions}
  max={plan.maxSessions}
  label="Sessões"
/>
```

---

### 4. **Fluxo de Onboarding**

#### 4.1 Registro de Nova Organização
```
1. Admin Master cria organização
2. Define plano inicial (trial de 7 dias)
3. Cria primeiro usuário (admin da org)
4. Envia email de boas-vindas com credenciais
5. Usuário faz primeiro login e configura perfil
```

#### 4.2 Upgrade de Plano
```
1. Usuário acessa "Configurações > Plano"
2. Escolhe novo plano
3. Preenche dados de pagamento
4. Sistema atualiza limites automaticamente
5. Email de confirmação
```

---

### 5. **Segurança e Isolamento**

#### 5.1 Row-Level Security (RLS)
- Todas as queries devem filtrar por `organizationId`
- Middleware `requireTenant` garante isolamento
- Testes automatizados para verificar isolamento

#### 5.2 Permissões Granulares
```typescript
// Exemplo de verificação de permissão
function can(user: User, action: string): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return true; // Admin da org tem tudo
  
  const permissions = user.permissions as Record<string, boolean>;
  return permissions?.[action] === true;
}

// Uso:
if (!can(req.user, 'campaigns.delete')) {
  throw new ForbiddenError('Sem permissão');
}
```

---

### 6. **Migração de Dados Existentes**

```sql
-- 1. Criar organização padrão
INSERT INTO "Organization" (id, name, slug, "planId", "billingEmail")
VALUES ('default-org', 'Organização Principal', 'main', 'free-plan', 'admin@kscsm.com');

-- 2. Criar plano free
INSERT INTO "Plan" (id, name, slug, price, "maxUsers", "maxSessions", "maxCampaigns")
VALUES ('free-plan', 'Free', 'free', 0, 5, 3, 50);

-- 3. Associar usuários existentes à org padrão
UPDATE "User" SET "organizationId" = 'default-org';

-- 4. Adicionar role super_admin ao primeiro usuário
UPDATE "User" SET role = 'super_admin' WHERE email = 'admin@kscsm.com';
```

---

## 📋 Checklist de Implementação

### Fase 1: Database & Backend Core (Semana 1-2)
- [ ] Criar migrations Prisma (Organization, Plan, Subscription, etc)
- [ ] Implementar middleware `requireTenant`
- [ ] Implementar middleware `checkQuota`
- [ ] Atualizar todos os endpoints existentes com tenant isolation
- [ ] Criar endpoints admin básicos (CRUD organizations, users, plans)
- [ ] Implementar sistema de activity logs
- [ ] Testes de isolamento de dados

### Fase 2: Admin Dashboard Frontend (Semana 3)
- [ ] Criar páginas admin (Dashboard, Organizations, Users, Plans)
- [ ] Componentes de gerenciamento (tabelas, modais, forms)
- [ ] Gráficos e analytics
- [ ] Indicadores de quota na UI
- [ ] Atualizar menu lateral com item Admin

### Fase 3: Quotas & Limites (Semana 4)
- [ ] Implementar contadores de uso em tempo real
- [ ] Bloquear ações quando quota atingida
- [ ] Notificações de limite próximo
- [ ] Página de upgrade de plano
- [ ] Testes de limites

### Fase 4: Billing & Pagamentos (Semana 5-6)
- [ ] Integração com gateway de pagamento (Stripe/Mercado Pago)
- [ ] Fluxo de checkout
- [ ] Webhooks de pagamento
- [ ] Renovação automática
- [ ] Faturas e recibos

### Fase 5: Polimento & Testes (Semana 7)
- [ ] Testes end-to-end
- [ ] Documentação
- [ ] Migração de dados de produção
- [ ] Deploy gradual

---

## 🎯 Funcionalidades do Painel Admin

### Dashboard Principal
- Total de organizações (ativas, trial, suspensas)
- Total de usuários
- Receita mensal (MRR)
- Gráfico de crescimento
- Últimas atividades
- Alertas (planos expirando, quotas atingidas)

### Gerenciar Organizações
- Tabela com todas as orgs
- Filtros (status, plano, data de criação)
- Ações: Editar, Suspender, Deletar, Ver detalhes
- Modal de detalhes:
  - Informações básicas
  - Plano atual e histórico
  - Uso de recursos (gráficos)
  - Usuários da org
  - Sessões ativas
  - Grupos de cada sessão
  - Logs de atividade

### Gerenciar Usuários
- Tabela com todos os usuários (de todas as orgs)
- Filtros (org, role, status, último login)
- Ações: Editar, Suspender, Deletar, Ver logs
- Modal de detalhes:
  - Informações pessoais
  - Organização
  - Permissões
  - Último login (data, IP, user agent)
  - Histórico de atividades (últimos 100)
  - Sessões criadas
  - Campanhas disparadas

### Gerenciar Planos
- Cards com todos os planos
- Criar/Editar planos
- Definir limites e features
- Ativar/Desativar planos
- Histórico de mudanças

### Logs de Atividade Global
- Tabela com todas as ações do sistema
- Filtros (org, usuário, ação, módulo, data)
- Exportar para CSV
- Busca avançada

### Analytics de Uso
- Gráficos de uso por organização
- Mensagens enviadas por dia/semana/mês
- Sessões ativas por período
- Campanhas disparadas
- Top organizações por uso
- Previsão de crescimento

---

## 💰 Sugestão de Planos

### Free (R$ 0/mês)
- 1 usuário
- 1 sessão
- 10 campanhas
- 500 contatos
- 100 mensagens/dia

### Starter (R$ 49/mês)
- 3 usuários
- 3 sessões
- 50 campanhas
- 5.000 contatos
- 1.000 mensagens/dia
- Warmup básico

### Pro (R$ 149/mês)
- 10 usuários
- 10 sessões
- Campanhas ilimitadas
- 50.000 contatos
- 10.000 mensagens/dia
- Warmup avançado
- API access
- Suporte prioritário

### Enterprise (R$ 499/mês)
- Usuários ilimitados
- 50 sessões
- Tudo ilimitado
- 500.000 contatos
- 100.000 mensagens/dia
- White-label
- Suporte dedicado
- SLA 99.9%

---

## 🚀 Próximos Passos

1. **Revisar este plano** e ajustar conforme necessário
2. **Criar branch** para desenvolvimento multi-tenant
3. **Começar pela Fase 1** (Database & Backend Core)
4. **Testes contínuos** de isolamento de dados
5. **Deploy em staging** antes de produção

---

**Estimativa total**: 6-8 semanas de desenvolvimento full-time
**Complexidade**: Alta (requer mudanças estruturais profundas)
**Risco**: Médio (migração de dados existentes)
