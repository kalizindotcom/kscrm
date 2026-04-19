import React from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Ban, 
  QrCode, 
  Archive,
  RefreshCcw,
  TrendingUp,
  Signal
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Session } from './types';

interface MetricsGridProps {
  sessions: Session[];
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ sessions }) => {
  const total = sessions.length;
  const connected = sessions.filter(s => s.status === 'connected').length;
  const disconnected = sessions.filter(s => s.status === 'disconnected').length;
  const paused = sessions.filter(s => s.status === 'paused').length;
  const error = sessions.filter(s => s.status === 'error').length;
  const pairing = sessions.filter(s => s.status === 'pairing').length;
  const archived = sessions.filter(s => s.status === 'archived').length;
  const reconnections = sessions.reduce((acc, s) => acc + s.reconnectCount, 0);

  const metrics = [
    { label: 'Total', value: total, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Conectadas', value: connected, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Desconectadas', value: disconnected, icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { label: 'Pausadas', value: paused, icon: Pause, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Com Erro', value: error, icon: Ban, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Aguardando QR', value: pairing, icon: QrCode, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Arquivadas', value: archived, icon: Archive, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
    { label: 'Reconexões', value: reconnections, icon: RefreshCcw, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
      {metrics.map((m, i) => (
        <Card key={i} className="bg-muted/30 border-none shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className={`p-2 rounded-full ${m.bg} ${m.color} mb-2`}>
              <m.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold tracking-tight">{m.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
