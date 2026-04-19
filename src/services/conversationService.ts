import type { Conversation, Message } from '../types';
import { apiClient } from './apiClient';

export const conversationService = {
  list: (params?: { sessionId?: string; status?: string; search?: string }): Promise<Conversation[]> =>
    apiClient.get<Conversation[]>('/api/conversations', { query: params }),

  get: (id: string): Promise<Conversation> =>
    apiClient.get<Conversation>(`/api/conversations/${id}`),

  getMessages: (id: string, params?: { before?: string; limit?: number }): Promise<Message[]> =>
    apiClient.get<Message[]>(`/api/conversations/${id}/messages`, { query: params }),

  update: (id: string, data: { status?: 'open' | 'pending' | 'resolved'; unreadCount?: number }): Promise<Conversation> =>
    apiClient.patch<Conversation>(`/api/conversations/${id}`, data),

  delete: (id: string): Promise<{ ok: boolean }> =>
    apiClient.delete<{ ok: boolean }>(`/api/conversations/${id}`),
};
