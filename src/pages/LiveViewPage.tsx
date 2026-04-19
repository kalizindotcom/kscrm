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
import { Loader2, ChevronLeft } from 'lucide-react';
import { LiveViewModals } from '@/components/live-view/LiveViewModals';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';


export const LiveViewPage: React.FC = () => {
  const { sessions, selectedSessionId, selectSession } = useSessionStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LiveConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [modals, setModals] = useState({
    import: false,
    download: false,
    audio: false,
    history: false,
    block: false,
    attachment: false,
    campaign: false
  });


  const handleOpenModal = (modal: keyof typeof modals) => {
    if (modal === 'attachment') {
      fileInputRef.current?.click();
      return;
    }
    setModals(prev => ({ ...prev, [modal]: true }));
  };

  const handleCloseModal = (modal: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast.success(`${e.target.files.length} arquivo(s) selecionado(s) para envio.`);
      // In a real app, we would upload these.
      // For now, we'll just add a fake message
      if (selectedChatId) {
        handleSendMessage(selectedChatId, `📎 Enviou ${e.target.files.length} anexo(s)`);
      }
    }
  };

  const handleSendMessage = async (chatId: string, content: string) => {
    const msgId = Math.random().toString(36).substr(2, 9);
    const newMessage: LiveConversation['messages'][0] = {
      id: msgId,
      content,
      fromMe: true,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setConversations(prev => prev.map(conv =>
      conv.id === chatId
        ? { ...conv, messages: [...conv.messages, newMessage], lastMessage: content, lastMessageTime: newMessage.timestamp }
        : conv
    ));

    try {
      const conv = conversations.find(c => c.id === chatId);
      await apiClient.post('/api/messages/send', {
        sessionId: activeSession?.id,
        phone: conv?.phoneNumber,
        content,
      });
      setConversations(prev => prev.map(conv =>
        conv.id === chatId
          ? { ...conv, messages: conv.messages.map(m => m.id === msgId ? { ...m, status: 'sent' } : m) }
          : conv
      ));
    } catch {
      setConversations(prev => prev.map(conv =>
        conv.id === chatId
          ? { ...conv, messages: conv.messages.map(m => m.id === msgId ? { ...m, status: 'failed', error: 'Falha ao enviar' } : m) }
          : conv
      ));
    }
  };

  const handleRetryMessage = (chatId: string, messageId: string) => {
    const conv = conversations.find(c => c.id === chatId);
    const msg = conv?.messages.find(m => m.id === messageId);
    if (!msg) return;
    handleSendMessage(chatId, msg.content);
  };

  const activeSession = sessions.find(s => s.status === 'connected') ||
                       sessions.find(s => s.id === selectedSessionId) ||
                       null;

  useEffect(() => {
    conversationService.list()
      .then(convs => {
        const live: LiveConversation[] = convs.map(c => ({
          id: c.id,
          contactName: c.contactName,
          phoneNumber: c.phone ?? '',
          avatar: c.avatar,
          lastMessage: c.lastMessage,
          lastMessageTime: c.updatedAt,
          unreadCount: c.unreadCount,
          status: c.status === 'resolved' ? 'archived' : 'active',
          origin: 'direct' as const,
          tags: [],
          messages: [],
          metrics: { totalSent: 0, totalReceived: 0, avgResponseTime: '—', responseRate: '—', failureCount: 0 },
        }));
        setConversations(live);
      })
      .catch(() => setConversations([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChatId) return;
    conversationService.getMessages(selectedChatId, { limit: 50 })
      .then(msgs => {
        const liveMsgs: LiveMessage[] = msgs.map(m => ({
          id: m.id,
          content: m.content,
          timestamp: m.timestamp,
          status: m.status as LiveMessage['status'],
          type: (m.type === 'image' || m.type === 'file') ? m.type : 'text',
          fromMe: m.direction === 'outbound',
        }));
        setConversations(prev => prev.map(c =>
          c.id === selectedChatId ? { ...c, messages: liveMsgs } : c
        ));
      })
      .catch(() => {});
  }, [selectedChatId]);

  const selectedChat = conversations.find(c => c.id === selectedChatId) || null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
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
      <SessionHeader session={activeSession} />
      
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        <div className={cn(
          "w-full md:w-80 lg:w-96 flex flex-col bg-card/30 backdrop-blur-md border border-primary/10 rounded-2xl overflow-hidden shrink-0 shadow-2xl transition-all",
          selectedChatId ? "hidden md:flex" : "flex"
        )}>
          <ChatList 
            conversations={conversations} 
            selectedId={selectedChatId} 
            onSelect={setSelectedChatId} 
          />
        </div>

        <main className={cn(
          "flex-1 flex bg-card/30 backdrop-blur-md border border-primary/10 rounded-2xl overflow-hidden shadow-2xl relative",
          !selectedChatId ? "hidden md:flex" : "flex"
        )}>
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
                    onSendMessage={(content) => handleSendMessage(selectedChat.id, content)}
                    onRetryMessage={(msgId) => handleRetryMessage(selectedChat.id, msgId)}
                    onOpenModal={handleOpenModal}
                  />
                </div>
                <div className="hidden xl:block w-80 border-l border-primary/10 bg-black/20">
                  <ContactSidebar 
                    conversation={selectedChat} 
                    onOpenModal={handleOpenModal}
                  />
                </div>

              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8"
              >
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

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        multiple 
      />

      {selectedChat && (
        <LiveViewModals 
          conversation={selectedChat}
          modals={modals}
          onClose={handleCloseModal}
        />
      )}
    </div>

  );
};
