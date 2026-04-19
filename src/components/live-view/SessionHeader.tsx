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
  BarChart2, 
  ExternalLink,
  Copy,
  Bug
} from 'lucide-react';
import { Badge } from '@/components/ui/shared';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SessionHeaderProps {
  session: Session;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({ session }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleReconnect = () => {
    setIsRefreshing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Reiniciando gateway...',
        success: 'Gateway reconectado com sucesso!',
        error: 'Erro ao reconectar gateway',
        finally: () => setIsRefreshing(false)
      }
    );
  };

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
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{session.name}</h2>
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-widest">
                ONLINE
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> {session.id}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Atualizado há 2 min</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 xl:gap-12 py-4 xl:py-0 border-y xl:border-none border-white/5 w-full xl:w-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversas</p>
            <p className="text-xl font-black text-white">1,284</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Buffer</p>
            <p className="text-xl font-black text-white">452 <span className="text-xs text-slate-600 font-medium">msg</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estabilidade</p>
            <p className="text-xl font-black text-emerald-400">99.8%</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronia</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  className="h-full bg-primary shadow-[0_0_10px_hsla(var(--primary),0.5)]"
                />
              </div>
              <span className="text-xs font-bold text-primary">LIVE</span>
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
            onClick={() => toast.info('Abrindo painel de logs...')}
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => toast.info('Abrindo painel externo...')}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 w-10 p-0 rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
