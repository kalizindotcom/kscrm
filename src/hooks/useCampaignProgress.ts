import { useEffect, useState } from 'react';
import { getSocket, subscribe, unsubscribe } from '@/services/wsClient';

export interface CampaignProgressEvent {
  type: 'campaign.progress';
  campaignId: string;
  progress: number;
  currentTarget?: string;
  sent: number;
  failed: number;
}

/**
 * Subscribes to real-time campaign progress events.
 * Returns the latest progress snapshot (undefined until the first event).
 */
export function useCampaignProgress(campaignId: string | null | undefined) {
  const [progress, setProgress] = useState<CampaignProgressEvent | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    const socket = getSocket();
    const room = `campaign:${campaignId}`;
    subscribe(room);

    const handler = (evt: CampaignProgressEvent) => {
      if (evt.campaignId !== campaignId) return;
      setProgress(evt);
    };

    socket.on('campaign.progress', handler);

    return () => {
      socket.off('campaign.progress', handler);
      unsubscribe(room);
    };
  }, [campaignId]);

  return progress;
}
