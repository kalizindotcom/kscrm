export type User = {
  id: string;
  email?: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
};

export type ContactStatus = 'active' | 'inactive' | 'pending';
export type ContactOptIn = 'granted' | 'revoked' | 'unknown';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  origin: string;
  status: ContactStatus;
  optIn: ContactOptIn;
  tags: string[];
  lastInteraction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  filters: any; // Simplified for mock
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'failed';
export type CampaignChannel = 'whatsapp' | 'sms';

export interface CampaignButton {
  text: string;
  type: 'url' | 'call' | 'reply';
  value: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  templateId: string;
  segmentId: string;
  messageContent?: string;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  responseCount: number;
  batchLimit?: number;
  windowStart?: string;
  windowEnd?: string;
  buttons?: CampaignButton[];
  buttonsEnabled?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  channel: CampaignChannel;
  content: string;
  isFavorite: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  phone?: string;
  campaignName?: string;
  lastMessage: string;
  unreadCount: number;
  status: 'open' | 'pending' | 'resolved';
  isGroup?: boolean;
  avatar?: string;
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'buttons' | 'list';
  mediaUrl?: string;
  mediaMime?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'sending' | 'pending';
  senderName?: string;
  senderPhone?: string;
  error?: string;
}

export interface Integration {
  id: string;
  provider: string;
  type: CampaignChannel | 'webhook' | 'api';
  status: 'connected' | 'disconnected' | 'error' | 'paused';
  lastSync?: string;
  sessionDetails?: {
    lastDisconnect?: string;
    reason?: string;
    phoneNumber?: string;
    batteryLevel?: number;
    signalStrength?: number;
  };
  config?: Record<string, any>;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'inactive';
  steps: any[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  status: 'success' | 'failure';
  timestamp: string;
  details?: string;
}

export interface ContactImport {
  id: string;
  name: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  contactCount: number;
  processedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  memberCount: number;
  messageCount: number;
  description?: string;
  inviteLink?: string;
  photo?: string;
  admins: string[];
  members: string[];
  status: 'active' | 'inactive';
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}
