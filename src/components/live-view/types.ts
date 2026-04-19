import { Session } from '../connectors/types';

export type MessageStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied';

export interface LiveMessage {
  id: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  fromMe: boolean;
  senderName?: string;
  senderPhone?: string;
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
  unreadCount: number;
  status: 'active' | 'archived' | 'error';
  origin: 'campaign' | 'direct' | 'api';
  tags: string[];
  messages: LiveMessage[];
  metrics: {
    totalSent: number;
    totalReceived: number;
    avgResponseTime: string;
    lastResponseTime?: string;
    responseRate: string;
    failureCount: number;
  };
}
