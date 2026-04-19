import { apiClient } from './apiClient';

export interface CampaignLog {
  id: string;
  campaignId: string;
  contactName: string;
  phone: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  sentAt: string;
}

export interface DetailedCampaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  templateId?: string;
  segmentId?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  totalProcessingTime: string;
  responsibleUser: string;
  origin: string;
  logs: CampaignLog[];
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

export const reportsService = {
  getCampaigns: async (): Promise<DetailedCampaign[]> => {
    const raw = await apiClient.get<any[]>('/api/reports/campaigns');
    return raw.map((c) => ({
      ...c,
      totalProcessingTime: c.sentCount > 0 ? `${Math.round(c.sentCount * 0.3)}s` : '0s',
      responsibleUser: 'Admin',
      origin: 'Sistema',
      logs: [],
    }));
  },

  getContactMetrics: async (): Promise<ContactMetrics> => {
    const raw = await apiClient.get<{ total: number; active: number; inactive: number; pending: number }>('/api/reports/contacts');
    return {
      totalContacts: raw.total,
      addedToday: 0,
      added7d: 0,
      added30d: 0,
      deletedToday: 0,
      totalFiles: 0,
      messagesSent: 0,
      messagesReceived: 0,
      manualContacts: 0,
      importedViaFile: 0,
      duplicatesDetected: 0,
      invalidNumbers: 0,
      validNumbers: raw.active,
      withName: raw.active,
      withoutName: raw.inactive + raw.pending,
      withTags: 0,
      withoutTags: raw.total,
      activeLast30d: raw.active,
      inactiveLongTime: raw.inactive,
      blocked: 0,
    };
  },

  getSessionMetrics: async (): Promise<SessionMetrics> => {
    const raw = await apiClient.get<any>('/api/reports/sessions');
    const byStatus: Record<string, number> = raw.byStatus ?? {};
    return {
      totalSessions: raw.total ?? 0,
      activeSessions: byStatus['connected'] ?? 0,
      inactiveSessions: byStatus['disconnected'] ?? 0,
      errorSessions: byStatus['error'] ?? 0,
      disconnectedSessions: byStatus['disconnected'] ?? 0,
      avgStability: `${raw.healthAvg ?? 0}%`,
      avgReconnectionTime: '—',
      totalReconnections: raw.reconnections ?? 0,
      availabilityRate: raw.healthAvg ?? 0,
      uptime: '—',
      downtime: '—',
      logs: [],
    };
  },

  getGroupMetrics: async (): Promise<GroupMetrics> => {
    const raw = await apiClient.get<{ total: number; membersTotal: number; adminOf: number }>('/api/reports/groups');
    return {
      totalGroups: raw.total ?? 0,
      activeGroups: raw.total ?? 0,
      syncedToday: 0,
      failedSync: 0,
      avgMembers: raw.total > 0 ? Math.round((raw.membersTotal ?? 0) / raw.total) : 0,
      totalMembers: raw.membersTotal ?? 0,
      exportedRecently: 0,
      history: [],
    };
  },

  exportCSV: (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) => Object.values(obj).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
