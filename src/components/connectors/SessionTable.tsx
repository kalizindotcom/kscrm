import React from 'react';
import { 
  MoreVertical, 
  Smartphone, 
  Trash2, 
  Pause, 
  Star, 
  Info,
  Copy,
  Zap,
  Archive,
  KeyRound
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
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

interface SessionTableProps {
  sessions: Session[];
  onAction: (action: string, session: Session) => void;
  onDetails: (session: Session) => void;
  onFavorite: (session: Session) => void;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({ 
  sessions, 
  onAction, 
  onDetails, 
  onFavorite,
  selectedIds,
  onSelect,
  onSelectAll
}) => {
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID da sessao copiado!');
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-x-auto">
      <div className="min-w-[800px]">
        <Table>
        <TableHeader className="bg-slate-800/50">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="w-12 text-center">
              <Checkbox 
                checked={selectedIds.length === sessions.length && sessions.length > 0}
                onCheckedChange={onSelectAll}
                className="border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
            </TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Sessao</TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Numero</TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ambiente</TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Saude</TableHead>
            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Atividade</TableHead>
            <TableHead className="text-right text-slate-400 font-bold uppercase tracking-wider text-[10px]">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow 
              key={session.id} 
              className={cn(
                "border-slate-800 hover:bg-slate-800/30 transition-colors group",
                selectedIds.includes(session.id) && "bg-blue-500/5 hover:bg-blue-500/10"
              )}
            >
              <TableCell className="text-center">
                <Checkbox 
                  checked={selectedIds.includes(session.id)}
                  onCheckedChange={() => onSelect(session.id)}
                  className="border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    session.status === 'connected' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-400"
                  )}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 text-sm">{session.name}</span>
                      {session.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">ID: {session.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <SessionStatusBadge status={session.status} />
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-300">
                {session.phoneNumber || '--'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(
                  "text-[10px] uppercase font-bold px-1.5 h-5",
                  session.environment === 'production' ? "border-amber-500/30 text-amber-500 bg-amber-500/5" : "border-slate-700 text-slate-400"
                )}>
                  {session.environment}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5 min-w-[100px]">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500">
                    <span className={cn(
                      session.healthScore > 80 ? "text-emerald-500" :
                      session.healthScore > 50 ? "text-blue-500" : "text-rose-500"
                    )}>{session.healthScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full relative">
                    <div 
                      className="h-full river-progress-indicator rounded-full scale-y-125"
                      style={{ 
                        width: `${session.healthScore}%`,
                        '--river-color-1': session.healthScore > 80 ? '#10b981' : session.healthScore > 50 ? '#3b82f6' : '#f43f5e',
                        '--river-color-2': session.healthScore > 80 ? '#34d399' : session.healthScore > 50 ? '#60a5fa' : '#fb7185',
                        '--river-color-3': session.healthScore > 80 ? '#6ee7b7' : session.healthScore > 50 ? '#93c5fd' : '#fda4af',
                      } as any}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300">
                    {session.lastActivity ? new Date(session.lastActivity).toLocaleDateString() : '--'}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Sinc: {session.syncCount}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 relative z-20">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                          onClick={() => onDetails(session)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver Detalhes</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                      <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Comandos</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => onDetails(session)} className="focus:bg-slate-800 cursor-pointer">
                        <Info className="mr-2 h-4 w-4" /> Abrir Painel
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onAction('open_gateway', session)} className="focus:bg-slate-800 cursor-pointer">
                        <Zap className="mr-2 h-4 w-4 text-blue-400" /> Abrir Gateway
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onFavorite(session)} className="focus:bg-slate-800 cursor-pointer">
                        <Star className={cn("mr-2 h-4 w-4", session.favorite && "fill-blue-500 text-blue-500")} />
                        {session.favorite ? 'Remover Favorito' : 'Tornar Favorito'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => copyId(session.id)} className="focus:bg-slate-800 cursor-pointer">
                        <Copy className="mr-2 h-4 w-4" /> Copiar ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-800" />
                      {session.status === 'connected' && (
                        <DropdownMenuItem onSelect={() => onAction('pause', session)} className="focus:bg-slate-800 cursor-pointer">
                          <Pause className="mr-2 h-4 w-4" /> Pausar Sessão
                        </DropdownMenuItem>
                      )}
                      {session.status === 'paused' && (
                        <DropdownMenuItem onSelect={() => onAction('resume', session)} className="focus:bg-slate-800 cursor-pointer">
                          <Zap className="mr-2 h-4 w-4 text-amber-500" /> Retomar Sessão
                        </DropdownMenuItem>
                      )}
                      {session.status === 'archived' ? (
                        <DropdownMenuItem onSelect={() => onAction('unarchive', session)} className="focus:bg-slate-800 cursor-pointer">
                          <Archive className="mr-2 h-4 w-4 text-zinc-300" /> Desarquivar Sessão
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => onAction('archive', session)} className="focus:bg-slate-800 cursor-pointer">
                          <Archive className="mr-2 h-4 w-4 text-zinc-300" /> Arquivar Sessão
                        </DropdownMenuItem>
                      )}
                      {session.status !== 'connected' && session.status !== 'paused' && session.status !== 'archived' && (
                        <>
                          <DropdownMenuItem onSelect={() => onAction('connect', session)} className="focus:bg-slate-800 cursor-pointer">
                            <Zap className="mr-2 h-4 w-4 text-amber-500" /> Conectar via QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onAction('pairing_code', session)} className="focus:bg-slate-800 cursor-pointer">
                            <KeyRound className="mr-2 h-4 w-4 text-blue-400" /> Conectar por numero
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem 
                        className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                        onSelect={() => onAction('delete', session)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
};

