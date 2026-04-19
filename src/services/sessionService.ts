import type { ConnectorMetrics, Session, SessionLog } from '@/components/connectors/types';
import { apiClient } from './apiClient';

interface CreateSessionPayload {
  name: string;
  nickname?: string;
  environment?: 'production' | 'test' | 'sandbox';
  tags?: string[];
  description?: string;
  responsible?: string;
}

export const sessionService = {
  list: () => apiClient.get<Session[]>('/api/sessions'),
  get: (id: string) => apiClient.get<Session>(`/api/sessions/${id}`),
  metrics: () => apiClient.get<ConnectorMetrics>('/api/sessions/metrics'),
  create: (payload: CreateSessionPayload) => apiClient.post<Session>('/api/sessions', payload),
  update: (id: string, payload: Partial<CreateSessionPayload> & { notes?: string; favorite?: boolean; name?: string }) =>
    apiClient.patch<Session>(`/api/sessions/${id}`, payload),
  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/sessions/${id}`),
  connect: (id: string) => apiClient.post<{ ok: boolean }>(`/api/sessions/${id}/connect`),
  pause: (id: string) => apiClient.post<{ ok: boolean }>(`/api/sessions/${id}/pause`),
  resume: (id: string) => apiClient.post<{ ok: boolean }>(`/api/sessions/${id}/resume`),
  terminate: (id: string) => apiClient.post<{ ok: boolean }>(`/api/sessions/${id}/terminate`),
  getQr: (id: string) =>
    apiClient.get<{ sessionId: string; status: string; dataUrl: string | null }>(`/api/sessions/${id}/qr`),
  pairingCode: (id: string, phone: string) =>
    apiClient.post<{ code: string }>(`/api/sessions/${id}/pairing-code`, { phone }),
  syncContacts: (id: string) => apiClient.post<Session>(`/api/sessions/${id}/sync-contacts`),
  logs: (id: string, limit = 50) => apiClient.get<SessionLog[]>(`/api/sessions/${id}/logs`, { query: { limit } }),
};
