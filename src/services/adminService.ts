import { apiClient } from './apiClient';
import type {
  Organization,
  OrganizationDetail,
  OrganizationFormData,
  Plan,
  PlanFormData,
  AdminUser,
  AdminUserDetail,
  UserFormData,
  Subscription,
  ActivityLog,
  UsageLog,
  GlobalStats,
  UsageStats,
  PaginatedResponse,
} from '../types/admin';

export const adminService = {
  // ─── Organizations ───
  listOrganizations: (params?: {
    search?: string;
    status?: string;
    planId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<Organization>>('/api/admin/organizations', {
      query: params as any,
    }),

  getOrganization: (id: string) =>
    apiClient.get<OrganizationDetail>(`/api/admin/organizations/${id}`),

  createOrganization: (data: OrganizationFormData) =>
    apiClient.post<Organization>('/api/admin/organizations', data),

  updateOrganization: (id: string, data: Partial<OrganizationFormData>) =>
    apiClient.put<Organization>(`/api/admin/organizations/${id}`, data),

  deleteOrganization: (id: string) =>
    apiClient.delete<{ ok: boolean }>(`/api/admin/organizations/${id}`),

  suspendOrganization: (id: string) =>
    apiClient.post<Organization>(`/api/admin/organizations/${id}/suspend`),

  activateOrganization: (id: string) =>
    apiClient.post<Organization>(`/api/admin/organizations/${id}/activate`),

  // ─── Users ───
  listUsers: (params?: {
    search?: string;
    organizationId?: string;
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

  getUserActivity: (id: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<ActivityLog>>(`/api/admin/users/${id}/activity`, {
      query: params as any,
    }),

  // ─── Plans ───
  listPlans: () => apiClient.get<Plan[]>('/api/admin/plans'),

  createPlan: (data: PlanFormData) => apiClient.post<Plan>('/api/admin/plans', data),

  updatePlan: (id: string, data: Partial<PlanFormData>) =>
    apiClient.put<Plan>(`/api/admin/plans/${id}`, data),

  deletePlan: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/admin/plans/${id}`),

  // ─── Subscriptions ───
  listSubscriptions: (params?: {
    organizationId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<Subscription>>('/api/admin/subscriptions', {
      query: params as any,
    }),

  createSubscription: (data: {
    organizationId: string;
    planId: string;
    status: string;
    startedAt: string;
    expiresAt?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    amount?: number;
  }) => apiClient.post<Subscription>('/api/admin/subscriptions', data),

  // ─── Analytics ───
  getStats: () => apiClient.get<GlobalStats>('/api/admin/stats'),

  getUsage: (params?: { days?: number }) =>
    apiClient.get<UsageStats[]>('/api/admin/usage', { query: params as any }),

  getActivity: (params?: {
    organizationId?: string;
    userId?: string;
    action?: string;
    module?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<PaginatedResponse<ActivityLog>>('/api/admin/activity', {
      query: params as any,
    }),

  // ─── Sessions (Admin View) ───
  getAllSessions: (params?: {
    organizationId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<
      PaginatedResponse<{
        id: string;
        name: string;
        status: string;
        phoneNumber?: string;
        user: {
          id: string;
          name: string;
          email: string;
          organization: {
            id: string;
            name: string;
            slug: string;
          };
        };
        groups: Array<{
          id: string;
          name: string;
          memberCount: number;
          isAdmin: boolean;
        }>;
        _count: {
          conversations: number;
          logs: number;
        };
        createdAt: string;
      }>
    >('/api/admin/sessions', { query: params as any }),
};
