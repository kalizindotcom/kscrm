import type { Contact, ContactImport } from '../types';
import { apiClient } from './apiClient';

interface PaginatedContacts {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

interface ContactImportDetails extends ContactImport {
  contacts: Contact[];
}

export const contactService = {
  list: async (params?: {
    search?: string;
    status?: 'active' | 'inactive' | 'pending';
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedContacts> => {
    return apiClient.get<PaginatedContacts>('/api/contacts', { query: params });
  },

  get: async (id: string): Promise<Contact | undefined> => {
    const result = await contactService.list({ pageSize: 200 });
    return result.items.find((contact) => contact.id === id);
  },

  getById: async (id: string): Promise<Contact> => {
    return apiClient.get<Contact>(`/api/contacts/${id}`);
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

  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post('/api/contacts/bulk-delete', { ids });
  },

  deleteAll: async (search?: string): Promise<number> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const result = await apiClient.delete<{ ok: boolean; deleted: number }>(`/api/contacts${query}`);
    return result.deleted;
  },

  exportContacts: (format: 'csv' | 'json', importIds?: string[]): void => {
    const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
    const token = localStorage.getItem('ks_token');
    const params = new URLSearchParams({ format });
    if (importIds && importIds.length > 0) params.set('importIds', importIds.join(','));
    fetch(`${API_URL}/api/contacts/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },

  importList: async (file: File, name: string, tags?: string): Promise<ContactImport> => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    if (tags) form.append('tags', tags);
    return apiClient.post<ContactImport>('/api/contacts/import', form);
  },

  listImports: async (): Promise<ContactImport[]> => {
    return apiClient.get<ContactImport[]>('/api/contacts/imports');
  },

  getImportDetails: async (importId: string): Promise<ContactImportDetails> => {
    return apiClient.get<ContactImportDetails>(`/api/contacts/imports/${importId}`);
  },

  listImportContacts: async (importId: string): Promise<Contact[]> => {
    const details = await contactService.getImportDetails(importId);
    return details.contacts ?? [];
  },
};
