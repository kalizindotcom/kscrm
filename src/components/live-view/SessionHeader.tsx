import React, { useState } from 'react';
import { Session } from '../connectors/types';
import { motion } from 'framer-motion';
import {
  Activity,
  RefreshCcw,
  Zap,
  Server,
  Clock,
  MessageSquare,
  ExternalLink,
  Copy,
  Bug
} from 'lucide-react';
import { Badge } from '@/components/ui/shared';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SessionHeaderProps {
  session: Session;
  totalConversations?: number;
  lastUpdated?: Date | null;
  onShowLogs?: () => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  totalConversations,
  lastUpdated,
  onShowLogs,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleReconnect = async () => {
    setIsRefreshing(true);
    try {
      await apiClient.post(`/api/sessions/${session.id}/connect`);
      toast.success('Reconexão iniciada com sucesso!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao reconectar gateway');
    } finally {
      setIsRefreshing(false);
    }
  };

  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })
    : 'agora';

  return (
    <div className="bg-card/40 backdrop-blur-xl border border-primary/20 rounded-xl p-3 shadow-lg relative overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-background border border-primary/20 rounded-full flex items-center justify-center">
              <div className={cn(
                "w-2 h-2 rounded-full",
                session.status === 'connected' ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" : "bg-slate-500"
              )} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-white tracking-tight truncate">{session.name}</h2>
              <Badge variant={session.status === 'connected' ? 'success' : 'default'} className={cn(
                "px-1.5 py-0 rounded text-[9px] uppercase font-bold tracking-wider shrink-0",
                session.status === 'connected'
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {session.status === 'connected' ? 'ONLINE' : 'OFF'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1 truncate"><MessageSquare className="w-3 h-3 text-primary shrink-0" /> {totalConversations ?? 0} conversas</span>
              <span className="hidden sm:flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> {lastUpdatedLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={isRefreshing}
            className="bg-primary/5 border-primary/10 text-primary hover:bg-primary/10 h-8 px-3 rounded-lg font-bold text-[9px] uppercase tracking-wider gap-1.5"
          >
            <RefreshCcw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Reconectar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowLogs ? onShowLogs() : toast.info('Nenhum handler de logs configurado')}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 px-3 rounded-lg font-bold text-[9px] uppercase tracking-wider gap-1.5"
          >
            <Bug className="w-3 h-3" />
            <span className="hidden sm:inline">Logs</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
