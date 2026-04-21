import type { CampaignButton } from '@/types';
import { apiClient } from './apiClient';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TargetStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'failed' | 'skipped';

export interface CampaignPayload {
  name: string;
  channel?: 'whatsapp' | 'sms';
  sessionId?: string;
  templateId?: string;
  segmentId?: string;
  messageContent?: string;
  mediaCaption?: string;
  intervalSec?: number;
  jitterPct?: number;
  batchLimit?: number;
  windowStart?: string;
  windowEnd?: string;
  scheduledAt?: string;
  buttonsEnabled?: boolean;
  buttons?: CampaignButton[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'none';
  mediaMimetype?: string;
  mediaFilename?: string;
  linkUrl?: string;
}

export interface InlineTarget {
  phone: string;
  name?: string;
  variables?: Record<string, unknown>;
}

export interface TargetSource {
  replace?: boolean;
  inline?: InlineTarget[];
  importIds?: string[];
  tags?: string[];
  groupId?: string;
  groupAdminsOnly?: boolean;
}

export interface FireOptions {
  sessionId?: string;
  intervalSec?: number;
  scheduledAt?: string;
}

export interface CampaignTargetDto {
  id: string;
  campaignId: string;
  phone: string;
  name?: string | null;
  status: TargetStatus;
  error?: string | null;
  attempts: number;
  variables?: Record<string, unknown> | null;
  processedAt?: string | null;
  waMessageId?: string | null;
}

export interface CampaignDetail {
  id: string;
  name: string;
  status: CampaignStatus;
  sessionId?: string | null;
  channel: string;
  messageContent: string;
  mediaCaption?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaMimetype?: string | null;
  mediaFilename?: string | null;
  linkUrl?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  intervalSec: number;
  jitterPct: number;
  batchLimit?: number | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  buttonsEnabled: boolean;
  buttonsJson?: CampaignButton[] | null;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  responseCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  targetTotal?: number;
  targetsByStatus?: Record<string, number>;
  sampleTargets?: CampaignTargetDto[];
  isActiveWorker?: boolean;
}

export interface PaginatedTargets {
  items: CampaignTargetDto[];
  total: number;
  page: number;
  pageSize: number;
}

export const campaignService = {
  list: (params?: { search?: string; status?: CampaignStatus }) =>
    apiClient.get<CampaignDetail[]>('/api/campaigns', { query: params as any }),

  get: (id: string) => apiClient.get<CampaignDetail>(`/api/campaigns/${id}`),

  create: (payload: CampaignPayload) =>
    apiClient.post<CampaignDetail>('/api/campaigns', payload),

  update: (id: string, payload: Partial<CampaignPayload>) =>
    apiClient.put<CampaignDetail>(`/api/campaigns/${id}`, payload),

  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/campaigns/${id}`),

  duplicate: (id: string) => apiClient.post<CampaignDetail>(`/api/campaigns/${id}/duplicate`),

  // Targets
  getTargets: (
    id: string,
    params?: { page?: number; pageSize?: number; status?: TargetStatus },
  ) =>
    apiClient.get<PaginatedTargets>(`/api/campaigns/${id}/targets`, {
      query: params as any,
    }),

  setTargets: (id: string, source: TargetSource) =>
    apiClient.post<{ added: number; duplicates: number; total: number }>(
      `/api/campaigns/${id}/targets`,
      source,
    ),

  clearTargets: (id: string) =>
    apiClient.delete<{ deleted: number }>(`/api/campaigns/${id}/targets`),

  uploadCSV: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ parsed: number; added: number; duplicates: number; total: number }>(
      `/api/campaigns/${id}/targets/csv`,
      form,
    );
  },

  // Media
  uploadMedia: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{
      mediaUrl: string;
      mediaType: string;
      mediaMimetype: string;
      mediaFilename: string;
      size: number;
    }>(`/api/campaigns/${id}/media`, form);
  },

  removeMedia: (id: string) => apiClient.delete<CampaignDetail>(`/api/campaigns/${id}/media`),

  // Lifecycle
  fire: (id: string, payload: FireOptions = {}) =>
    apiClient.post<{ ok: boolean; status: string; total?: number; scheduledAt?: string }>(
      `/api/campaigns/${id}/fire`,
      payload,
    ),
  pause: (id: string) => apiClient.post<{ ok: boolean }>(`/api/campaigns/${id}/pause`),
  resume: (id: string) =>
    apiClient.post<{ ok: boolean; status: string }>(`/api/campaigns/${id}/resume`),
  cancel: (id: string) => apiClient.post<{ ok: boolean }>(`/api/campaigns/${id}/cancel`),
  retryFailed: (id: string, startNow = true) =>
    apiClient.post<{ reset: number; started: boolean }>(`/api/campaigns/${id}/retry-failed`, {
      startNow,
    }),
};
