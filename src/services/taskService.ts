import { apiClient } from './apiClient';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'task' | 'call' | 'email' | 'meeting' | 'follow_up';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contactId?: string;
  dealId?: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  reminderAt?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deal?: {
    id: string;
    title: string;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  type?: Task['type'];
  status?: Task['status'];
  priority?: Task['priority'];
  contactId?: string;
  dealId?: string;
  assignedTo?: string;
  dueDate?: string;
  reminderAt?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  tags?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export const taskService = {
  list: (params?: {
    status?: string;
    assignedTo?: string;
    type?: string;
    dealId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<{ items: Task[]; total: number; page: number; pageSize: number }>(
      '/api/tasks',
      { query: params },
    ),

  getById: (id: string) => apiClient.get<Task>(`/api/tasks/${id}`),

  create: (data: CreateTaskData) => apiClient.post<Task>('/api/tasks', data),

  update: (id: string, data: UpdateTaskData) => apiClient.patch<Task>(`/api/tasks/${id}`, data),

  complete: (id: string) => apiClient.post<Task>(`/api/tasks/${id}/complete`),

  delete: (id: string) => apiClient.delete(`/api/tasks/${id}`),

  getCalendarRange: (start: string, end: string) =>
    apiClient.get<{ tasks: Task[] }>('/api/tasks/calendar/range', {
      query: { start, end },
    }),

  getOverdue: () => apiClient.get<{ tasks: Task[]; count: number }>('/api/tasks/overdue'),
};
