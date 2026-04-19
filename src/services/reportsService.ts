import { Campaign, Contact, WhatsAppGroup, Integration } from "@/types";

export interface CampaignLog {
  id: string;
  campaignId: string;
  contactName: string;
  phone: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  sentAt: string;
  responseBody?: string;
}

export interface DetailedCampaign extends Campaign {
  logs: CampaignLog[];
  totalProcessingTime: string;
  responsibleUser: string;
  origin: string;
}

export interface ContactMetrics {
  addedToday: number;
  added7d: number;
  added30d: number;
  deletedToday: number;
  totalContacts: number;
  totalFiles: number;
  messagesSent: number;
  messagesReceived: number;
  manualContacts: number;
  importedViaFile: number;
  duplicatesDetected: number;
  invalidNumbers: number;
  validNumbers: number;
  withName: number;
  withoutName: number;
  withTags: number;
  withoutTags: number;
  activeLast30d: number;
  inactiveLongTime: number;
  blocked: number;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  inactiveSessions: number;
  errorSessions: number;
  disconnectedSessions: number;
  avgStability: string;
  avgReconnectionTime: string;
  totalReconnections: number;
  availabilityRate: number;
  uptime: string;
  downtime: string;
  logs: { timestamp: string; action: string; status: string; details: string }[];
}

export interface GroupMetrics {
  totalGroups: number;
  activeGroups: number;
  syncedToday: number;
  failedSync: number;
  avgMembers: number;
  totalMembers: number;
  exportedRecently: number;
  history: { date: string; members: number }[];
}

// Mock Data Generators
const generateCampaignLogs = (campaignId: string, count: number): CampaignLog[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${campaignId}-${i}`,
    campaignId,
    contactName: `Contato ${i + 1}`,
    phone: `551199999${i.toString().padStart(4, '0')}`,
    status: Math.random() > 0.1 ? 'success' : 'failed',
    errorMessage: Math.random() > 0.9 ? 'Número inválido' : Math.random() > 0.9 ? 'Sessão desconectada' : undefined,
    sentAt: new Date().toISOString(),
    responseBody: '{"status": "delivered", "id": "msg_123"}'
  }));
};

export const mockCampaigns: DetailedCampaign[] = [
  {
    id: '1',
    name: 'Promoção de Verão',
    channel: 'whatsapp',
    status: 'completed',
    templateId: 'temp1',
    segmentId: 'seg1',
    sentCount: 1500,
    deliveredCount: 1450,
    failedCount: 50,
    responseCount: 120,
    totalProcessingTime: '12m 30s',
    responsibleUser: 'Admin',
    origin: 'Importação CSV',
    createdAt: '2023-11-01T10:00:00Z',
    updatedAt: '2023-11-01T10:12:30Z',
    logs: generateCampaignLogs('1', 50)
  },
  {
    id: '2',
    name: 'Aviso de Manutenção',
    channel: 'whatsapp',
    status: 'completed',
    templateId: 'temp2',
    segmentId: 'seg2',
    sentCount: 800,
    deliveredCount: 795,
    failedCount: 5,
    responseCount: 10,
    totalProcessingTime: '5m 15s',
    responsibleUser: 'Admin',
    origin: 'Manual',
    createdAt: '2023-11-05T14:00:00Z',
    updatedAt: '2023-11-05T14:05:15Z',
    logs: generateCampaignLogs('2', 20)
  }
];

export const mockContactMetrics: ContactMetrics = {
  addedToday: 45,
  added7d: 320,
  added30d: 1250,
  deletedToday: 2,
  totalContacts: 5430,
  totalFiles: 28,
  messagesSent: 15420,
  messagesReceived: 3210,
  manualContacts: 450,
  importedViaFile: 4980,
  duplicatesDetected: 15,
  invalidNumbers: 84,
  validNumbers: 5346,
  withName: 5100,
  withoutName: 330,
  withTags: 4200,
  withoutTags: 1230,
  activeLast30d: 3100,
  inactiveLongTime: 1100,
  blocked: 42
};

export const mockSessionMetrics: SessionMetrics = {
  totalSessions: 12,
  activeSessions: 10,
  inactiveSessions: 1,
  errorSessions: 1,
  disconnectedSessions: 0,
  avgStability: '98.5%',
  avgReconnectionTime: '14s',
  totalReconnections: 5,
  availabilityRate: 99.2,
  uptime: '15d 4h 22m',
  downtime: '1h 12m',
  logs: [
    { timestamp: '2023-11-08T09:00:00Z', action: 'Conexão', status: 'Sucesso', details: 'Sessão autenticada com sucesso' },
    { timestamp: '2023-11-08T10:30:00Z', action: 'Desconexão', status: 'Alerta', details: 'Perda de conexão com o dispositivo' },
    { timestamp: '2023-11-08T10:31:00Z', action: 'Reconexão', status: 'Sucesso', details: 'Conexão restabelecida automaticamente' },
  ]
};

export const mockGroupMetrics: GroupMetrics = {
  totalGroups: 85,
  activeGroups: 82,
  syncedToday: 12,
  failedSync: 1,
  avgMembers: 145,
  totalMembers: 12325,
  exportedRecently: 5,
  history: [
    { date: '2023-11-01', members: 11000 },
    { date: '2023-11-02', members: 11200 },
    { date: '2023-11-03', members: 11500 },
    { date: '2023-11-04', members: 11800 },
    { date: '2023-11-05', members: 12100 },
    { date: '2023-11-06', members: 12325 },
  ]
};

export const reportsService = {
  getCampaigns: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockCampaigns;
  },
  getContactMetrics: async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockContactMetrics;
  },
  getSessionMetrics: async () => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return mockSessionMetrics;
  },
  getGroupMetrics: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockGroupMetrics;
  },
  exportCSV: (data: any[], filename: string) => {
    console.log(`Exportando ${filename}...`, data);
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
