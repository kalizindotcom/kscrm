// Types for Admin Module

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'lifetime';
  maxUsers: number;
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
  maxGroupsPerSession: number;
  features: Record<string, unknown>;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  planId: string;
  plan: Plan;
  planStartedAt: string;
  planExpiresAt?: string;
  billingEmail: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trialEndsAt?: string;
  maxUsers: number;
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
  currentUsers: number;
  currentSessions: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail extends Organization {
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    lastLoginAt?: string;
    createdAt: string;
  }>;
  subscriptions: Subscription[];
  usageLogs: UsageLog[];
  sessions: Array<{
    id: string;
    name: string;
    status: string;
    phoneNumber?: string;
    user: {
      name: string;
      email: string;
    };
    groups: Array<{
      id: string;
      name: string;
      memberCount: number;
    }>;
  }>;
  _count: {
    users: number;
    subscriptions: number;
  };
}

export interface Subscription {
  id: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  planId: string;
  plan: Plan;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startedAt: string;
  expiresAt?: string;
  cancelledAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  amount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user' | 'viewer';
  avatar?: string;
  status: 'active' | 'suspended' | 'invited';
  lastLoginAt?: string;
  lastLoginIp?: string;
  permissions?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sessions: number;
    campaigns: number;
    contacts: number;
  };
}

export interface AdminUserDetail extends AdminUser {
  sessions: Array<{
    id: string;
    name: string;
    status: string;
    phoneNumber?: string;
    createdAt: string;
    lastConnectedAt?: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    sentCount: number;
    totalCount: number;
    createdAt: string;
  }>;
  activityLogs: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  organization?: {
    name: string;
    slug: string;
  };
  userId?: string;
  user?: {
    name: string;
    email: string;
  };
  action: string;
  module: string;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface UsageLog {
  id: string;
  organizationId: string;
  date: string;
  messagesSent: number;
  campaignsFired: number;
  sessionsActive: number;
  apiCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalStats {
  totalOrgs: number;
  activeOrgs: number;
  trialOrgs: number;
  suspendedOrgs: number;
  totalUsers: number;
  totalSessions: number;
  activeSessions: number;
  totalCampaigns: number;
  runningCampaigns: number;
  mrr: number;
  newOrgsLast30Days: number;
}

export interface UsageStats {
  date: string;
  messagesSent: number;
  campaignsFired: number;
  sessionsActive: number;
  apiCalls: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Form types
export interface OrganizationFormData {
  name: string;
  slug: string;
  planId: string;
  billingEmail: string;
  status?: 'active' | 'trial' | 'suspended' | 'cancelled';
  trialEndsAt?: string;
  domain?: string;
  logo?: string;
}

export interface UserFormData {
  organizationId: string;
  email: string;
  password?: string;
  name: string;
  role?: 'super_admin' | 'admin' | 'user' | 'viewer';
  status?: 'active' | 'suspended' | 'invited';
}

export interface PlanFormData {
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: 'monthly' | 'yearly' | 'lifetime';
  maxUsers: number;
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
  maxGroupsPerSession?: number;
  features?: Record<string, unknown>;
  isActive?: boolean;
  isPublic?: boolean;
}
