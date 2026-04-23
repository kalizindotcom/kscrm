import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  User,
  MessageCircle,
  Plus,
  History,
  LayoutGrid,
  Trash,
  ShieldAlert,
  Zap,
  Globe,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, Button, Badge } from '../components/ui/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { cn, formatDate } from '../lib/utils';
import { Conversation } from '../types';
import { NewMessageModal } from '../components/messages/NewMessageModal';
import { ConversationDetailModal } from '../components/messages/ConversationDetailModal';
import { conversationService } from '../services/conversationService';
import { useSessionStore } from '../store/useSessionStore';
import { sessionService } from '../services/sessionService';

const MessageCard = ({
  conv,
  onOpen,
  onDelete,
}: {
  conv: Conversation;
  onOpen: (c: Conversation) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="bg-card/40 backdrop-blur-md border border-primary/10 rounded-2xl p-4 hover:border-primary/30 hover:bg-primary/5 hover:translate-x-1 transition-all duration-300 cursor-pointer group relative flex items-center gap-4">
      <div onClick={() => onOpen(conv)} className="flex-1 flex items-center gap-4 min-w-0">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
            {conv.avatar ? (
              <img src={conv.avatar} alt={conv.contactName} className="w-full h-full object-cover" />
            ) : conv.isGroup ? (
              <LayoutGrid className="w-6 h-6" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          {conv.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-primary text-[10px] text-primary-foreground items-center justify-center font-bold">
                {conv.unreadCount}
              </span>
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
              {conv.contactName}
            </h3>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/30 px-2 py-0.5 rounded-full border border-primary/5">
              {formatDate(conv.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground truncate italic flex-1 opacity-80">{conv.lastMessage}</p>
            {conv.campaignName && (
              <Badge
                variant="outline"
                className="text-[8px] h-4 border-secondary/20 text-secondary uppercase px-1.5 py-0 bg-secondary/5 font-bold"
              >
                {conv.campaignName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={conv.status === 'open' ? 'default' : 'success'} className="text-[10px] px-2 py-0.5 h-5 font-bold">
          {conv.status === 'open' ? 'Aberto' : 'Resolvido'}
        </Badge>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv.id);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all border border-destructive/20"
          >
            <Trash className="w-5 h-5" />
          </button>
          <div
            onClick={() => onOpen(conv)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all"
          >
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const InboxPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'started'>('general');
  const [search, setSearch] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { sessions, setSessions, selectedSessionId, openCreateSessionModal } = useSessionStore();

  const resolveActiveSessionId = (sessionList = sessions) => {
    const selectedConnected =
      selectedSessionId != null
        ? sessionList.find((session) => session.id === selectedSessionId && session.status === 'connected')
        : null;
    return selectedConnected?.id ?? sessionList.find((session) => session.status === 'connected')?.id ?? null;
  };

  const loadSessionConversations = async () => {
    setIsLoading(true);

    let sessionList = sessions;
    try {
      sessionList = await sessionService.list();
      setSessions(sessionList);
    } catch {
      // fail-closed: if backend sessions cannot be validated, force empty state
      setSessions([]);
      setActiveSessionId(null);
      setLocalConversations([]);
      setIsLoading(false);
      return;
    }

    const sessionId = resolveActiveSessionId(sessionList);
    setActiveSessionId(sessionId);

    if (!sessionId) {
      setLocalConversations([]);
      setIsLoading(false);
      return;
    }

    const conversations = await conversationService.list({ sessionId });
    setLocalConversations(conversations);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSessionConversations().catch(() => {
      setActiveSessionId(null);
      setLocalConversations([]);
      setIsLoading(false);
    });
    const interval = setInterval(() => {
      loadSessionConversations().catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  const handleDeleteConversation = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await conversationService.delete(id);
      setLocalConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success('Conversa excluída.');
    } catch {
      toast.error('Falha ao excluir a conversa.');
    }
  };

  const conversations = localConversations.filter((conversation) => {
    const matchesSearch =
      conversation.contactName.toLowerCase().includes(search.toLowerCase()) || conversation.phone?.includes(search);

    if (activeTab === 'started') {
      return matchesSearch && !conversation.isGroup;
    }

    return matchesSearch;
  });

  const today = new Date().toDateString();
  const openedToday = localConversations.filter(
    (conversation) => conversation.status === 'open' && new Date(conversation.updatedAt).toDateString() === today,
  ).length;

  const avgMinutesSinceUpdate =
    localConversations.length > 0
      ? Math.round(
          localConversations.reduce((sum, conversation) => {
            const minutes = Math.max(0, (Date.now() - new Date(conversation.updatedAt).getTime()) / 60000);
            return sum + minutes;
          }, 0) / localConversations.length,
        )
      : 0;

  const hasNoConversationsInActiveSession = !!activeSessionId && localConversations.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-neon-gradient flex items-center gap-3">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Mensagens
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Conversas reais da sessao conectada atualmente.
          </p>
        </div>

        <Button
          onClick={() => setIsNewMessageModalOpen(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black px-4 sm:px-6 py-4 sm:py-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.5)] transition-all active:scale-95 group"
        >
          <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-xs sm:text-base">NOVA MENSAGEM</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando conversas da sessao ativa...
          </div>
        </div>
      ) : !activeSessionId || hasNoConversationsInActiveSession ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
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
                {!activeSessionId ? 'Mensagens Indisponiveis' : 'Nenhuma Conversa na Sessao Ativa'}
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                {!activeSessionId
                  ? 'Para acessar mensagens em tempo real, conecte uma sessao ativa.'
                  : 'A sessao esta conectada, mas ainda nao existem conversas registradas.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Status Global</h4>
                    <p className="text-xs text-slate-500">
                      {!activeSessionId ? 'Nenhuma sessao conectada encontrada.' : 'Sessao ativa sem historico ainda.'}
                    </p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Auto-Sincronizacao</h4>
                    <p className="text-xs text-slate-500">Aguardando novas mensagens da sessao selecionada.</p>
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
                  onClick={() => loadSessionConversations().catch(() => undefined)}
                >
                  <RefreshCw className="w-5 h-5" />
                  VERIFICAR NOVAMENTE
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <Card className="bg-card/30 backdrop-blur-xl border-primary/10 rounded-3xl p-2">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all',
                    activeTab === 'general'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-primary',
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  GERAIS
                </button>
                <button
                  onClick={() => setActiveTab('started')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all',
                    activeTab === 'started'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-primary',
                  )}
                >
                  <History className="w-4 h-4" />
                  INICIADAS
                </button>
              </div>
            </Card>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="w-full bg-card/40 border border-primary/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/30 focus:bg-primary/5 transition-all outline-none font-medium"
              />
            </div>

            <div className="hidden lg:block p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Estatisticas da Sessao
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground">Abertas hoje</span>
                  <span className="text-lg font-black text-primary">{openedToday}</span>
                </div>
                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, (openedToday / Math.max(localConversations.length, 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground">Tempo medio</span>
                  <span className="text-lg font-black text-secondary">{avgMinutesSinceUpdate}m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-h-[500px]">
            {conversations.length > 0 ? (
              conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MessageCard
                    conv={conversation}
                    onOpen={setSelectedConversation}
                    onDelete={handleDeleteConversation}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-card/20 rounded-[40px] border-2 border-dashed border-primary/10 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-primary/20" />
                  </div>
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl" />
                </div>
                <p className="text-muted-foreground font-bold text-lg">Nenhuma mensagem encontrada no filtro.</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Ajuste o filtro ou busque outro termo.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <NewMessageModal isOpen={isNewMessageModalOpen} onClose={() => setIsNewMessageModalOpen(false)} />

      {selectedConversation && (
        <ConversationDetailModal
          conversation={selectedConversation}
          isOpen={!!selectedConversation}
          onClose={() => setSelectedConversation(null)}
          onDelete={handleDeleteConversation}
        />
      )}

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conversa e todas as mensagens serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteConversation}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
