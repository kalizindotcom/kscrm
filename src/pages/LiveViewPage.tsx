import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { SessionHeader } from '@/components/live-view/SessionHeader';
import { ChatList } from '@/components/live-view/ChatList';
import { ChatWindow } from '@/components/live-view/ChatWindow';
import { ContactSidebar } from '@/components/live-view/ContactSidebar';
import { EmptyState } from '@/components/live-view/EmptyState';
import { LiveConversation, LiveMessage } from '@/components/live-view/types';
import { motion, AnimatePresence } from 'framer-motion';
import { conversationService } from '@/services/conversationService';
import { apiClient } from '@/services/apiClient';
import { getSocket, subscribe, unsubscribe } from '@/services/wsClient';
import { Loader2, ChevronLeft, X, Send } from 'lucide-react';
import { LiveViewModals } from '@/components/live-view/LiveViewModals';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { playMessageSound } from '@/lib/notificationSound';

export const LiveViewPage: React.FC = () => {
  const { sessions, selectedSessionId } = useSessionStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const [conversations, setConversations] = useState<LiveConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvMsg, setNewConvMsg] = useState('');
  const [sendingNewConv, setSendingNewConv] = useState(false);
  const initialLoaded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modals, setModals] = useState({
    import: false,
    download: false,
    audio: false,
    history: false,
    block: false,
    attachment: false,
    campaign: false,
  });

  // Keep ref in sync so WebSocket handlers always see current value without stale closure
  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  const activeSession =
    sessions.find((s) => s.status === 'connected') || sessions.find((s) => s.id === selectedSessionId) || null;

  const formatPhoneDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return raw;
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
    return `+${normalized}`;
  };

  const reloadSelectedMessages = async (chatId: string, cursor?: string) => {
    try {
      const msgs = await conversationService.getMessages(chatId, { limit: 50, before: cursor });
      return [...msgs]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((m: any) => ({
          id: m.id,
          content: m.content,
          timestamp: m.timestamp,
          status: m.status as LiveMessage['status'],
          type: m.type as LiveMessage['type'],
          fromMe: m.direction === 'outbound',
          senderName: m.senderName ?? undefined,
          senderPhone: m.senderPhone ?? undefined,
          mediaUrl: m.mediaUrl ?? undefined,
          mediaMime: m.mediaMime ?? undefined,
          replyTo: m.replyToContent
            ? { id: '', content: m.replyToContent, fromMe: m.replyToFromMe ?? false }
            : undefined,
        }));
    } catch {
      return null;
    }
  };

  const handleOpenModal = (modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: true }));
  };

  const handleCloseModal = (modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: false }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast.success(`${e.target.files.length} arquivo(s) selecionado(s) para envio.`);
      if (selectedChatId) {
        handleSendMessage(selectedChatId, `Anexo enviado (${e.target.files.length})`);
      }
    }
  };

  const handleSendMessage = async (chatId: string, content: string, replyToId?: string) => {
    const msgId = Math.random().toString(36).slice(2, 11);
    const newMessage: LiveConversation['messages'][0] = {
      id: msgId,
      content,
      fromMe: true,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === chatId
          ? { ...conv, messages: [...conv.messages, newMessage], lastMessage: content, lastMessageTime: newMessage.timestamp }
          : conv,
      ),
    );

    try {
      const conv = conversations.find((c) => c.id === chatId);
      const targetPhone = conv?.rawPhone || conv?.phoneNumber;
      if (!activeSession?.id || !targetPhone) throw new Error('Conversa sem destino válido');

      const phone = conv?.isGroup ? `${targetPhone}@g.us` : targetPhone;
      await apiClient.post('/api/messages/send', {
        sessionId: activeSession.id,
        phone,
        content,
        ...(replyToId ? { quotedMessageId: replyToId } : {}),
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === chatId ? { ...conv, messages: conv.messages.map((m) => (m.id === msgId ? { ...m, status: 'sent' } : m)) } : conv,
        ),
      );

      const freshMsgs = await reloadSelectedMessages(chatId);
      if (freshMsgs) {
        setConversations((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: freshMsgs } : c)));
      }
    } catch (error: any) {
      const message = typeof error?.message === 'string' && error.message
        ? error.message.includes('rate/min exceeded')
          ? 'Limite por minuto atingido. Aguarde alguns segundos.'
          : error.message
        : 'Falha ao enviar';
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === chatId
            ? {
                ...conv,
                messages: conv.messages.map((m) => (m.id === msgId ? { ...m, status: 'failed', error: message } : m)),
              }
            : conv,
        ),
      );
    }
  };

  const handleRetryMessage = (chatId: string, messageId: string) => {
    const conv = conversations.find((c) => c.id === chatId);
    const msg = conv?.messages.find((m) => m.id === messageId);
    if (!msg) return;
    handleSendMessage(chatId, msg.content);
  };

  const handleLoadMore = async () => {
    if (!selectedChatId || isLoadingMore) return;
    const conv = conversations.find((c) => c.id === selectedChatId);
    if (!conv || !conv.hasMoreMessages) return;
    const oldest = conv.messages[0];
    if (!oldest) return;
    setIsLoadingMore(true);
    try {
      const older = await reloadSelectedMessages(selectedChatId, oldest.timestamp);
      if (older && older.length > 0) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedChatId
              ? { ...c, messages: [...older, ...c.messages], hasMoreMessages: older.length >= 50 }
              : c,
          ),
        );
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedChatId ? { ...c, hasMoreMessages: false } : c)),
        );
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleNewConversation = async () => {
    if (!newConvPhone.trim() || !newConvMsg.trim() || !activeSession?.id) return;
    setSendingNewConv(true);
    try {
      const phone = newConvPhone.replace(/\D/g, '');
      await apiClient.post('/api/messages/send', {
        sessionId: activeSession.id,
        phone,
        content: newConvMsg,
      });
      toast.success('Mensagem enviada! A conversa aparecerá em breve.');
      setShowNewConv(false);
      setNewConvPhone('');
      setNewConvMsg('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao iniciar conversa');
    } finally {
      setSendingNewConv(false);
    }
  };

  const handleShowLogs = async () => {
    if (!activeSession?.id) return;
    try {
      const logs = await apiClient.get(`/api/sessions/${activeSession.id}/logs`);
      setSessionLogs((logs as any)?.slice(0, 50) ?? []);
      setShowLogs(true);
    } catch {
      toast.error('Erro ao carregar logs');
    }
  };

  useEffect(() => {
    initialLoaded.current = false;
  }, [activeSession?.id]);

  useEffect(() => {
    const loadConversations = async (showLoader: boolean) => {
      if (!activeSession?.id) {
        setConversations([]);
        setSelectedChatId(null);
        setIsLoading(false);
        initialLoaded.current = true;
        return;
      }

      if (showLoader) setIsLoading(true);
      try {
        const convs = await conversationService.list({ sessionId: activeSession.id });

        setConversations((prev) => {
          const byId = new Map(prev.map((item) => [item.id, item]));
          return convs.map((c) => {
            const previous = byId.get(c.id);
            const isGroup = !!c.isGroup;

            // Compute real metrics from existing messages if available
            const existingMsgs = previous?.messages ?? [];
            const totalSent = existingMsgs.filter((m) => m.fromMe).length;
            const totalReceived = existingMsgs.filter((m) => !m.fromMe).length;
            const responseRate = totalSent + totalReceived > 0
              ? `${Math.round((totalReceived / (totalSent + totalReceived)) * 100)}%`
              : '—';

            return {
              id: c.id,
              contactName: c.contactName,
              phoneNumber: isGroup ? c.phone ?? '' : formatPhoneDisplay(c.phone ?? ''),
              rawPhone: c.phone ?? '',
              isGroup,
              avatar: c.avatar,
              lastMessage: c.lastMessage || (isGroup ? 'Toque para abrir mensagens do grupo' : ''),
              lastMessageTime: c.updatedAt,
              createdAt: c.createdAt,
              unreadCount: c.unreadCount,
              status: c.status === 'resolved' ? 'archived' : 'active',
              origin: isGroup ? 'api' : 'direct',
              tags: isGroup ? ['grupo'] : [],
              messages: previous?.messages ?? [],
              hasMoreMessages: previous?.hasMoreMessages,
              metrics: {
                totalSent: previous ? totalSent : 0,
                totalReceived: previous ? totalReceived : 0,
                avgResponseTime: '—',
                responseRate: previous ? responseRate : '—',
                failureCount: 0,
              },
            } as LiveConversation;
          });
        });
        setLastUpdated(new Date());
      } catch {
        // keep existing state on transient failures
      } finally {
        if (showLoader) setIsLoading(false);
        initialLoaded.current = true;
      }
    };

    loadConversations(true).catch(() => undefined);
    const interval = setInterval(() => {
      loadConversations(false).catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  useEffect(() => {
    if (!selectedChatId) return;
    reloadSelectedMessages(selectedChatId).then((msgs) => {
      if (!msgs) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedChatId ? { ...c, messages: msgs, hasMoreMessages: msgs.length >= 50 } : c)),
      );
    });
    apiClient.patch(`/api/conversations/${selectedChatId}`, { unreadCount: 0 }).catch(() => undefined);
    setConversations((prev) => prev.map((c) => (c.id === selectedChatId ? { ...c, unreadCount: 0 } : c)));
  }, [selectedChatId]);

  // WebSocket
  useEffect(() => {
    if (!activeSession?.id) return;
    const socket = getSocket();
    subscribe(`session:${activeSession.id}`);

    const handleNewMessage = (event: any) => {
      const { conversationId, message } = event;
      if (!conversationId || !message) return;

      const livMsg: LiveMessage = {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        status: message.status,
        type: message.type as LiveMessage['type'],
        fromMe: message.direction === 'outbound',
        senderName: message.senderName ?? undefined,
        senderPhone: message.senderPhone ?? undefined,
        mediaUrl: message.mediaUrl ?? undefined,
        replyTo: message.replyToContent
          ? { id: '', content: message.replyToContent, fromMe: message.replyToFromMe ?? false }
          : undefined,
      };

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversationId);
        if (!exists) return prev;
        const msgAlreadyExists = exists.messages.some((m) => m.id === message.id);
        if (msgAlreadyExists) return prev;
        const isSelected = selectedChatIdRef.current === conversationId;
        const lastMsgPreview = exists.isGroup && message.senderName
          ? `~${message.senderName}: ${message.content}`
          : message.content;

        // play notification sound for inbound messages not currently open
        if (message.direction === 'inbound' && !isSelected) {
          playMessageSound();
        }

        return prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, livMsg],
                lastMessage: lastMsgPreview,
                lastMessageTime: message.timestamp,
                unreadCount: message.direction === 'inbound' && !isSelected ? c.unreadCount + 1 : c.unreadCount,
              }
            : c,
        );
      });
    };

    const handleStatusUpdate = (event: any) => {
      const { conversationId, messageId, status } = event;
      if (!conversationId || !messageId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, status } : m)) }
            : c,
        ),
      );
    };

    // On reconnect: re-subscribe and reload to recover any missed messages
    const handleReconnect = () => {
      subscribe(`session:${activeSession.id}`);
      if (selectedChatIdRef.current) {
        subscribe(`conversation:${selectedChatIdRef.current}`);
        reloadSelectedMessages(selectedChatIdRef.current).then((msgs) => {
          if (!msgs) return;
          const chatId = selectedChatIdRef.current!;
          setConversations((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, messages: msgs } : c)),
          );
        });
      }
    };

    socket.on('message.new', handleNewMessage);
    socket.on('message.status_update', handleStatusUpdate);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('message.new', handleNewMessage);
      socket.off('message.status_update', handleStatusUpdate);
      socket.off('reconnect', handleReconnect);
      unsubscribe(`session:${activeSession.id}`);
    };
  }, [activeSession?.id]);

  useEffect(() => {
    if (!selectedChatId) return;
    subscribe(`conversation:${selectedChatId}`);
    return () => unsubscribe(`conversation:${selectedChatId}`);
  }, [selectedChatId]);

  // Tab title badge for unread messages
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) Live-View — Ks Leads` : 'Live-View — Ks Leads';
    return () => { document.title = 'Ks Leads'; };
  }, [conversations]);

  const selectedChat = conversations.find((c) => c.id === selectedChatId) || null;

  // After media is sent via modal, reload messages for the selected chat
  const handleMediaSent = () => {
    if (selectedChatId) {
      reloadSelectedMessages(selectedChatId).then((msgs) => {
        if (!msgs) return;
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedChatId ? { ...c, messages: msgs } : c)),
        );
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mb-4">
          <Loader2 className="w-12 h-12 text-primary drop-shadow-[0_0_15px_hsla(var(--primary),0.5)]" />
        </motion.div>
        <p className="text-muted-foreground animate-pulse font-medium">Sincronizando Live Gateway...</p>
      </div>
    );
  }

  if (!activeSession) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-140px)] gap-4 animate-in fade-in duration-500">
      <SessionHeader
        session={activeSession}
        totalConversations={conversations.length}
        lastUpdated={lastUpdated}
        onShowLogs={handleShowLogs}
      />

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 flex flex-col bg-card/30 backdrop-blur-md border border-primary/10 rounded-2xl overflow-hidden shrink-0 shadow-2xl transition-all',
            selectedChatId ? 'hidden md:flex' : 'flex',
          )}
        >
          <ChatList
            conversations={conversations}
            selectedId={selectedChatId}
            onSelect={setSelectedChatId}
            onNewConversation={() => setShowNewConv(true)}
          />
        </div>

        <main
          className={cn(
            'flex-1 flex bg-card/30 backdrop-blur-md border border-primary/10 rounded-2xl overflow-hidden shadow-2xl relative',
            !selectedChatId ? 'hidden md:flex' : 'flex',
          )}
        >
          {selectedChatId && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 left-4 z-50 md:hidden bg-background/50 backdrop-blur-md border border-primary/10 rounded-full h-10 w-10 p-0"
              onClick={() => setSelectedChatId(null)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div
                key={selectedChat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex overflow-hidden"
              >
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ChatWindow
                    conversation={selectedChat}
                    activeSessionId={activeSession.id}
                    onSendMessage={(content, replyToId) => handleSendMessage(selectedChat.id, content, replyToId)}
                    onRetryMessage={(msgId) => handleRetryMessage(selectedChat.id, msgId)}
                    onOpenModal={handleOpenModal}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                  />
                </div>
                <div className="hidden xl:block w-80 border-l border-primary/10 bg-black/20">
                  <ContactSidebar conversation={selectedChat} onOpenModal={handleOpenModal} />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Selecione uma conversa</h3>
                <p className="text-slate-400 max-w-xs">Escolha um contato na lista para monitorar as mensagens e interações em tempo real.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />

      {selectedChat && (
        <LiveViewModals
          conversation={selectedChat}
          activeSessionId={activeSession.id}
          modals={modals}
          onClose={handleCloseModal}
          onMediaSent={handleMediaSent}
        />
      )}

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowNewConv(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-primary/20 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white">Nova Conversa</h3>
                <button onClick={() => setShowNewConv(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Número de telefone</label>
                  <input
                    type="text"
                    placeholder="5511999999999 (com DDI)"
                    value={newConvPhone}
                    onChange={(e) => setNewConvPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Primeira mensagem</label>
                  <textarea
                    placeholder="Digite a mensagem inicial..."
                    value={newConvMsg}
                    onChange={(e) => setNewConvMsg(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600 resize-none"
                  />
                </div>
                <button
                  onClick={handleNewConversation}
                  disabled={sendingNewConv || !newConvPhone.trim() || !newConvMsg.trim()}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-black text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {sendingNewConv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingNewConv ? 'Enviando...' : 'Iniciar Conversa'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowLogs(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-primary/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">Logs da Sessão — {activeSession?.name}</h3>
                <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {sessionLogs.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-8">Nenhum log disponível.</p>
                ) : (
                  sessionLogs.map((log: any) => (
                    <div key={log.id} className={cn(
                      "flex gap-3 p-3 rounded-xl border text-xs",
                      log.severity === 'error' ? "bg-rose-500/10 border-rose-500/20" :
                      log.severity === 'success' ? "bg-emerald-500/10 border-emerald-500/20" :
                      "bg-white/5 border-white/10"
                    )}>
                      <span className={cn(
                        "font-black uppercase tracking-widest text-[9px] shrink-0 mt-0.5",
                        log.severity === 'error' ? "text-rose-500" :
                        log.severity === 'success' ? "text-emerald-500" :
                        "text-slate-500"
                      )}>{log.severity}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{log.message}</p>
                        <p className="text-slate-600 text-[10px] mt-0.5">
                          {log.type} · {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
