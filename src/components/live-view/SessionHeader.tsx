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
    <div className="bg-card/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Activity className="w-32 h-32 text-primary" />
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center shadow-lg">
              <Server className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background border border-primary/20 rounded-full flex items-center justify-center">
              <div className={cn(
                "w-3 h-3 rounded-full shadow-[0_0_10px_#10b981]",
                session.status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
              )} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{session.name}</h2>
              <Badge variant={session.status === 'connected' ? 'success' : 'default'} className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-widest",
                session.status === 'connected'
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {session.status === 'connected' ? 'ONLINE' : session.status?.toUpperCase() ?? 'OFFLINE'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> {session.id}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Atualizado {lastUpdatedLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 xl:gap-12 py-4 xl:py-0 border-y xl:border-none border-white/5 w-full xl:w-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversas</p>
            <p className="text-xl font-black text-white">{totalConversations ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sessão</p>
            <p className="text-xl font-black text-white truncate max-w-[80px]" title={session.phoneNumber}>{session.phoneNumber ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reconexões</p>
            <p className="text-xl font-black text-emerald-400">{session.reconnectCount ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronia</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: session.status === 'connected' ? '85%' : '20%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  className="h-full bg-primary shadow-[0_0_10px_hsla(var(--primary),0.5)]"
                />
              </div>
              <span className="text-xs font-bold text-primary">
                {session.status === 'connected' ? 'LIVE' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={isRefreshing}
            className="bg-primary/5 border-primary/10 text-primary hover:bg-primary/10 h-10 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider gap-2"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} /> RECONECTAR
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowLogs ? onShowLogs() : toast.info('Nenhum handler de logs configurado')}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider gap-2"
          >
            <Bug className="w-3.5 h-3.5" /> LOGS
          </Button>
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 w-10 p-0 rounded-xl" onClick={() => {
            navigator.clipboard.writeText(session.id);
            toast.success('ID copiado com sucesso!');
          }}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
