import { apiClient } from './apiClient';

export type WarmupStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface WarmupPlan {
  id: string;
  userId: string;
  name: string;
  status: WarmupStatus;
  sessionIds: string[];
  durationDays: number;
  startMsgsPerDay: number;
  maxMsgsPerDay: number;
  windowStart?: string | null;
  windowEnd?: string | null;
  intervalMin: number;
  intervalMax: number;
  currentDay: number;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

export interface WarmupPlanPayload {
  name: string;
  sessionIds: string[];
  durationDays?: number;
  startMsgsPerDay?: number;
  maxMsgsPerDay?: number;
  windowStart?: string;
  windowEnd?: string;
  intervalMin?: number;
  intervalMax?: number;
}

export interface WarmupLog {
  id: string;
  planId: string;
  fromSession: string;
  toSession: string;
  message: string;
  status: 'sent' | 'failed';
  sentAt: string;
}

export interface WarmupStats {
  total: number;
  todayCount: number;
  failed: number;
  progress: number;
  currentDay: number;
  durationDays: number;
}

export interface WarmupLogsResponse {
  items: WarmupLog[];
  total: number;
  page: number;
  pageSize: number;
  dailyStats: { day: string; sent: number; failed: number }[];
}

const BASE = '/api/warmup';

export const warmupService = {
  list: (): Promise<WarmupPlan[]> => apiClient.get(BASE),

  create: (payload: WarmupPlanPayload): Promise<WarmupPlan> =>
    apiClient.post(BASE, payload),

  get: (id: string): Promise<WarmupPlan> => apiClient.get(`${BASE}/${id}`),

  update: (id: string, payload: Partial<WarmupPlanPayload>): Promise<WarmupPlan> =>
    apiClient.put(`${BASE}/${id}`, payload),

  delete: (id: string): Promise<{ ok: boolean }> => apiClient.delete(`${BASE}/${id}`),

  start: (id: string): Promise<{ ok: boolean; status: string }> =>
    apiClient.post(`${BASE}/${id}/start`, {}),

  pause: (id: string): Promise<{ ok: boolean; status: string }> =>
    apiClient.post(`${BASE}/${id}/pause`, {}),

  stop: (id: string): Promise<{ ok: boolean; status: string }> =>
    apiClient.post(`${BASE}/${id}/stop`, {}),

  logs: (id: string, page = 1, pageSize = 50): Promise<WarmupLogsResponse> =>
    apiClient.get(`${BASE}/${id}/logs?page=${page}&pageSize=${pageSize}`),

  stats: (id: string): Promise<WarmupStats> => apiClient.get(`${BASE}/${id}/stats`),
};
