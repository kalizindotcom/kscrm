import { apiClient } from './apiClient';

export interface Deal {
  id: string;
  userId: string;
  contactId?: string;
  title: string;
  description?: string;
  value?: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  lostReason?: string;
  tags: string[];
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
  createdAt: string;
}

export interface DealDetail extends Deal {
  activities: DealActivity[];
  notes: any[];
  tasks: any[];
}

export interface CreateDealData {
  title: string;
  description?: string;
  value?: number;
  currency?: string;
  stage?: Deal['stage'];
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  assignedTo?: string;
  priority?: Deal['priority'];
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateDealData extends Partial<CreateDealData> {}

export interface PipelineStats {
  stats: Array<{
    stage: string;
    count: number;
    totalValue: number;
  }>;
}

export const dealService = {
  list: (params?: {
    stage?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<{ items: Deal[]; total: number; page: number; pageSize: number }>(
      '/api/deals',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<DealDetail>(`/api/deals/${id}`),

  create: (data: CreateDealData) => apiClient.post<Deal>('/api/deals', data),

  update: (id: string, data: UpdateDealData) => apiClient.patch<Deal>(`/api/deals/${id}`, data),

  moveStage: (id: string, stage: Deal['stage'], lostReason?: string) =>
    apiClient.post<Deal>(`/api/deals/${id}/move`, { stage, lostReason }),

  delete: (id: string) => apiClient.delete(`/api/deals/${id}`),

  getPipelineStats: () => apiClient.get<PipelineStats>('/api/deals/stats/pipeline'),
};
