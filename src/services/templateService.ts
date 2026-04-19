import type { MessageTemplate } from '../types';
import { apiClient } from './apiClient';

export const templateService = {
  list: (): Promise<MessageTemplate[]> =>
    apiClient.get<MessageTemplate[]>('/api/templates'),

  create: (data: { title: string; category?: string; channel?: 'whatsapp' | 'sms'; content: string; isFavorite?: boolean }): Promise<MessageTemplate> =>
    apiClient.post<MessageTemplate>('/api/templates', data),

  update: (id: string, data: Partial<{ title: string; category: string; content: string; isFavorite: boolean }>): Promise<MessageTemplate> =>
    apiClient.put<MessageTemplate>(`/api/templates/${id}`, data),

  delete: (id: string): Promise<{ ok: boolean }> =>
    apiClient.delete<{ ok: boolean }>(`/api/templates/${id}`),
};
