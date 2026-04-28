import { apiClient } from './apiClient';

export interface Story {
  id: string;
  sessionId: string;
  contactJid: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  timestamp: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  text?: string;
  backgroundColor?: string;
  isViewed: boolean;
  viewedAt?: string;
}

export interface StoryContact {
  jid: string;
  name: string;
  phone: string;
  avatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export const storiesService = {
  /**
   * Lista todos os stories de uma sessão
   */
  async list(sessionId: string): Promise<StoryContact[]> {
    const response = await apiClient.get<StoryContact[]>(`/api/stories/${sessionId}`);
    return response;
  },

  /**
   * Marca um story como visualizado
   */
  async markViewed(sessionId: string, storyId: string): Promise<void> {
    await apiClient.post(`/api/stories/${sessionId}/${storyId}/view`);
  },

  /**
   * Envia uma resposta a um story
   */
  async reply(sessionId: string, storyId: string, contactJid: string, message: string): Promise<void> {
    await apiClient.post(`/api/stories/${sessionId}/${storyId}/reply`, {
      message,
      contactJid,
    });
  },

  /**
   * Retorna a URL da mídia de um story
   */
  getMediaUrl(sessionId: string, storyId: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}/api/stories/${sessionId}/${storyId}/media`;
  },
};
