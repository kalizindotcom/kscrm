import type { Contact, ContactImport } from '../types';
import { apiClient } from './apiClient';

interface PaginatedContacts {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

export const contactService = {
  list: async (params?: {
    search?: string;
    status?: 'active' | 'inactive' | 'pending';
    page?: number;
    pageSize?: number;
  }): Promise<Contact[]> => {
    const payload = await apiClient.get<PaginatedContacts>('/api/contacts', { query: params });
    return payload.items;
  },

  get: async (id: string): Promise<Contact | undefined> => {
    const items = await contactService.list({ pageSize: 200 });
    return items.find((contact) => contact.id === id);
  },

  create: async (data: Partial<Contact>): Promise<Contact> => {
    return apiClient.post<Contact>('/api/contacts', {
      name: data.name ?? '',
      phone: data.phone ?? '',
      origin: data.origin ?? 'manual',
      status: data.status ?? 'active',
      optIn: data.optIn ?? 'unknown',
      tags: data.tags ?? [],
    });
  },

  update: async (id: string, data: Partial<Contact>): Promise<Contact> => {
    return apiClient.put<Contact>(`/api/contacts/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/contacts/${id}`);
  },

  importList: async (file: File, name: string): Promise<ContactImport> => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    return apiClient.post<ContactImport>('/api/contacts/import', form);
  },

  listImports: async (): Promise<ContactImport[]> => {
    return apiClient.get<ContactImport[]>('/api/contacts/imports');
  },
};
