import { apiClient } from './apiClient';

export interface Note {
  id: string;
  userId: string;
  content: string;
  contactId?: string;
  dealId?: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  content: string;
  contactId?: string;
  dealId?: string;
  isInternal?: boolean;
}

export interface UpdateNoteData {
  content: string;
  isInternal?: boolean;
}

export const noteService = {
  list: (params?: { contactId?: string; dealId?: string; page?: number; pageSize?: number }) =>
    apiClient.get<{ items: Note[]; total: number; page: number; pageSize: number }>(
      '/api/notes',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<Note>(`/api/notes/${id}`),

  create: (data: CreateNoteData) => apiClient.post<Note>('/api/notes', data),

  update: (id: string, data: UpdateNoteData) => apiClient.patch<Note>(`/api/notes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/notes/${id}`),
};
