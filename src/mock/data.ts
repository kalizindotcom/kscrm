import { Contact, Campaign, MessageTemplate, Conversation, Integration, AuditLog, User, WhatsAppGroup } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Admin User',
  role: 'admin',
  avatar: 'https://github.com/shadcn.png',
};

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'João Silva',
    phone: '+55 11 99999-9999',
    origin: 'Landing Page',
    status: 'active',
    optIn: 'granted',
    tags: ['vip', 'newsletter'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    phone: '+55 21 98888-8888',
    origin: 'API Integration',
    status: 'active',
    optIn: 'granted',
    tags: ['lead'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Pedro Santos',
    phone: '+55 31 97777-7777',
    origin: 'Manual',
    status: 'inactive',
    optIn: 'revoked',
    tags: ['churn'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockTemplates: MessageTemplate[] = [
  {
    id: '1',
    title: 'Boas-vindas',
    category: 'Onboarding',
    channel: 'whatsapp',
    content: 'Olá {{nome}}, seja bem-vindo à nossa plataforma!',
    isFavorite: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Promoção Relâmpago',
    category: 'Vendas',
    channel: 'whatsapp',
    content: 'Olá {{nome}}, aproveite nossa promoção de 50% de desconto!',
    isFavorite: false,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Black Friday 2023',
    channel: 'whatsapp',
    status: 'completed',
    templateId: '2',
    segmentId: '1',
    sentCount: 1500,
    deliveredCount: 1480,
    failedCount: 20,
    responseCount: 450,
    buttonsEnabled: true,
    buttons: [
      { text: 'Aproveitar Oferta', type: 'url', value: 'https://exemplo.com/blackfriday' },
      { text: 'Falar com Consultor', type: 'call', value: '+5511999999999' }
    ],
    mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    mediaType: 'image',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Boas-vindas WhatsApp',
    channel: 'whatsapp',
    status: 'running',
    templateId: '1',
    segmentId: '2',
    sentCount: 50,
    deliveredCount: 48,
    failedCount: 2,
    responseCount: 10,
    buttonsEnabled: true,
    buttons: [
      { text: 'Conhecer Mais', type: 'url', value: 'https://exemplo.com/onboarding' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Recuperação de Carrinho',
    channel: 'whatsapp',
    status: 'paused',
    templateId: '2',
    segmentId: '3',
    sentCount: 200,
    deliveredCount: 195,
    failedCount: 5,
    responseCount: 40,
    buttonsEnabled: true,
    buttons: [
      { text: 'Finalizar Compra', type: 'url', value: 'https://exemplo.com/cart' }
    ],
    mediaUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    mediaType: 'image',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockConversations: Conversation[] = [
  {
    id: '1',
    contactId: '1',
    contactName: 'João Silva',
    phone: '+55 11 99999-9999',
    campaignName: 'Black Friday 2023',
    lastMessage: 'Olá, gostaria de saber mais sobre o produto.',
    unreadCount: 2,
    status: 'open',
    isGroup: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    contactId: '2',
    contactName: 'Maria Oliveira',
    phone: '+55 21 98888-8888',
    campaignName: 'Boas-vindas WhatsApp',
    lastMessage: 'Obrigada pelo retorno!',
    unreadCount: 0,
    status: 'resolved',
    isGroup: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    contactId: '3',
    contactName: 'Grupo VIP Vendas',
    phone: 'group_id_123',
    lastMessage: 'Nova oferta postada.',
    unreadCount: 0,
    status: 'open',
    isGroup: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    contactId: '4',
    contactName: 'Lucas Lima',
    phone: '+55 31 97777-7777',
    campaignName: 'Promoção Relâmpago',
    lastMessage: 'Consigo desconto no boleto?',
    unreadCount: 1,
    status: 'open',
    isGroup: false,
    updatedAt: new Date().toISOString(),
  },
];

export const mockIntegrations: Integration[] = [
  {
    id: '1',
    provider: 'WhatsApp Personal',
    type: 'whatsapp',
    status: 'connected',
    lastSync: new Date().toISOString(),
    sessionDetails: {
      phoneNumber: '+55 11 99999-9999',
      batteryLevel: 85,
      signalStrength: 4
    }
  },
  {
    id: '2',
    provider: 'WhatsApp Business API',
    type: 'whatsapp',
    status: 'disconnected',
    lastSync: new Date(Date.now() - 86400000).toISOString(),
    sessionDetails: {
      lastDisconnect: new Date(Date.now() - 86400000).toISOString(),
      reason: 'Sessão expirada ou encerrada pelo usuário.',
      phoneNumber: '+55 11 98888-8888'
    }
  },
  {
    id: '3',
    provider: 'Customer Support Line',
    type: 'whatsapp',
    status: 'paused',
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    sessionDetails: {
      phoneNumber: '+55 11 97777-7777',
      reason: 'Pausado manualmente pelo administrador'
    }
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Admin User',
    action: 'LOGIN',
    module: 'AUTH',
    status: 'success',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    userId: '1',
    userName: 'Admin User',
    action: 'CREATE_CONTACT',
    module: 'CONTACTS',
    status: 'success',
    timestamp: new Date().toISOString(),
    details: 'Created contact João Silva',
  },
];

export const mockGroups: WhatsAppGroup[] = [
  {
    id: '1',
    name: 'Grupo de Vendas SP',
    memberCount: 156,
    messageCount: 1240,
    description: 'Grupo focado em leads da região de São Paulo para prospecção ativa.',
    status: 'active',
    isAdmin: false,
    photo: 'https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?w=100&h=100&fit=crop',
    admins: ['João Silva', 'Maria Oliveira'],
    members: ['Pedro Santos', 'Ana Costa', 'Lucas Lima', 'Juliana Mota'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Clientes VIP 2024',
    memberCount: 89,
    messageCount: 856,
    description: 'Acesso antecipado a promoções e lançamentos exclusivos para clientes selecionados.',
    status: 'active',
    isAdmin: true,
    photo: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop',
    admins: ['Admin User'],
    members: ['Carlos Souza', 'Fernanda Dias', 'Ricardo Silva'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Suporte Técnico Nível 1',
    memberCount: 12,
    messageCount: 342,
    description: 'Comunicação interna para equipe de suporte e resolução de chamados rápidos.',
    status: 'inactive',
    isAdmin: false,
    photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop',
    admins: ['Lucas Lima'],
    members: ['Mariana Rocha', 'Tiago Nunes'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
