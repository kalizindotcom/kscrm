import type { WhatsAppGroup } from '../types';
import { apiClient } from './apiClient';

export const groupsService = {
  listBySession: (sessionId: string): Promise<WhatsAppGroup[]> =>
    apiClient.get<WhatsAppGroup[]>(`/api/sessions/${sessionId}/groups`),

  sync: (sessionId: string): Promise<WhatsAppGroup[]> =>
    apiClient.post<WhatsAppGroup[]>(`/api/sessions/${sessionId}/groups/sync`),

  syncMembers: (groupId: string): Promise<WhatsAppGroup> =>
    apiClient.post<WhatsAppGroup>(`/api/groups/${groupId}/sync-members`),

  exportUrl: (groupId: string, format: 'csv' | 'xlsx' = 'csv') =>
    `/api/groups/${groupId}/export?format=${format}`,

  saveToContacts: (groupId: string): Promise<any> =>
    apiClient.post(`/api/groups/${groupId}/save-to-contacts`),
};
