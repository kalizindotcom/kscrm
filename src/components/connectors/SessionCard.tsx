import React from 'react';
import { 
  MoreVertical, 
  Smartphone, 
  Trash2, 
  Pause, 
  Play, 
  RefreshCcw, 
  Power, 
  QrCode, 
  Star, 
  Info,
  Copy,
  Activity,
  User,
  ExternalLink,
  Zap,
  Tag,
  KeyRound
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { SessionStatusBadge } from './SessionStatusBadge';
import { Session } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SessionCardProps {
  session: Session;
  onAction: (action: string, session: Session) => void;
  onDetails: (session: Session) => void;
  onFavorite: (session: Session) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onAction, onDetails, onFavorite }) => {
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-rose-500';
  };

  const copyId = () => {
    navigator.clipboard.writeText(session.id);
    toast.success('ID da sessão copiado!');
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-700 bg-slate-900/50 border-slate-800 flex flex-col h-full",
      session.favorite && "border-l-4 border-l-blue-500",
      session.status === 'connected' && "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] bg-emerald-500/[0.01]"
    )}>
      {/* Background glow on hover */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "p-2.5 rounded-xl transition-colors duration-300 shrink-0",
              session.status === 'connected' ? "bg-emerald-500/10 text-emerald-500" :
              session.status === 'error' ? "bg-rose-500/10 text-rose-500" :
              "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
            )}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden flex-1">
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <CardTitle className="text-sm font-bold text-slate-100 truncate max-w-full">{session.name}</CardTitle>
                {session.favorite && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                )}
              </div>
              <CardDescription className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                {session.channel}
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                {session.environment}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-100 transition-opacity duration-300 shrink-0 relative z-20">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" onClick={() => onFavorite(session)}>
                    <Star className={cn("h-4 w-4", session.favorite && "fill-blue-500 text-blue-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{session.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Ações da Sessão</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => onDetails(session)} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Info className="mr-2 h-4 w-4" /> Detalhes Completos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={copyId} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" /> Copiar ID
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Gateway
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                {session.status === 'connected' && (
                  <>
                    <DropdownMenuItem onSelect={() => onAction('pause', session)} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                      <Pause className="mr-2 h-4 w-4" /> Pausar Sessão
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAction('terminate', session)} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                      <Power className="mr-2 h-4 w-4" /> Encerrar Sessão
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem 
                  className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                  onSelect={() => onAction('delete', session)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow">
        <div className="flex justify-between items-center gap-2 overflow-hidden bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
          <SessionStatusBadge status={session.status} className="shrink-0 scale-90 origin-left" />
          <span className="text-[10px] font-mono text-slate-400 truncate tracking-tighter">{session.phoneNumber || 'Não vinculado'}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-slate-500">
            <span>Saúde da Conexão</span>
            <span className={getHealthColor(session.healthScore)}>{session.healthScore}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full relative">
            <div 
              className="h-full river-progress-indicator rounded-full transition-all duration-1000 ease-in-out scale-y-125"
              style={{ 
                width: `${session.healthScore}%`,
                '--river-color-1': session.healthScore > 80 ? '#10b981' : session.healthScore > 50 ? '#3b82f6' : '#f43f5e',
                '--river-color-2': session.healthScore > 80 ? '#34d399' : session.healthScore > 50 ? '#60a5fa' : '#fb7185',
                '--river-color-3': session.healthScore > 80 ? '#6ee7b7' : session.healthScore > 50 ? '#93c5fd' : '#fda4af',
              } as any}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-800/50 min-w-0">
            <p className="text-slate-500 uppercase tracking-tight font-bold mb-1 truncate">Reconexões</p>
            <p className="text-slate-200 font-mono text-sm truncate">{session.reconnectCount}</p>
          </div>
          <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-800/50 min-w-0">
            <p className="text-slate-500 uppercase tracking-tight font-bold mb-1 truncate">Sincronizações</p>
            <p className="text-slate-200 font-mono text-sm truncate">{session.syncCount}</p>
          </div>
        </div>

        {session.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {session.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="bg-blue-500/5 text-blue-400 border-blue-500/10 text-[9px] font-bold h-4 px-1.5 uppercase tracking-tighter">
                {tag}
              </Badge>
            ))}
            {session.tags.length > 3 && (
              <span className="text-[9px] text-slate-500">+{session.tags.length - 3}</span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-slate-800/50 mt-auto">
        {session.status === 'connected' ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-9 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-wider px-2"
            onClick={() => onDetails(session)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="truncate">Painel da Sessão</span>
          </Button>
        ) : session.status === 'pairing' ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] h-9 shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wider px-2"
            onClick={() => onAction('qr', session)}
          >
            <QrCode className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="truncate">Visualizar QR Code</span>
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] h-9 shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wider px-2"
              onClick={() => onAction('connect', session)}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="truncate">Via QR</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-bold text-[10px] h-9 transition-all uppercase tracking-wider px-2"
              onClick={() => onAction('pairing_code', session)}
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="truncate">Por numero</span>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
