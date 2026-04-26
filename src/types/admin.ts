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


export interface Subscription {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
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
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user' | 'viewer';
  avatar?: string;
  status: 'active' | 'suspended' | 'invited';
  subscription?: {
    id: string;
    plan: {
      id: string;
      name: string;
      slug: string;
    };
    status: string;
    expiresAt?: string;
  };
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
  userId: string;
  date: string;
  messagesSent: number;
  campaignsFired: number;
  sessionsActive: number;
  apiCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSessions: number;
  activeSessions: number;
  totalCampaigns: number;
  runningCampaigns: number;
  mrr: number;
  newUsersLast30Days: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
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
export interface UserFormData {
  email: string;
  password?: string;
  name: string;
  role?: 'super_admin' | 'admin' | 'user' | 'viewer';
  status?: 'active' | 'suspended' | 'invited';
  planId?: string;
  subscriptionExpiresAt?: string;
}

export interface TrialUserFormData {
  name: string;
  email: string;
  phone?: string;
  duration: number; // em horas
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
}

export interface TrialPreset {
  id: string;
  name: string;
  duration: number; // em horas
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
  description: string;
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
