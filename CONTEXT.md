# KS CSM — Contexto Geral do Projeto para Integração Backend

> Documento de referência único gerado em **2026-04-18** para guiar a integração do frontend (atualmente 100% Lovable / React+Vite+TS) com um backend próprio, deploy em VPS Hostinger via **Dokploy**, usando **Baileys** como provedor de sessões de WhatsApp.
>
> **Regras inegociáveis assumidas neste documento**:
> - Nenhuma página, componente, botão, animação ou efeito visual será removido ou alterado.
> - Todos os dados mockados devem ser substituídos por dados reais vindos do backend, mantendo os mesmos formatos de tipo (`src/types/index.ts`, `src/components/connectors/types.ts`, `src/components/live-view/types.ts`).
> - Todos os botões visíveis hoje devem executar ação real conectada ao backend.
> - Fluxos em tempo real (QR, status de sessão, progresso de campanha, chat ao vivo) devem usar WebSocket.

---

## 1. Stack Atual (fixa, não alterar)

**Runtime / Build**
- React 18.3.1 + React DOM 18.3.1
- React Router DOM 7.14.1
- Vite 5.4.19 + `@vitejs/plugin-react-swc`
- TypeScript 5.8.3 (strict desligado, `allowJs: true`)
- Alias `@/*` → `./src/*`
- Dev server porta **8080** (`vite.config.ts`)

**UI / Styling**
- Tailwind 3.4.17 + `tailwindcss-animate` + `tailwind-merge` + `clsx` + `class-variance-authority`
- shadcn/ui (Radix) — 30+ primitives (accordion, dialog, dropdown, tabs, toast, tooltip, etc.)
- `lucide-react` (ícones)
- `next-themes` (dark/light)
- `sonner` (toast) + `use-toast` wrapper
- `framer-motion` 12.38.0 (animações)
- `embla-carousel-react`, `vaul`, `react-resizable-panels`, `cmdk`, `input-otp`, `emoji-picker-react`, `react-day-picker`

**Estado / Dados**
- `zustand` 5.0.12 (+ `persist` middleware no `useSessionStore`)
- `@tanstack/react-query` 5.83.0 (QueryClient já montado em `App.tsx`, uso ainda mínimo — ideal para substituir chamadas mock)
- `@tanstack/react-table` 8.21.3

**Formulários / Validação**
- `react-hook-form` 7.72.1 + `@hookform/resolvers` 5.2.2 + `zod` 4.3.6

**Gráficos / Datas**
- `recharts` 3.8.1, `date-fns` 4.1.0

**Dev**
- `vitest` 3.2.4 + `jsdom`, `eslint` 9, `lovable-tagger` (dev).

---

## 2. Estrutura de Pastas

```
src/
├── App.tsx                     # Rotas + QueryClient + PrivateRoute
├── main.tsx                    # Entry
├── index.css                   # Tailwind + tokens CSS (cores, --sidebar-*)
├── vite-env.d.ts
│
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ContactsPage.tsx
│   ├── CampaignsPage.tsx
│   ├── GroupsPage.tsx
│   ├── InboxPage.tsx
│   ├── LiveViewPage.tsx
│   ├── ConnectorsPage.tsx
│   ├── ReportsPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFound.tsx
│
├── components/
│   ├── layout/DashboardLayout.tsx
│   ├── NavLink.tsx
│   ├── ui/                     # shadcn components
│   ├── connectors/             # sessões Baileys
│   ├── contacts/               # imports / exports
│   ├── campaigns/              # modal de disparo
│   ├── live-view/              # chat em tempo real
│   ├── messages/               # inbox
│   └── reports/                # relatórios
│
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
│
├── store/
│   ├── index.ts                # useAuthStore + useAppStore
│   └── useSessionStore.ts      # Zustand + persist (localStorage)
│
├── services/
│   ├── apiClient.ts            # HOJE MOCK — ponto #1 de integração
│   ├── contactService.ts
│   └── reportsService.ts
│
├── types/index.ts              # Contratos de dado (referência para o backend)
├── lib/utils.ts                # cn() + formatadores
├── mock/data.ts                # Dados fake de todas as entidades
└── test/                       # vitest setup
```

---

## 3. Rotas

Definidas em `src/App.tsx`:

| Rota | Componente | Acesso |
|---|---|---|
| `/login` | `LoginPage` | público |
| `/` | `DashboardPage` | privado |
| `/contacts` | `ContactsPage` | privado |
| `/campaigns` | `CampaignsPage` | privado |
| `/groups` | `GroupsPage` | privado |
| `/live-view` | `LiveViewPage` | privado |
| `/messages` | `InboxPage` | privado |
| `/connectors` | `ConnectorsPage` | privado |
| `/reports` | `ReportsPage` | privado |
| `/settings` | `SettingsPage` | privado |
| `*` | redirect `/` | — |

`PrivateRoute` checa `useAuthStore().isAuthenticated`. Se false → `<Navigate to="/login" />`. Caso contrário, renderiza dentro de `DashboardLayout` (sidebar + topbar).

**Menu lateral** (`DashboardLayout`): Dashboard, Contatos, Campanhas, Live-View, Grupos, Mensagens, Conectores, Relatórios, Configurações.

---

## 4. Mapa Página a Página

### 4.1 `LoginPage.tsx`
- `Tabs` Login / Registro. Registro está desativado (contato admin).
- Campos: `username`, `password`. Login mock: `admin`/`admin`.
- Animações: `animate-float` (logo), `animate-shake` (erro), transições no focus.
- **Backend**: `POST /api/auth/login` → `{ token, user }`. Guardar token em `useAuthStore` (Zustand persist recomendado). `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.

### 4.2 `DashboardPage.tsx`
- 5 seções de métricas (Visão Geral, Entrega, Engajamento & IA, IA, Conversão & ROI).
- `MetricCard` com `whileHover={{ scale: 1.02, translateY: -2 }}` (framer-motion) — manter.
- `AreaChart` de Recharts: série Contatos + Envios ao longo do tempo.
- Card "Canais Ativos" com health % e progress bars.
- Atalhos Rápidos → `/contacts`, `/templates` (inexistente ainda), `/connectors`, `/reports`.
- **Backend**: `GET /api/dashboard/overview` → retornar todas as métricas agregadas em um único payload (performance). WS opcional para live counters.

### 4.3 `ContactsPage.tsx`
- Tabs: "Todos os Contatos" (tabela) | "Importações (Kanban)".
- Ações: importar em massa (CSV/XLSX), exportar, ver detalhes da importação.
- Colunas: Nome, Arquivo, Data, Contatos, Status (completed/processing/pending/failed), Ações.
- **Backend**:
  - `GET /api/contacts?search=&status=&page=` (paginação)
  - `POST /api/contacts` / `PUT /api/contacts/:id` / `DELETE /api/contacts/:id`
  - `POST /api/contacts/import` (multipart/form-data com arquivo) → retorna `ContactImport` com `id` e processa em background
  - `GET /api/contacts/imports` / `GET /api/contacts/imports/:id`
  - `GET /api/contacts/export?format=csv|xlsx|json`
  - WS: `import.progress` (processedCount / status).

### 4.4 `CampaignsPage.tsx` (coração do produto)
- Grid de `CampaignCard` → clique abre `WhatsAppPreview` full-screen.
- Preview estilo iPhone iOS com header, chat, mensagem formatada, botões e footer.
- Formatação: `*bold*`, `_italic_`, `~strike~`, `{{nome}}` (variáveis), emojis (via `emoji-picker-react`).
- Configurações de disparo: upload contatos OU seleção de agenda, intervalo (slider 5–120s), escolha de sessão conectada, skip duplicates, validação.
- `CampaignFiringModal` confirma antes do disparo.
- `FireButton` com efeito de chamas (gradient + animações) — manter.
- Card "Andamento dos Disparos" aparece quando `useAppStore.isFiring === true`, mostra `progress` (0–100) e `currentTarget`.
- **⚠️ Botões interativos** (Saiba Mais / Falar com Consultor / Reply): ler seção 10 deste doc — Baileys **não** suporta oficialmente; renderizam como texto puro no destinatário. Decisão arquitetural obrigatória.
- **Backend**:
  - CRUD `/api/campaigns`
  - `POST /api/campaigns/:id/fire` body `{ sessionId, contactSource, interval, options }` → cria `CampaignJob`
  - WS: `campaign.progress` `{ campaignId, progress, currentTarget, sent, failed }`
  - `POST /api/campaigns/:id/cancel`
  - `GET /api/campaigns/:id/logs`

### 4.5 `GroupsPage.tsx`
- Lista grupos da sessão conectada. Cards com foto, nome, member count, badge admin.
- Dialogs: Detalhes do Grupo, Todos os Membros, Salvar para Agenda (gera `ContactImport`).
- Ações: sync global, export CSV (`55...` internacional), export Excel (TSV), importar membros para contatos.
- **Backend**:
  - `GET /api/sessions/:id/groups`
  - `POST /api/sessions/:id/groups/sync` → busca via Baileys `groupFetchAllParticipating`
  - `POST /api/groups/:id/sync-members`
  - `GET /api/groups/:id/export?format=csv|xlsx`
  - `POST /api/groups/:id/save-to-contacts` → cria `ContactImport`

### 4.6 `InboxPage.tsx`
- `MessageCard` list, tabs "Geral" e "Iniciadas".
- `NewMessageModal` (enviar avulsa), `ConversationDetailModal` (ver conversa).
- Search por nome/telefone, badges de status, unread counter com `animate-ping`.
- **Backend**:
  - `GET /api/conversations?status=&search=&page=`
  - `GET /api/conversations/:id/messages`
  - `POST /api/messages/send` `{ sessionId, phone, content, type }`
  - `PATCH /api/conversations/:id` (status open/pending/resolved)
  - `DELETE /api/conversations/:id`
  - WS: `message.new`, `message.status_update`.

### 4.7 `LiveViewPage.tsx`
- `SessionHeader` (select sessão conectada), `ChatList`, `ChatWindow`, `ContactSidebar`, `LiveViewModals`.
- Status de mensagem: pending/sending/sent/delivered/read/failed/replied. Retry para failed.
- Métricas por contato: totalSent, totalReceived, avgResponseTime, responseRate, failureCount.
- Upload de anexo, gravação de áudio, bloqueio de contato.
- **Backend**:
  - WS por sessão: `sessions/:id/stream` emitindo `{ type: 'message'|'presence'|'status', payload }`
  - `POST /api/messages/send` (text/media/audio)
  - `POST /api/messages/:id/retry`
  - `POST /api/contacts/:id/block`
  - `GET /api/contacts/:id/metrics`

### 4.8 `ConnectorsPage.tsx` (⚡ núcleo Baileys)
- `MetricsGrid` com 8 KPIs (total, connected, disconnected, paused, error, pairing, archived, reconnections).
- View Grid (`SessionCard`) ou Table (`SessionTable`).
- `CreateSessionModal`: name, nickname, environment (prod/test/sandbox), tags, description.
- `SessionDetails` (sidebar): últimos 50 logs, QR code (quando pairing), info detalhada.
- Ações por sessão: Connect/QR, Pause, Terminate, Delete, Favorite, Sync contatos.
- Status possíveis: `disconnected | pairing | connected | paused | syncing | warning | error | terminated | archived`.
- **Backend (Baileys)**:
  - `POST /api/sessions` → cria row + spawna instância Baileys
  - `GET /api/sessions` / `GET /api/sessions/:id`
  - `PATCH /api/sessions/:id` (nickname, tags, favorite, notes, description)
  - `DELETE /api/sessions/:id` → encerra socket + remove `authState`
  - `POST /api/sessions/:id/connect` → inicia pairing
  - `GET /api/sessions/:id/qr` → QR em dataUrl (ou WS)
  - `POST /api/sessions/:id/pairing-code` → `{ code: '12345678' }` (alternativa ao QR, Baileys `requestPairingCode`)
  - `POST /api/sessions/:id/pause` / `/resume` / `/terminate` / `/sync-contacts`
  - `GET /api/sessions/:id/logs`
  - WS: `session.status`, `session.qr`, `session.log`, `session.health`.
- Persistir `authState` do Baileys em **Postgres** (recomendado) ou Redis, não em arquivo local (escalabilidade/containers Dokploy).

### 4.9 `ReportsPage.tsx`
- `CampaignReport` (sent/delivered/failed/response/ROI), `ContactReport`, `ConnectorReport`, `GroupReport`.
- Export CSV por relatório, gráficos Recharts, filtros de date range.
- **Backend**:
  - `GET /api/reports/campaigns?from=&to=`
  - `GET /api/reports/contacts` / `/sessions` / `/groups`
  - `GET /api/reports/:type/export?format=csv|xlsx`

### 4.10 `SettingsPage.tsx`
- Placeholder atual. Definir depois: perfil, senha, tema, preferências de notificação, API keys.

---

## 5. Componentes Customizados (mapa completo)

**Layout**
- `layout/DashboardLayout.tsx` — sidebar colapsável (lg: fixa), topbar (search, notificações, user menu, theme toggle), logout.
- `NavLink.tsx` — wrapper do `Link` do router com active state.

**UI Especiais (não-shadcn) — manter exatamente**
- `FireButton` — botão com gradient + efeito chamas. Props: `intensity` (low/medium/high), `disabled`, `onClick`, `children`.
- `FlameButton` — variante.
- `GlowProgressBar` — progress com glow (CSS `river-progress-indicator`).

**Connectors** (`src/components/connectors/`)
- `ConnectorsDashboard.tsx`, `MetricsCards.tsx`, `SessionCard.tsx`, `SessionTable.tsx`, `SessionDetails.tsx`, `SessionStatusBadge.tsx`, `CreateSessionModal.tsx`, `QRCodeDisplay.tsx`, `types.ts`, `mock-data.ts`.

**Contacts** (`src/components/contacts/`)
- `ImportModal.tsx`, `ImportKanban.tsx`, `ImportDetailsModal.tsx`, `ExportModal.tsx`.

**Campaigns** (`src/components/campaigns/`)
- `CampaignFiringModal.tsx`.

**Messages** (`src/components/messages/`)
- `NewMessageModal.tsx`, `ConversationDetailModal.tsx`.

**Live-View** (`src/components/live-view/`)
- `ChatList.tsx`, `ChatWindow.tsx`, `ContactSidebar.tsx`, `EmptyState.tsx`, `SessionHeader.tsx`, `LiveViewModals.tsx`, `types.ts`, `mock-data.ts`.

**Reports** (`src/components/reports/`)
- `CampaignReport.tsx`, `ContactReport.tsx`, `ConnectorReport.tsx`, `GroupReport.tsx`.

---

## 6. Hooks / Store / Services

**Hooks**: `use-mobile`, `use-toast`.

**Stores (Zustand)**
- `useAuthStore` — `{ user, isAuthenticated, login, logout }`. **Adicionar**: `token`, `refreshToken`, persistir em localStorage.
- `useAppStore` — `{ sidebarOpen, theme, isFiring, activeCampaignId, progress, currentTarget, ... }`.
- `useSessionStore` — lista de `Session[]`, CRUD, `selectedSessionId`, `addSessionLog`. Já persistido em localStorage. **Manter** persist, mas sincronizar com WebSocket do backend (source of truth = backend).

**Services** (ponto central de integração)
- `services/apiClient.ts` — **HOJE É MOCK** (delays + console.log). Deve virar um cliente HTTP real (fetch/axios) com injeção de `Authorization: Bearer <token>`, tratamento de 401 → refresh, e interceptors de erro → toast.
- `services/contactService.ts` — `list/get/create/update/delete`.
- `services/reportsService.ts` — `getCampaigns`, `getContactMetrics`, `getSessionMetrics`, `getGroupMetrics`, `exportCSV`.

---

## 7. Tipos (contratos que o backend deve respeitar)

Principais interfaces em `src/types/index.ts`:
- `User`, `Contact`, `ContactStatus`, `ContactOptIn`, `Segment`
- `Campaign`, `CampaignStatus`, `CampaignChannel`, `CampaignButton`
- `MessageTemplate`
- `Conversation`, `Message`
- `Integration`
- `WhatsAppGroup`
- `AuditLog`, `ContactImport`, `Automation`

Em `src/components/connectors/types.ts`:
- `Session`, `SessionStatus`, `SessionLog`, `LogSeverity`, `ChannelType`, `EnvironmentType`, `ConnectorMetrics`.

Em `src/components/live-view/types.ts`:
- `LiveConversation`, `LiveMessage`, `MessageStatus`.

**Ação recomendada**: expor esses tipos também como OpenAPI spec / Zod schemas compartilhados entre front e back (monorepo com package `@ks/shared-types`).

---

## 8. Dados Mockados (substituir por backend — lista completa)

| Arquivo | Conteúdo |
|---|---|
| `src/mock/data.ts` | `mockUser`, `mockContacts` (3), `mockTemplates` (2), `mockCampaigns` (3), `mockConversations` (4), `mockIntegrations` (3), `mockAuditLogs` (2), `mockGroups` (3) |
| `src/components/connectors/mock-data.ts` | `mockSessions` (5 sessões de exemplo) |
| `src/components/live-view/mock-data.ts` | `mockConversations` (3 conversas ao vivo) |
| `src/services/reportsService.ts` | `mockCampaigns`, `mockContactMetrics`, `mockSessionMetrics`, `mockGroupMetrics` |

Plano de substituição:
1. Criar endpoints REST (seção 11).
2. Refatorar `apiClient.ts` para HTTP real.
3. Migrar cada serviço para usar `useQuery`/`useMutation` do React Query (`QueryClientProvider` já existe em `App.tsx`).
4. Remover arquivos mock só no final, depois que todas as páginas forem testadas em staging.

---

## 9. Animações / Efeitos (NÃO ALTERAR)

**Framer Motion**
- `MetricCard`: hover scale + translateY.
- Cards: initial `{ opacity: 0, y: 10 }` → animate `{ opacity: 1, y: 0 }`.
- Shortcuts hover: `x: 5`.
- `WhatsAppPreview`: `animate-in fade-in slide-in-from-bottom-4 duration-300`.
- Firing progress: `animate={{ width: '${progress}%' }}`.
- Dialog: `animate-in fade-in zoom-in-95 duration-300`.
- `ChatWindow`: slide-in-from-right.
- Loading: `rotate: 360` infinito.

**Tailwind (keyframes em `tailwind.config.ts` + `index.css`)**
- `accordion-down/up`
- `river-progress-indicator` (GlowProgressBar)
- `animate-float` (logo login)
- `animate-shake` (erro login)
- `animate-spin-slow`
- `animate-pulse`, `animate-ping`, `animate-bounce` — usos variados.

**CSS**
- `backdrop-blur-xl` em modais
- `shadow-[0_0_20px_rgba(...)]` glow nos FireButtons / badges
- `group-hover:*`
- `transition-all duration-300` generalizado.

---

## 10. ⚠️ Baileys × Features do Projeto (crítico)

Baseado em pesquisa nas issues oficiais do repositório `WhiskeySockets/Baileys` e guides 2025/2026. Versão de referência: **v7.0.0-rc.9** (21/11/2025).

| Feature do frontend | Baileys oficial | Observação / Alternativa |
|---|---|---|
| Envio de texto | ✅ | — |
| Formatação `* _ ~ ```` | ✅ | Renderização é client-side do destinatário |
| Envio de mídia (img/vídeo/áudio/doc/sticker) | ✅ | — |
| Multi-sessão (várias numerações) | ✅ | Persistir `authState` em Postgres/Redis |
| QR Code pairing | ✅ | — |
| Pairing Code 8 dígitos | ✅ | `sock.requestPairingCode()` — warm-up recomendado |
| Sync contatos | ⚠️ | `app-state-sync` instável, às vezes perde contatos |
| Sync grupos | ✅ | `groupFetchAllParticipating` |
| Presence / typing / read | ✅ | Recomendado p/ anti-ban |
| **Interactive Buttons** (`buttonsMessage`) | ❌ | Filtrados pelo servidor desde 05/2022. Caem como texto |
| **List Messages** | ❌ | Mesmo caso dos botões |
| **Template URL / Call buttons** | ❌ | Exclusivo WhatsApp Cloud API |
| **Reply Buttons** | ❌ | Forks injetam binary nodes mas quebram com frequência e geram ban |
| Broadcast em massa | ⚠️ | Tecnicamente funciona, mas **alto risco de ban**. Limites práticos: 8 msg/min, 200/h, 1.500/dia, delays 3–8s, warm-up 3–7 dias |

### Conclusão arquitetural obrigatória

O frontend já expõe UI de botões interativos em campanhas (`CampaignButton[]` com tipos `url | call | reply`). Existem **duas saídas**:

**Opção A — Híbrida (recomendada para produção séria)**
- Usar **Baileys** para: texto, mídia, automação 1-a-1, grupos, sync, chat ao vivo.
- Usar **WhatsApp Cloud API (Meta oficial)** para: botões interativos, list messages, templates aprovados, broadcasts grandes.
- Backend expõe uma camada de abstração `MessageProvider` com duas implementações (`BaileysProvider`, `CloudApiProvider`). A sessão tem campo `provider: 'baileys' | 'cloud_api'`. O campo `Session.channel` já prevê isso (`'whatsapp' | 'email' | 'sms' | 'webhook' | 'api_propria'`).

**Opção B — Baileys puro**
- Deixar a UI de botões visível mas marcá-la como "modo experimental" (só funciona de fato em contatos que tenham clientes não-Business atualizados e mesmo assim inconsistente).
- Em produção, o backend converte silenciosamente a mensagem com botões para **texto com numeração** (`1️⃣ Saiba Mais → link | 2️⃣ Falar com Consultor → tel:...`). O usuário responde com `1` ou `2` e um handler interpreta.
- Não quebra a UI/UX existente, mas não entrega a experiência de botões nativos.

> **Recomendação**: Opção A. Atualizar `CreateSessionModal` para pedir também qual provider é a sessão (`baileys` | `cloud_api`). Validar no `CampaignFiringModal` que campanhas com `buttonsEnabled: true` só são disparáveis por sessões `cloud_api`.

---

## 11. Contratos REST (mapa completo a implementar no backend)

### 11.1 Auth
```
POST   /api/auth/login            { email, password } → { token, refreshToken, user }
POST   /api/auth/refresh          { refreshToken }    → { token }
POST   /api/auth/logout
GET    /api/auth/me               → User
```

### 11.2 Contacts
```
GET    /api/contacts?search=&status=&page=&pageSize=
GET    /api/contacts/:id
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id
POST   /api/contacts/import       multipart: file + name → ContactImport
GET    /api/contacts/imports
GET    /api/contacts/imports/:id
GET    /api/contacts/export?format=csv|xlsx|json
```

### 11.3 Campaigns
```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
POST   /api/campaigns/:id/fire    { sessionId, contactSource, interval, options }
POST   /api/campaigns/:id/cancel
GET    /api/campaigns/:id/logs
```

### 11.4 Sessions (Baileys)
```
GET    /api/sessions
POST   /api/sessions              { name, nickname, provider, environment, tags }
GET    /api/sessions/:id
PATCH  /api/sessions/:id
DELETE /api/sessions/:id
POST   /api/sessions/:id/connect
POST   /api/sessions/:id/pause
POST   /api/sessions/:id/resume
POST   /api/sessions/:id/terminate
POST   /api/sessions/:id/sync-contacts
POST   /api/sessions/:id/pairing-code     → { code: '12345678' }
GET    /api/sessions/:id/qr               → { dataUrl }
GET    /api/sessions/:id/logs?limit=50
```

### 11.5 Messages / Conversations
```
GET    /api/conversations?sessionId=&status=&search=
GET    /api/conversations/:id
GET    /api/conversations/:id/messages?before=&limit=
POST   /api/messages/send         { sessionId, phone, content, type, buttons? }
POST   /api/messages/send-media   multipart: file + phone + sessionId + caption
POST   /api/messages/:id/retry
PATCH  /api/conversations/:id     { status }
DELETE /api/conversations/:id
```

### 11.6 Groups
```
GET    /api/sessions/:id/groups
POST   /api/sessions/:id/groups/sync
GET    /api/groups/:id
POST   /api/groups/:id/sync-members
GET    /api/groups/:id/export?format=csv|xlsx
POST   /api/groups/:id/save-to-contacts
```

### 11.7 Reports / Dashboard
```
GET    /api/dashboard/overview
GET    /api/reports/campaigns?from=&to=
GET    /api/reports/contacts
GET    /api/reports/sessions
GET    /api/reports/groups
GET    /api/reports/:type/export?format=csv|xlsx
```

### 11.8 WebSocket
```
WS     /ws
  → autentica com JWT
  → canais: session:{id}, campaign:{id}, conversation:{id}, user:{id}
  → eventos:
    session.qr               { sessionId, dataUrl }
    session.status           { sessionId, status, reason?, healthScore }
    session.log              { sessionId, log }
    message.new              { conversationId, message }
    message.status_update    { messageId, status }
    campaign.progress        { campaignId, progress, currentTarget, sent, failed }
    import.progress          { importId, processedCount, status }
```

---

## 12. Variáveis de Ambiente

**Frontend (`.env`)**
```
VITE_API_URL=https://api.seudominio.com
VITE_WS_URL=wss://api.seudominio.com/ws
```
Consumir via `import.meta.env.VITE_API_URL`.

**Backend (`.env` no Dokploy)**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://ks:senha@postgres:5432/kscsm
REDIS_URL=redis://redis:6379
JWT_SECRET=<gerar 64 chars>
JWT_REFRESH_SECRET=<gerar 64 chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BAILEYS_AUTH_STORE=postgres          # ou redis
BAILEYS_BROWSER=["KS CSM","Chrome","1.0"]
CLOUD_API_TOKEN=<opcional, para provider Meta>
CLOUD_API_PHONE_ID=<opcional>
CORS_ORIGIN=https://app.seudominio.com
UPLOAD_MAX_SIZE=50mb
UPLOAD_DIR=/data/uploads
```

---

## 13. Deploy Hostinger + Dokploy

**Arquitetura sugerida**
```
┌─ Dokploy (Docker Compose) ─────────────────────┐
│                                                │
│  frontend (Vite build estático)                │
│    → Nginx + /api proxy                        │
│                                                │
│  backend (Node 20 + Express/Fastify)           │
│    → Baileys process manager                   │
│    → WebSocket server                          │
│                                                │
│  postgres:16                                   │
│    → DB principal + authState Baileys          │
│                                                │
│  redis:7                                       │
│    → Filas (BullMQ) p/ campanhas + cache WS    │
│                                                │
│  nginx (reverse proxy + SSL via Let's Encrypt) │
└────────────────────────────────────────────────┘
```

**Dockerfile (frontend)** — build multi-stage com `npm ci && npm run build`, servir via nginx estático.

**Dockerfile (backend)** — Node 20 alpine, `bun` ou `pnpm` install, dependência nativa `@whiskeysockets/baileys` roda em pure-JS (sem builds nativos obrigatórios).

**Volumes persistentes no Dokploy**:
- `postgres_data` → dados DB
- `redis_data` → filas
- `uploads` → mídia recebida/enviada

**Boas práticas**:
- Processo Baileys **separado** do processo HTTP (usar BullMQ para jobs de envio / cluster / PM2).
- Reconexão automática com backoff exponencial.
- Health check endpoint `/health` → retorna status do DB, Redis, sessões ativas.
- Logs estruturados (pino/winston) → Grafana Loki ou Dokploy logs nativos.
- Backup diário do Postgres (inclui `authState` → permite restaurar sessões).

---

## 14. Plano de Execução (fases)

1. **Fase 1 — Infra**: subir Postgres + Redis + Backend bootstrap no Dokploy; healthcheck; CI/CD básico.
2. **Fase 2 — Auth**: `/api/auth/*`, substituir mock em `useAuthStore`, refresh token.
3. **Fase 3 — Sessions + Baileys**: CRUD + QR + Pairing Code + WebSocket `session.*`. Validar em `ConnectorsPage`.
4. **Fase 4 — Messages 1-a-1**: envio texto/mídia, inbox, live-view com WS.
5. **Fase 5 — Contacts + Groups**: CRUD, import, export, group sync.
6. **Fase 6 — Campaigns**: BullMQ para queue, WS `campaign.progress`, cancelamento.
7. **Fase 7 — Cloud API (opcional mas recomendado)**: segundo provider para botões interativos, templates.
8. **Fase 8 — Reports**: agregações, export CSV/XLSX, caching.
9. **Fase 9 — Observabilidade**: métricas, alertas de ban/desconexão.
10. **Fase 10 — Hardening**: rate limits, CSRF, audit logs, 2FA opcional.

---

## 15. Checklist de Integração (não perder nada)

- [ ] Substituir `services/apiClient.ts` por cliente HTTP real com `Authorization` + interceptors + refresh.
- [ ] Expor `import.meta.env.VITE_API_URL` e `VITE_WS_URL`.
- [ ] Montar cliente WebSocket singleton com reconnect + subscribe em `session:{id}`, `campaign:{id}`.
- [ ] Migrar cada `useState` que carrega mock para `useQuery` do React Query.
- [ ] Migrar cada `onClick` que manipula array local para `useMutation` + `queryClient.invalidateQueries`.
- [ ] `useAuthStore` salvar `token` em localStorage (persist).
- [ ] `useSessionStore` escutar WS `session.status` / `session.log` para atualizar em tempo real.
- [ ] `useAppStore.isFiring/progress/currentTarget` alimentado por WS `campaign.progress` em vez de `setInterval` mock.
- [ ] Ao deletar mock, manter tipos intactos em `src/types/*` para continuar tipando.
- [ ] Validar todas as páginas ponta a ponta antes de remover arquivos mock.
- [ ] Decidir provider por sessão (Baileys × Cloud API) — ver seção 10.
- [ ] Warm-up de sessões novas antes de usar em campanhas.
- [ ] Rate limit / anti-ban no backend (8 msg/min, pausas, delays humanizados).
- [ ] Nenhuma alteração em `tailwind.config.ts`, `index.css`, animações ou layouts.

---

**FIM DO DOCUMENTO DE CONTEXTO**
