import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Users,
  MessageSquare,
  Shield,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Info,
  Save,
  CheckCircle2,
  Globe,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { cn, formatDate } from '../lib/utils';
import { WhatsAppGroup } from '../types';
import { groupsService } from '../services/groupsService';
import { sessionService } from '../services/sessionService';
import { useSessionStore } from '../store/useSessionStore';
import { useAuthStore } from '../store';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export const GroupsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGroup, setIsSyncingGroup] = useState(false);
  const [isSaveAgendaModalOpen, setIsSaveAgendaModalOpen] = useState(false);
  const [agendaName, setAgendaName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { sessions, setSessions, selectedSessionId, openCreateSessionModal } = useSessionStore();

  const getActiveConnectedSessionId = (sessionList: typeof sessions = sessions) => {
    const selectedConnected =
      selectedSessionId != null
        ? sessionList.find((session) => session.id === selectedSessionId && session.status === 'connected')
        : null;
    return selectedConnected?.id ?? sessionList.find((session) => session.status === 'connected')?.id ?? null;
  };

  const loadGroups = async (sessionId: string) => {
    try {
      const data = await groupsService.listBySession(sessionId);
      setGroups(data);
    } catch {
      setGroups([]);
    }
  };

  const loadSessionAndGroups = async (showLoader: boolean = false) => {
    if (showLoader) setIsLoadingSession(true);
    let sessionList = sessions;
    try {
      sessionList = await sessionService.list();
      setSessions(sessionList);
    } catch {
      if (showLoader) {
        setSessions([]);
        setActiveSessionId(null);
        setGroups([]);
        setIsLoadingSession(false);
      }
      return;
    }

    const sessionId = getActiveConnectedSessionId(sessionList);
    setActiveSessionId(sessionId);
    if (sessionId) {
      await loadGroups(sessionId);
    } else {
      setGroups([]);
    }
    if (showLoader) setIsLoadingSession(false);
  };

  useEffect(() => {
    loadSessionAndGroups(true).catch(() => {
      setActiveSessionId(null);
      setGroups([]);
      setIsLoadingSession(false);
    });
    const interval = setInterval(() => {
      loadSessionAndGroups(false).catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  const handleGlobalSync = async () => {
    const sessionId = activeSessionId;
    if (!sessionId) {
      toast.error('Nenhuma sessão conectada. Conecte uma sessão primeiro.');
      return;
    }
    setIsSyncing(true);
    try {
      const synced = await groupsService.sync(sessionId);
      setGroups(synced);
      toast.success('Grupos sincronizados com sucesso!');
    } catch {
      toast.error('Falha ao sincronizar grupos.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const handleSync = (group: WhatsAppGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const formatBrazilPhone = (digits: string) => {
    if (!digits) return '';
    let normalized = digits;
    if (!normalized.startsWith('55') && (normalized.length === 10 || normalized.length === 11)) {
      normalized = `55${normalized}`;
    }
    if (normalized.startsWith('55') && normalized.length === 13) {
      return `+55 ${normalized.slice(2, 4)} ${normalized.slice(4, 9)}-${normalized.slice(9)}`;
    }
    if (normalized.startsWith('55') && normalized.length === 12) {
      return `+55 ${normalized.slice(2, 4)} ${normalized.slice(4, 8)}-${normalized.slice(8)}`;
    }
    if (normalized.length > 2) return `+${normalized}`;
    return normalized;
  };

  const formatMemberPhone = (jid: string): string => {
    const domain = jid.split('@')[1] ?? '';
    if (domain === 'g.us' || domain === 'lid') return '';
    const digits = (jid.split('@')[0] ?? '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    return formatBrazilPhone(digits);
  };

  const getMemberData = (group: WhatsAppGroup) => {
    const allJids = [...new Set([...group.admins, ...group.members])];
    return allJids
      .map((jid) => {
        const domain = jid.split('@')[1] ?? '';
        if (domain === 'g.us') return null;

        // @lid = WhatsApp privacy JID — show as unknown participant
        if (domain === 'lid') {
          return {
            jid,
            cleanPhone: '',
            displayPhone: 'Membro privado',
            isAdmin: group.admins.includes(jid),
          };
        }

        const local = jid.split('@')[0] ?? '';
        const digits = local.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15) return null;
        const formattedPhone = formatBrazilPhone(digits);
        return {
          jid,
          cleanPhone: digits,
          displayPhone: formattedPhone,
          isAdmin: group.admins.includes(jid),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  };

  const handleExport = async (type: 'csv' | 'excel') => {
    if (!selectedGroup) return;
    const format = type === 'csv' ? 'csv' : 'xlsx';
    const token = useAuthStore.getState().token;
    try {
      const response = await fetch(`${API_URL}/api/groups/${selectedGroup.id}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `contatos_${selectedGroup.name.replace(/\s+/g, '_').toLowerCase()}.${format}`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Exportação iniciada! O download começará em instantes.');
    } catch {
      toast.error('Falha ao exportar contatos.');
    }
  };

  const handleSyncGroup = async () => {
    if (!selectedGroup) return;
    setIsSyncingGroup(true);
    try {
      const updated = await groupsService.syncMembers(selectedGroup.id);
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      toast.success('Membros sincronizados com sucesso!');
    } catch {
      toast.error('Falha ao sincronizar membros do grupo.');
    } finally {
      setIsSyncingGroup(false);
    }
  };

  const handleSaveToAgenda = async () => {
    if (!selectedGroup) return;
    setIsSaving(true);
    try {
      await groupsService.saveToContacts(
        selectedGroup.id,
        agendaName.trim() || `Grupo: ${selectedGroup.name}`,
      );
      setIsSaveAgendaModalOpen(false);
      setAgendaName('');
      toast.success(
        `Lista "${agendaName || selectedGroup.name}" criada! Contatos importados para sua agenda.`,
      );
    } catch {
      toast.error('Falha ao salvar contatos para agenda.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando sessao ativa...</div>
      </div>
    );
  }

  if (!activeSessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
        <div className="max-w-2xl w-full bg-card/40 backdrop-blur-xl border border-primary/20 rounded-[2rem] p-12 text-center shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/10 rounded-full blur-[80px]" />

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center rotate-12 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                  <ShieldAlert className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center -rotate-12 shadow-[0_0_20px_rgba(var(--secondary),0.3)]">
                  <Zap className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </div>

            <h2 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
              Grupos Indisponiveis
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Para listar grupos reais, voce precisa de uma{' '}
              <span className="text-primary font-bold">sessao ativa e conectada</span>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Status Global</h4>
                  <p className="text-xs text-slate-500">Nenhuma sessao conectada foi encontrada.</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Sincronizacao</h4>
                  <p className="text-xs text-slate-500">
                    Aguardando uma conexao ativa para carregar os grupos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={openCreateSessionModal}
                className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
              >
                CONECTAR AGORA
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 rounded-2xl border-white/10 bg-white/5 text-white font-bold text-lg hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3"
                onClick={() => loadSessionAndGroups(true).catch(() => undefined)}
              >
                <RefreshCw className="w-5 h-5" />
                VERIFICAR NOVAMENTE
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neon-gradient">
            Grupos de WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie seus grupos e comunidades do WhatsApp.
          </p>
        </div>
        <Button
          onClick={handleGlobalSync}
          disabled={isSyncing}
          className="w-full sm:w-auto bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 neon-border min-w-[140px]"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card/40 border border-primary/20 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-primary/10 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 md:flex-none border-primary/20 hover:bg-primary/10"
          >
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredGroups.map((group) => {
          return (
            <Card
              key={group.id}
              onClick={() => handleSync(group)}
              className={cn(
                'cursor-pointer hover:border-primary/50 transition-all bg-card/40 backdrop-blur-md border-primary/20 overflow-hidden group',
                group.isAdmin && 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
              )}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full overflow-hidden border bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                        group.isAdmin
                          ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'border-primary/30',
                      )}
                    >
                      {group.photo ? (
                        <img src={group.photo} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className={cn('w-6 h-6', group.isAdmin ? 'text-amber-500' : 'text-primary')} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate">{group.name}</h3>
                        {group.isAdmin && (
                          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                            <Shield className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {group.memberCount} membros
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {group.messageCount} mensagens
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-primary/20">
          <MessageSquare className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Nenhum grupo encontrado</h3>
          <p className="text-sm text-muted-foreground/60">Tente ajustar seus filtros de busca.</p>
        </div>
      )}

      {/* Modal de Detalhes do Grupo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin-slow" />
              Detalhes do Grupo
            </DialogTitle>
            <DialogDescription>Informações completas e opções de sincronização.</DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shrink-0 mx-auto md:mx-0">
                  {selectedGroup.photo ? (
                    <img
                      src={selectedGroup.photo}
                      alt={selectedGroup.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-12 h-12 text-primary" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedGroup.name}</h2>
                    <p className="text-muted-foreground mt-1">
                      {selectedGroup.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                        Membros
                      </p>
                      <p className="text-xl font-bold">{getMemberData(selectedGroup).length}</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                        Mensagens
                      </p>
                      <p className="text-xl font-bold">{selectedGroup.messageCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold flex items-center gap-2 text-primary/80">
                    <Shield className="w-4 h-4" /> Admins
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.admins
                      .map((admin) => ({ jid: admin, phone: formatMemberPhone(admin) }))
                      .filter((a) => a.phone)
                      .map(({ jid, phone }) => (
                        <Badge key={jid} variant="outline" className="bg-primary/5 border-primary/20">
                          {phone}
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold flex items-center gap-2 text-primary/80">
                      <Users className="w-4 h-4" /> Membros
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary h-auto p-0 hover:bg-transparent underline underline-offset-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMembersModalOpen(true);
                      }}
                    >
                      Ver Tudo
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.members.slice(0, 5).map((member, idx) => {
                      const phone = formatMemberPhone(member);
                      if (!phone) return null;
                      return (
                        <Badge key={idx} variant="outline" className="bg-muted/20 border-muted/30">
                          {phone}
                        </Badge>
                      );
                    })}
                    {getMemberData(selectedGroup).length > 5 && (
                      <Badge variant="outline" className="bg-muted/20 border-muted/30 text-muted-foreground">
                        +{getMemberData(selectedGroup).length - 5} outros
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" /> Opções de Contatos
                  </h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsSaveAgendaModalOpen(true)}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 neon-border flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar contatos para agenda
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleExport('csv')}
                    className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 h-12"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    Exportar para CSV (Interno)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('excel')}
                    className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 h-12"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                    Exportar para EXCEL (Interno)
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Os arquivos serão gerados com os números em formato internacional limpo (apenas dígitos),
                  prontos para serem processados internamente.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleSyncGroup}
              disabled={isSyncingGroup}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isSyncingGroup && 'animate-spin')} />
              {isSyncingGroup ? 'Sincronizando...' : 'Sincronizar Agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Todos os Membros */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Todos os Membros
            </DialogTitle>
            <DialogDescription>
              {selectedGroup && (
                <>
                  Lista completa de participantes do grupo {selectedGroup.name}.{' '}
                  <span className="font-semibold">
                    {getMemberData(selectedGroup).length} membros encontrados.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-1 mt-4">
            {selectedGroup &&
              getMemberData(selectedGroup).map((member, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="text-sm font-semibold font-mono">{member.displayPhone}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.isAdmin ? (
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] h-5 px-2 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> ADMIN
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                          Participante
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMembersModalOpen(false)}>
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Salvar para Agenda */}
      <Dialog open={isSaveAgendaModalOpen} onOpenChange={setIsSaveAgendaModalOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Importação em Massa
            </DialogTitle>
            <DialogDescription>
              Crie uma nova lista de contatos a partir dos membros deste grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome da Lista</label>
              <Input
                placeholder="Ex: Leads VIP - Grupo Vendas SP"
                value={agendaName}
                onChange={(e) => setAgendaName(e.target.value)}
                className="bg-card border-primary/20 focus:ring-primary/40"
              />
              <p className="text-[10px] text-muted-foreground italic">
                * Todos os {selectedGroup && getMemberData(selectedGroup).filter(m => m.cleanPhone).length} contatos com telefone identificado serão
                salvos com a tag do grupo.
              </p>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h5 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> O que será feito:
              </h5>
              <ul className="text-xs space-y-1.5 text-muted-foreground">
                <li>• Identificação de números válidos</li>
                <li>• Formatação para padrão internacional (55...)</li>
                <li>• Atribuição automática de Tags</li>
                <li>• Sincronização com o Kanban de Contatos</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-between items-center gap-4">
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Tempo estimado: &lt; 30 segundos
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsSaveAgendaModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveToAgenda}
                disabled={isSaving || !agendaName.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Agora
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
