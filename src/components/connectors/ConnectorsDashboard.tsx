import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  RefreshCcw,
  ChevronDown,
  Pause,
  Archive,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MetricsGrid } from './MetricsCards';
import { SessionCard } from './SessionCard';
import { SessionTable } from './SessionTable';
import { SessionDetails } from './SessionDetails';
import { CreateSessionModal } from './CreateSessionModal';
import { PairingCodeModal } from './PairingCodeModal';
import type { Session, SessionStatus } from './types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/useSessionStore';
import { sessionService } from '@/services/sessionService';
import { getSocket, subscribe, unsubscribe } from '@/services/wsClient';
import { useNavigate } from 'react-router-dom';

export const ConnectorsDashboard: React.FC = () => {
  const {
    sessions,
    setSessions,
    updateSession,
    addSessionLog,
    removeSession,
    openCreateSessionModal,
    selectedSessionId,
    selectSession,
  } = useSessionStore();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pairingSessionId, setPairingSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await sessionService.list();
        setSessions(data);
      } catch (error: any) {
        if (!silent) {
          toast.error(error?.message ?? 'Falha ao carregar sessoes');
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [setSessions],
  );

  useEffect(() => {
    loadSessions().catch(() => undefined);
    const interval = setInterval(() => {
      loadSessions(true).catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    const rooms = sessions.map((session) => `session:${session.id}`);
    rooms.forEach((room) => subscribe(room));
    return () => {
      rooms.forEach((room) => unsubscribe(room));
    };
  }, [sessions]);

  useEffect(() => {
    const socket = getSocket();

    const onStatus = (event: any) => {
      if (!event?.sessionId) return;
      updateSession(event.sessionId, {
        status: event.status as SessionStatus,
        disconnectReason: event.reason,
        ...(event.healthScore !== undefined ? { healthScore: event.healthScore } : {}),
        ...(event.phoneNumber !== undefined ? { phoneNumber: event.phoneNumber } : {}),
      });
    };

    const onQr = (event: any) => {
      if (!event?.sessionId || !event?.dataUrl) return;
      updateSession(event.sessionId, {
        status: 'pairing',
        qrCodeDataUrl: event.dataUrl,
      });
    };

    const onLog = (event: any) => {
      if (!event?.sessionId || !event?.log) return;
      addSessionLog(event.sessionId, {
        type: event.log.type ?? 'system',
        severity: event.log.severity ?? 'info',
        message: event.log.message ?? '',
        origin: event.log.origin ?? 'engine',
        user: event.log.user ?? undefined,
      });
    };

    socket.on('session.status', onStatus);
    socket.on('session.qr', onQr);
    socket.on('session.log', onLog);

    return () => {
      socket.off('session.status', onStatus);
      socket.off('session.qr', onQr);
      socket.off('session.log', onLog);
    };
  }, [addSessionLog, updateSession]);

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.name.toLowerCase().includes(search.toLowerCase()) ||
      session.phoneNumber?.includes(search) ||
      session.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) || null;
  const pairingSession = sessions.find((session) => session.id === pairingSessionId) || null;

  const handleAction = async (action: string, session: Session) => {
    try {
      switch (action) {
        case 'pairing_code':
          if (session.status === 'archived') {
            const unarchived = await sessionService.unarchive(session.id);
            updateSession(session.id, { status: unarchived.status, tags: unarchived.tags });
          }
          if (session.status === 'paused') {
            await sessionService.resume(session.id);
          } else if (session.status !== 'pairing' && session.status !== 'connected') {
            await sessionService.connect(session.id);
          }
          updateSession(session.id, { status: 'pairing' });
          setPairingSessionId(session.id);
          return;
        case 'reconnect_qr':
          await sessionService.reconnectViaQr(session.id);
          updateSession(session.id, { status: 'pairing' });
          selectSession(session.id);
          toast.info(`Iniciando conexao para: ${session.name}`);
          break;
        case 'connect':
        case 'qr':
          if (session.status === 'paused') {
            await sessionService.resume(session.id);
          } else {
            if (session.status === 'archived') {
              const unarchived = await sessionService.unarchive(session.id);
              updateSession(session.id, { status: unarchived.status, tags: unarchived.tags });
            }
            await sessionService.connect(session.id);
          }
          updateSession(session.id, { status: 'pairing' });
          selectSession(session.id);
          toast.info(`Iniciando conexao para: ${session.name}`);
          break;
        case 'connect_finish':
          await loadSessions(true);
          toast.success(`Sessao ${session.name} conectada com sucesso!`);
          break;
        case 'pause':
          await sessionService.pause(session.id);
          updateSession(session.id, { status: 'paused' });
          toast.warning(`Sessao ${session.name} pausada.`);
          break;
        case 'resume':
          await sessionService.resume(session.id);
          updateSession(session.id, { status: 'pairing' });
          toast.info(`Retomando sessao ${session.name}.`);
          break;
        case 'terminate':
          await sessionService.terminate(session.id);
          updateSession(session.id, {
            status: 'terminated',
            lastDisconnectedAt: new Date().toISOString(),
          });
          toast.info(`Sessao ${session.name} encerrada.`);
          break;
        case 'archive': {
          const archived = await sessionService.archive(session.id);
          updateSession(session.id, {
            status: archived.status,
            tags: archived.tags,
            lastDisconnectedAt: archived.lastDisconnectedAt,
          });
          toast.info(`Sessao ${session.name} arquivada.`);
          break;
        }
        case 'unarchive': {
          const unarchived = await sessionService.unarchive(session.id);
          updateSession(session.id, {
            status: unarchived.status,
            tags: unarchived.tags,
          });
          toast.success(`Sessao ${session.name} desarquivada.`);
          break;
        }
        case 'sync': {
          const result = await sessionService.syncWhatsApp(session.id);
          updateSession(session.id, {
            status: result.session.status,
            syncCount: result.session.syncCount,
            lastActivity: result.session.lastActivity,
          });
          toast.success(`Sincronizacao concluida: ${result.groupsSynced} grupos atualizados.`);
          break;
        }
        case 'open_gateway':
          selectSession(session.id);
          navigate('/live-view');
          return;
        case 'add_tag': {
          const tag = window.prompt('Digite a nova tag da sessao:');
          if (!tag?.trim()) return;
          const tags = Array.from(new Set([...(session.tags ?? []), tag.trim()]));
          const updated = await sessionService.update(session.id, { tags });
          updateSession(session.id, { tags: updated.tags });
          toast.success(`Tag "${tag.trim()}" adicionada.`);
          return;
        }
        case 'delete':
          await sessionService.remove(session.id);
          removeSession(session.id);
          if (selectedSessionId === session.id) selectSession(null);
          toast.success(`Sessao ${session.name} removida.`);
          break;
        default:
          toast.info(`Acao ${action} executada.`);
      }
    } catch (error: any) {
      toast.error(error?.message ?? `Falha ao executar acao ${action}`);
    }
  };

  const toggleFavorite = async (session: Session) => {
    try {
      const updated = await sessionService.update(session.id, { favorite: !session.favorite });
      updateSession(session.id, { favorite: updated.favorite });
      toast.success(!session.favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao atualizar favorito');
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === filteredSessions.length ? [] : filteredSessions.map((session) => session.id),
    );
  };

  const syncAll = async () => {
    if (!sessions.length) return;
    setIsSyncing(true);
    try {
      const results = await Promise.allSettled(
        sessions.map((session) => sessionService.syncContacts(session.id)),
      );
      await loadSessions(true);
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) {
        toast.warning(`Sincronização parcial: ${results.length - failed} sucesso(s) e ${failed} falha(s).`);
      } else {
        toast.success('Sincronização concluída com sucesso!');
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro na sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  const pauseSelected = async () => {
    try {
      await Promise.all(selectedIds.map((id) => sessionService.pause(id)));
      await loadSessions(true);
      toast.success(`${selectedIds.length} sessoes pausadas`);
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao pausar sessoes selecionadas');
    }
  };

  const archiveSelected = async () => {
    const count = selectedIds.length;
    if (!count) return;
    try {
      const archivedRows = await Promise.all(selectedIds.map((id) => sessionService.archive(id)));
      archivedRows.forEach((row) => {
        updateSession(row.id, {
          status: row.status,
          tags: row.tags,
          lastDisconnectedAt: row.lastDisconnectedAt,
        });
      });
      setSelectedIds([]);
      toast.info(`${count} sessões arquivadas`);
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao arquivar sessões selecionadas');
    }
  };

  const deleteSelected = async () => {
    const count = selectedIds.length;
    try {
      await Promise.all(selectedIds.map((id) => sessionService.remove(id)));
      selectedIds.forEach((id) => removeSession(id));
      setSelectedIds([]);
      toast.success(`${count} sessoes deletadas`);
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao deletar sessoes selecionadas');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Conectores</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold h-5 px-1.5 uppercase tracking-widest">
              Live Gateway
            </Badge>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg leading-relaxed font-medium">
            Gerenciamento centralizado de sessoes e canais de comunicacao. Controle total sobre a conectividade do seu SaaS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <Button
            variant="outline"
            className="flex-1 lg:flex-none bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-bold text-[10px] h-9 px-3"
            onClick={syncAll}
            disabled={isSyncing}
          >
            <RefreshCcw className={cn('w-3.5 h-3.5 mr-2', isSyncing && 'animate-spin')} />
            SINCRONIZAR
          </Button>
          <Button
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all font-bold text-[10px] h-9 px-4"
            onClick={openCreateSessionModal}
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            NOVA SESSAO
          </Button>
        </div>
      </div>

      <MetricsGrid sessions={sessions} />

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Buscar por nome, numero ou ID..."
            className="pl-10 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/10 h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white h-10 rounded-xl gap-2 text-xs font-bold uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" />
                Status: {statusFilter === 'all' ? 'Todos' : statusFilter}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300 min-w-[200px]">
              <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Filtrar por Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>Todos</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuCheckboxItem checked={statusFilter === 'connected'} onCheckedChange={() => setStatusFilter('connected')}>Conectados</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter === 'disconnected'} onCheckedChange={() => setStatusFilter('disconnected')}>Desconectados</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter === 'pairing'} onCheckedChange={() => setStatusFilter('pairing')}>Aguardando QR</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter === 'paused'} onCheckedChange={() => setStatusFilter('paused')}>Pausados</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter === 'archived'} onCheckedChange={() => setStatusFilter('archived')}>Arquivados</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter === 'error'} onCheckedChange={() => setStatusFilter('error')}>Com Erro</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 bg-slate-800 hidden md:block" />

          <div className="bg-slate-950/50 p-1 rounded-xl border border-slate-800 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-lg', viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-lg', viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300')}
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Carregando sessoes...</div>
        ) : filteredSessions.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onAction={handleAction}
                  onFavorite={toggleFavorite}
                  onDetails={(item) => selectSession(item.id)}
                />
              ))}

              <Card
                className="border-2 border-dashed border-slate-800 bg-transparent flex flex-col items-center justify-center p-8 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group rounded-2xl h-full min-h-[280px]"
                onClick={openCreateSessionModal}
              >
                <div className="p-4 rounded-full bg-slate-900 border border-slate-800 group-hover:border-blue-500/50 transition-all mb-4">
                  <Plus className="w-6 h-6 text-slate-500 group-hover:text-blue-500" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Criar Nova Sessao</p>
                <p className="text-slate-600 text-xs mt-1 text-center max-w-[150px]">Inicie um novo canal de comunicacao rapidamente.</p>
              </Card>
            </div>
          ) : (
            <SessionTable
              sessions={filteredSessions}
              onAction={handleAction}
              onFavorite={toggleFavorite}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onDetails={(item) => selectSession(item.id)}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-2">
              <Search className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum conector encontrado</h3>
            <p className="text-slate-500 max-w-sm text-sm">Nao encontramos nenhuma sessao com os termos ou filtros aplicados. Tente ajustar sua busca.</p>
            <Button variant="outline" className="mt-4 border-slate-800 text-slate-400" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              LIMPAR TODOS OS FILTROS
            </Button>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-8 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white font-bold rounded-full h-6 w-6 flex items-center justify-center p-0">
                {selectedIds.length}
              </Badge>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Selecionados</span>
            </div>

            <Separator orientation="vertical" className="h-8 bg-slate-700" />

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs" onClick={pauseSelected}>
                <Pause className="w-4 h-4 mr-2" /> PAUSAR
              </Button>
              <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs" onClick={archiveSelected}>
                <Archive className="w-4 h-4 mr-2" /> ARQUIVAR
              </Button>
              <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-bold text-xs" onClick={deleteSelected}>
                <Trash2 className="w-4 h-4 mr-2" /> DELETAR
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8 bg-slate-700" />

            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setSelectedIds([])}>
              FECHAR
            </Button>
          </div>
        </div>
      )}

      <SessionDetails
        session={selectedSession}
        isOpen={!!selectedSessionId}
        onClose={() => selectSession(null)}
        onAction={handleAction}
      />

      <CreateSessionModal />
      <PairingCodeModal
        isOpen={!!pairingSessionId}
        session={pairingSession}
        onClose={() => setPairingSessionId(null)}
        onGenerated={(id) => {
          updateSession(id, { status: 'pairing' });
          loadSessions(true).catch(() => undefined);
        }}
      />
    </div>
  );
};

export default ConnectorsDashboard;


