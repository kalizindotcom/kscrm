import { apiClient } from './apiClient';
import type {
  Plan,
  PlanFormData,
  AdminUser,
  AdminUserDetail,
  UserFormData,
  Subscription,
  ActivityLog,
  GlobalStats,
  UsageStats,
  PaginatedResponse,
} from '../types/admin';

export const adminService = {
  // ─── Users ───
  listUsers: (params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<AdminUser>>('/api/admin/users', {
      query: params as any,
    }),

  getUser: (id: string) => apiClient.get<AdminUserDetail>(`/api/admin/users/${id}`),

  createUser: (data: UserFormData) => apiClient.post<AdminUser>('/api/admin/users', data),

  updateUser: (id: string, data: Partial<UserFormData>) =>
    apiClient.put<AdminUser>(`/api/admin/users/${id}`, data),

  deleteUser: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/admin/users/${id}`),

  suspendUser: (id: string) => apiClient.post<AdminUser>(`/api/admin/users/${id}/suspend`),

  // ─── Plans ───
  listPlans: () => apiClient.get<Plan[]>('/api/admin/plans'),

  getPlan: (id: string) => apiClient.get<Plan>(`/api/admin/plans/${id}`),

  createPlan: (data: PlanFormData) => apiClient.post<Plan>('/api/admin/plans', data),

  updatePlan: (id: string, data: Partial<PlanFormData>) =>
    apiClient.put<Plan>(`/api/admin/plans/${id}`, data),

  deletePlan: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/admin/plans/${id}`),

  // ─── Subscriptions ───
  listSubscriptions: (params?: {
    userId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<Subscription>>('/api/admin/subscriptions', {
      query: params as any,
    }),

  createSubscription: (data: {
    userId: string;
    planId: string;
    status: string;
    startedAt: string;
    expiresAt?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    amount?: number;
  }) => apiClient.post<Subscription>('/api/admin/subscriptions', data),

  updateSubscription: (
    id: string,
    data: Partial<{
      planId: string;
      status: string;
      expiresAt: string;
      cancelledAt: string;
      paymentMethod: string;
      paymentStatus: string;
      amount: number;
    }>
  ) => apiClient.put<Subscription>(`/api/admin/subscriptions/${id}`, data),

  // ─── Analytics ───
  getStats: () => apiClient.get<GlobalStats>('/api/admin/stats'),

  getUsage: (params?: { days?: number }) =>
    apiClient.get<UsageStats[]>('/api/admin/usage', { query: params as any }),

  getActivityLogs: (params?: {
    userId?: string;
    action?: string;
    module?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<ActivityLog>>('/api/admin/activity', {
      query: params as any,
    }),

  // ─── Sessions ───
  getSessions: (params?: {
    userId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<any>>('/api/admin/sessions', {
      query: params as any,
    }),
};
