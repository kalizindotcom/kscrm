import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Pause, 
  RefreshCcw, 
  QrCode, 
  AlertTriangle, 
  Ban, 
  Archive,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SessionStatus } from './types';

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  dotClassName: string;
}

const statusConfigs: Record<SessionStatus, StatusConfig> = {
  connected: {
    label: 'Conectado',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dotClassName: 'bg-emerald-500'
  },
  disconnected: {
    label: 'Desconectado',
    icon: XCircle,
    className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    dotClassName: 'bg-slate-500'
  },
  pairing: {
    label: 'Aguardando QR',
    icon: QrCode,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dotClassName: 'bg-blue-500'
  },
  paused: {
    label: 'Pausado',
    icon: Pause,
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dotClassName: 'bg-amber-500'
  },
  syncing: {
    label: 'Sincronizando',
    icon: RefreshCcw,
    className: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    dotClassName: 'bg-indigo-500'
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    dotClassName: 'bg-orange-500'
  },
  error: {
    label: 'Erro',
    icon: Ban,
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dotClassName: 'bg-rose-500'
  },
  terminated: {
    label: 'Encerrado',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
    dotClassName: 'bg-red-500'
  },
  archived: {
    label: 'Arquivado',
    icon: Archive,
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    dotClassName: 'bg-zinc-500'
  }
};

export const SessionStatusBadge: React.FC<{ status: SessionStatus, className?: string }> = ({ status, className }) => {
  const config = statusConfigs[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn("flex items-center gap-1.5 px-2 py-0.5 font-medium transition-all duration-300", config.className, className)}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dotClassName)} />
      {status === 'syncing' ? (
        <RefreshCcw className="w-3 h-3 animate-spin mr-0.5" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {config.label}
    </Badge>
  );
};
