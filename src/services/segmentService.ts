import { apiClient } from './apiClient';

export interface Segment {
  id: string;
  userId: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  isDynamic: boolean;
  contactCount: number;
  lastCountUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentData {
  name: string;
  description?: string;
  filters: Record<string, any>;
  isDynamic?: boolean;
}

export interface UpdateSegmentData extends Partial<CreateSegmentData> {}

export const segmentService = {
  list: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<{ items: Segment[]; total: number; page: number; pageSize: number }>(
      '/api/segments',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<Segment>(`/api/segments/${id}`),

  create: (data: CreateSegmentData) => apiClient.post<Segment>('/api/segments', data),

  update: (id: string, data: UpdateSegmentData) =>
    apiClient.patch<Segment>(`/api/segments/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/segments/${id}`),

  getContacts: (id: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<{ items: any[]; total: number; page: number; pageSize: number }>(
      `/api/segments/${id}/contacts`,
      { query: params },
    ),

  refresh: (id: string) => apiClient.post<Segment>(`/api/segments/${id}/refresh`),
};
