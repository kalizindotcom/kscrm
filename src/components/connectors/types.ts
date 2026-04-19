export type SessionStatus = 
  | 'disconnected' 
  | 'pairing' 
  | 'connected' 
  | 'paused' 
  | 'syncing' 
  | 'warning' 
  | 'error' 
  | 'terminated' 
  | 'archived';

export type LogSeverity = 'info' | 'warning' | 'error' | 'success';

export type ChannelType = 'whatsapp' | 'email' | 'sms' | 'webhook' | 'api_propria';
export type EnvironmentType = 'production' | 'test' | 'sandbox';

export interface SessionLog {
  id: string;
  sessionId: string;
  timestamp: string;
  type: string;
  severity: LogSeverity;
  message: string;
  origin: 'front-end' | 'system' | 'engine';
  user?: string;
}

export interface Session {
  id: string;
  name: string;
  nickname?: string;
  channel: ChannelType;
  phoneNumber?: string;
  status: SessionStatus;
  environment: EnvironmentType;
  responsible?: string;
  description?: string;
  tags: string[];
  notes?: string;
  favorite: boolean;
  qrCodeDataUrl?: string;
  healthScore: number;
  reconnectCount: number;
  failureCount: number;
  syncCount: number;
  lastActivity?: string;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  disconnectReason?: string;
  createdAt: string;
  updatedAt: string;
  recentLogs: SessionLog[];
}

export interface ConnectorMetrics {
  total: number;
  connected: number;
  disconnected: number;
  paused: number;
  error: number;
  pairing: number;
  archived: number;
  reconnectionsInPeriod: number;
}
