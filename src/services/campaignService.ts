import type { Campaign, CampaignButton } from '@/types';
import { apiClient } from './apiClient';

interface CampaignPayload {
  name: string;
  channel?: 'whatsapp' | 'sms';
  sessionId?: string;
  templateId?: string;
  segmentId?: string;
  messageContent?: string;
  intervalSec?: number;
  buttonsEnabled?: boolean;
  buttons?: CampaignButton[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'none';
}

interface FireTarget {
  phone: string;
  name?: string;
}

export const campaignService = {
  list: () => apiClient.get<any[]>('/api/campaigns'),
  get: (id: string) => apiClient.get<any>(`/api/campaigns/${id}`),
  create: (payload: CampaignPayload) => apiClient.post<any>('/api/campaigns', payload),
  update: (id: string, payload: Partial<CampaignPayload>) => apiClient.put<any>(`/api/campaigns/${id}`, payload),
  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/campaigns/${id}`),
  fire: (id: string, payload: { sessionId: string; targets: FireTarget[]; intervalSec?: number }) =>
    apiClient.post(`/api/campaigns/${id}/fire`, payload),
  cancel: (id: string) => apiClient.post(`/api/campaigns/${id}/cancel`),
};
