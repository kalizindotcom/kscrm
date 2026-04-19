import { Session } from '../connectors/types';

export type MessageStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied';

export interface LiveMessage {
  id: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'document' | 'sticker' | 'buttons';
  fromMe: boolean;
  senderName?: string;
  senderPhone?: string;
  mediaUrl?: string;
  mediaMime?: string;
  replyTo?: { id: string; content: string; fromMe: boolean };
  error?: string;
}

export interface LiveConversation {
  id: string;
  contactName: string;
  phoneNumber: string;
  rawPhone?: string;
  isGroup?: boolean;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt?: string;
  unreadCount: number;
  status: 'active' | 'archived' | 'error';
  origin: 'campaign' | 'direct' | 'api';
  tags: string[];
  messages: LiveMessage[];
  hasMoreMessages?: boolean;
  metrics: {
    totalSent: number;
    totalReceived: number;
    avgResponseTime: string;
    lastResponseTime?: string;
    responseRate: string;
    failureCount: number;
  };
}
