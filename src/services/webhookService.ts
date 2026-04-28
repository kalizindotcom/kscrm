import { apiClient } from './apiClient';

export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  status: 'active' | 'inactive' | 'failed';
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  response?: Record<string, any>;
  statusCode?: number;
  error?: string;
  createdAt: string;
}

export interface WebhookDetail extends Webhook {
  logs: WebhookLog[];
}

export interface CreateWebhookData {
  name: string;
  url: string;
  method?: 'POST' | 'GET' | 'PUT';
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  status?: 'active' | 'inactive';
}

export interface UpdateWebhookData extends Partial<CreateWebhookData> {}

export interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

export const webhookService = {
  list: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<{ items: Webhook[]; total: number; page: number; pageSize: number }>(
      '/api/webhooks',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<WebhookDetail>(`/api/webhooks/${id}`),

  create: (data: CreateWebhookData) => apiClient.post<Webhook>('/api/webhooks', data),

  update: (id: string, data: UpdateWebhookData) =>
    apiClient.patch<Webhook>(`/api/webhooks/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/webhooks/${id}`),

  test: (id: string) =>
    apiClient.post<{ success: boolean; statusCode?: number; message: string; error?: string }>(
      `/api/webhooks/${id}/test`,
    ),

  getLogs: (id: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<{ items: WebhookLog[]; total: number; page: number; pageSize: number }>(
      `/api/webhooks/${id}/logs`,
      { query: params },
    ),

  getStats: (id: string) => apiClient.get<WebhookStats>(`/api/webhooks/${id}/stats`),
};
