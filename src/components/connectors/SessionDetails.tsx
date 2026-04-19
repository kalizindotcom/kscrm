import React from 'react';
import { 
  X, 
  Smartphone, 
  Calendar, 
  Activity, 
  Shield, 
  Hash, 
  User, 
  Clock, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  Power,
  Tag,
  MessageSquare,
  FileText,
  Star,
  Copy,
  ExternalLink,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionStatusBadge } from './SessionStatusBadge';
import { QRCodeDisplay } from './QRCodeDisplay';
import { Session } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSessionStore } from '@/store/useSessionStore';
import { sessionService } from '@/services/sessionService';

interface SessionDetailsProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, session: Session) => void;
}

export const SessionDetails: React.FC<SessionDetailsProps> = ({ session, isOpen, onClose, onAction }) => {
  const { updateSession } = useSessionStore();
  const [isEditing, setIsEditing] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  React.useEffect(() => {
    if (session) {
      setNewName(session.name);
    }
  }, [session]);

  if (!session) return null;

  const copyId = () => {
    navigator.clipboard.writeText(session.id);
    toast.success('ID da sessão copiado!');
  };

  const handleSaveName = async () => {
    if (!session || !newName.trim()) {
      toast.error('O nome da sess�o n�o pode estar vazio');
      return;
    }

    try {
      const updated = await sessionService.update(session.id, { name: newName.trim() });
      updateSession(session.id, { name: updated.name });
      setIsEditing(false);
      toast.success('Nome da sess�o atualizado!');
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao atualizar o nome da sess�o');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-slate-950/90 border-blue-500/20 text-slate-100 p-0 flex flex-col gap-0 overflow-hidden backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.15)] animate-in fade-in zoom-in-95 duration-300">
        {/* Glow Effects */}
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <DialogHeader className="p-6 pb-0 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <div className={cn(
                "p-3 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.1)]",
                session.status === 'connected' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-400"
              )}>
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full max-w-[250px]">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-white text-lg font-bold"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-400" onClick={handleSaveName}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white truncate">
                        {newName}
                        {session.favorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                      </DialogTitle>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <SessionStatusBadge status={session.status} />
                  <span className="text-xs text-slate-500 font-mono">{session.phoneNumber || 'Não vinculado'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-6">
            <Button size="sm" variant="outline" className="h-8 bg-white/5 border-white/10 text-xs font-bold hover:bg-white/10 transition-colors" onClick={copyId}>
              <Copy className="w-3 h-3 mr-1.5" /> ID
            </Button>
            <Button size="sm" variant="outline" className="h-8 bg-white/5 border-white/10 text-xs font-bold hover:bg-white/10 transition-colors">
              <ExternalLink className="w-3 h-3 mr-1.5" /> Gateway
            </Button>
            {session.status === 'connected' ? (
              <Button size="sm" variant="outline" className="h-8 bg-amber-500/10 border-amber-500/20 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-all" onClick={() => onAction('pause', session)}>
                <Pause className="w-3 h-3 mr-1.5" /> Pausar
              </Button>
            ) : (
              <Button size="sm" variant="default" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all" onClick={() => onAction('connect', session)}>
                <Zap className="w-3 h-3 mr-1.5" /> Conectar
              </Button>
            )}
          </div>
        </DialogHeader>

        <Separator className="bg-slate-800" />

        <ScrollArea className="flex-1">
          <Tabs defaultValue={session.status === 'pairing' ? 'qr' : 'overview'} className="w-full">
            <div className="px-6 bg-slate-900/50 sticky top-0 z-10 border-b border-slate-800">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-4 p-0">
                <TabsTrigger value="overview" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-1 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-white">Geral</TabsTrigger>
                <TabsTrigger value="connectivity" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-1 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-white">Conectividade</TabsTrigger>
                <TabsTrigger value="logs" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-1 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-white">Logs & Timeline</TabsTrigger>
                {(session.status === 'disconnected' || session.status === 'pairing' || session.status === 'error') && (
                  <TabsTrigger value="qr" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-1 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-white">QR Code</TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="overview" className="m-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Apelido</p>
                    <p className="text-sm font-medium text-slate-200">{session.nickname || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Ambiente</p>
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-400 text-[10px] h-5 uppercase">{session.environment}</Badge>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Responsável</p>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <p className="text-sm font-medium text-slate-200">{session.responsible}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Criado em</p>
                    <p className="text-sm font-medium text-slate-200">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Tags & Metadados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.tags.map((tag, i) => (
                      <Badge key={i} className="bg-slate-800 text-slate-300 border-none hover:bg-slate-700">{tag}</Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/5 font-bold">
                      + ADICIONAR TAG
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Observações Internas
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm text-slate-400 italic">
                    {session.notes || 'Nenhuma observação adicionada a esta sessão.'}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="connectivity" className="m-0 space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                    <p className="text-2xl font-bold text-white">{session.syncCount}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Sincronizações</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                    <p className="text-2xl font-bold text-blue-500">{session.reconnectCount}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Reconexões</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                    <p className={cn("text-2xl font-bold", session.failureCount > 5 ? "text-rose-500" : "text-white")}>{session.failureCount}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Falhas</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-300">Última Conexão</span>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{session.lastConnectedAt ? new Date(session.lastConnectedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-300">Última Atividade</span>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'N/A'}</span>
                  </div>
                  {session.disconnectReason && (
                    <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-rose-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Motivo da Desconexão</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{session.disconnectReason}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="m-0 space-y-6">
                <div className="space-y-4">
                  {session.recentLogs.map((log, i) => (
                    <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                      {/* Timeline line */}
                      {i < session.recentLogs.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-800" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center",
                        log.severity === 'success' ? "bg-emerald-500" :
                        log.severity === 'error' ? "bg-rose-500" :
                        log.severity === 'warning' ? "bg-amber-500" : "bg-blue-500"
                      )}>
                        {log.severity === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> :
                         log.severity === 'error' ? <AlertCircle className="w-3 h-3 text-white" /> :
                         <Clock className="w-3 h-3 text-white" />}
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{log.type.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{log.message}</p>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-700 text-slate-500 font-bold">{log.origin}</Badge>
                          {log.user && <span className="text-[9px] text-slate-500 font-bold uppercase">Por: {log.user}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="qr" className="m-0">
                <QRCodeDisplay 
                  sessionId={session.id}
                  onCancel={onClose} 
                  onSuccess={() => {
                    toast.success('Sessão vinculada!');
                    onAction('connect_finish', session);
                  }} 
                />
              </TabsContent>
            </div>
          </Tabs>
        </ScrollArea>

        <Separator className="bg-slate-800" />

        <DialogFooter className="p-6 bg-slate-900/50 relative z-10 border-t border-slate-800">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 font-bold text-xs" onClick={() => onAction('delete', session)}>
              <Trash2 className="w-4 h-4 mr-2" /> DELETAR SESSÃO
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/5 border-white/10 font-bold text-xs" onClick={onClose}>
                FECHAR
              </Button>
              {session.status === 'connected' ? (
                <Button variant="outline" className="bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 font-bold text-xs" onClick={() => onAction('terminate', session)}>
                  ENCERRAR SESSÃO
                </Button>
              ) : (
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20" onClick={() => onAction('connect', session)}>
                  RECONECTAR AGORA
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

