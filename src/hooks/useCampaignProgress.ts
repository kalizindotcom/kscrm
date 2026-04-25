import { useEffect, useState, useRef } from 'react';
import { getSocket, subscribe, unsubscribe } from '@/services/wsClient';

export interface CampaignProgressEvent {
  type: 'campaign.progress';
  campaignId: string;
  progress: number;
  currentTarget?: string;
  sent: number;
  failed: number;
  total?: number;
  waiting?: string;
  error?: string;
}

export interface CampaignCompletedEvent {
  type: 'campaign.completed';
  campaignId: string;
  status: 'completed' | 'cancelled' | 'paused' | 'failed';
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  startedAt: string | null;
  finishedAt: string | null;
}

/**
 * Subscribes to real-time campaign progress events.
 * Returns the latest progress snapshot and completion event (undefined until first event).
 */
export function useCampaignProgress(
  campaignId: string | null | undefined,
  onCompleted?: (evt: CampaignCompletedEvent) => void,
) {
  const [progress, setProgress] = useState<CampaignProgressEvent | null>(null);
  const [completed, setCompleted] = useState<CampaignCompletedEvent | null>(null);
  const subscriptionCountRef = useRef(0); // Track subscription count to prevent duplicates

  useEffect(() => {
    if (!campaignId) {
      setProgress(null);
      setCompleted(null);
      return;
    }
    const socket = getSocket();
    const room = `campaign:${campaignId}`;

    // Only subscribe if socket is connected
    const subscribeRoom = () => {
      if (socket.connected) {
        subscribe(room);
        subscriptionCountRef.current++;
      }
    };

    subscribeRoom();
    setProgress(null);
    setCompleted(null);

    const onProgress = (evt: CampaignProgressEvent) => {
      if (evt.campaignId !== campaignId) return;
      setProgress(evt);
    };
    const onDone = (evt: CampaignCompletedEvent) => {
      if (evt.campaignId !== campaignId) return;
      setCompleted(evt);
      onCompleted?.(evt);
    };

    // Reconnect handler - only subscribe once per reconnection
    const onReconnect = () => {
      if (subscriptionCountRef.current === 0) {
        subscribeRoom();
      }
    };

    socket.on('campaign.progress', onProgress);
    socket.on('campaign.completed', onDone);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('campaign.progress', onProgress);
      socket.off('campaign.completed', onDone);
      socket.off('connect', onReconnect);
      unsubscribe(room);
      subscriptionCountRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return { progress, completed };
}
