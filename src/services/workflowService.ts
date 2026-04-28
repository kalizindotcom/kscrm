import { apiClient } from './apiClient';

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  trigger: {
    type: string;
    conditions?: Record<string, any>;
  };
  actions: Array<{
    type: string;
    delay?: number;
    config: Record<string, any>;
  }>;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId?: string;
  dealId?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  log?: Record<string, any>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowDetail extends Workflow {
  executions: WorkflowExecution[];
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  status?: Workflow['status'];
  trigger: Workflow['trigger'];
  actions: Workflow['actions'];
}

export interface UpdateWorkflowData extends Partial<CreateWorkflowData> {}

export interface WorkflowStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  successRate: number;
}

export const workflowService = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get<{ items: Workflow[]; total: number; page: number; pageSize: number }>(
      '/api/workflows',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<WorkflowDetail>(`/api/workflows/${id}`),

  create: (data: CreateWorkflowData) => apiClient.post<Workflow>('/api/workflows', data),

  update: (id: string, data: UpdateWorkflowData) =>
    apiClient.patch<Workflow>(`/api/workflows/${id}`, data),

  toggle: (id: string) => apiClient.post<Workflow>(`/api/workflows/${id}/toggle`),

  delete: (id: string) => apiClient.delete(`/api/workflows/${id}`),

  test: (id: string, data?: { contactId?: string; dealId?: string }) =>
    apiClient.post<{ execution: WorkflowExecution; message: string }>(
      `/api/workflows/${id}/test`,
      data,
    ),

  getExecutions: (id: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<{
      items: WorkflowExecution[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/workflows/${id}/executions`, { query: params }),

  getStats: (id: string) => apiClient.get<WorkflowStats>(`/api/workflows/${id}/stats`),
};
