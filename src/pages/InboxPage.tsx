import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquare,
  User,
  MessageCircle,
  Plus,
  Send,
  History,
  LayoutGrid,
  Trash
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { mockConversations } from '../mock/data';
import { cn, formatDate } from '../lib/utils';
import { Conversation } from '../types';
import { NewMessageModal } from '../components/messages/NewMessageModal';
import { ConversationDetailModal } from '../components/messages/ConversationDetailModal';

const MessageCard = ({ 
  conv, 
  onOpen,
  onDelete
}: { 
  conv: Conversation, 
  onOpen: (c: Conversation) => void,
  onDelete: (id: string) => void
}) => {
  return (
    <div 
      className="bg-card/40 backdrop-blur-md border border-primary/10 rounded-2xl p-4 hover:border-primary/30 hover:bg-primary/5 hover:translate-x-1 transition-all duration-300 cursor-pointer group relative flex items-center gap-4"
    >
      <div 
        onClick={() => onOpen(conv)}
        className="flex-1 flex items-center gap-4 min-w-0"
      >
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
            {conv.avatar ? (
              <img src={conv.avatar} alt={conv.contactName} className="w-full h-full object-cover" />
            ) : (
              conv.isGroup ? <LayoutGrid className="w-6 h-6" /> : <User className="w-6 h-6" />
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
            <p className="text-xs text-muted-foreground truncate italic flex-1 opacity-80">
              {conv.lastMessage}
            </p>
            {conv.campaignName && (
              <Badge variant="outline" className="text-[8px] h-4 border-secondary/20 text-secondary uppercase px-1.5 py-0 bg-secondary/5 font-bold">
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
  const [localConversations, setLocalConversations] = useState<Conversation[]>(mockConversations);

  const handleDeleteConversation = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conversa?')) {
      setLocalConversations(prev => prev.filter(c => c.id !== id));
      toast.error('Conversa excluída');
    }
  };

  // Filter conversations based on tab and search
  const conversations = localConversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone?.includes(search);
    
    if (activeTab === 'started') {
      // For demonstration, let's say "started" conversations are those without a campaignName 
      // or some other logic. I'll just use a mock flag if it existed, but for now I'll use a filter.
      return matchesSearch && !c.isGroup && c.id.length > 5; // just a mock logic
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-neon-gradient flex items-center gap-3">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Mensagens
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Gerencie suas conversas e inicie novos atendimentos.</p>
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs & Search */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <Card className="bg-card/30 backdrop-blur-xl border-primary/10 rounded-3xl p-2">
            <div className="grid grid-cols-2 gap-1">
              <button 
                onClick={() => setActiveTab('general')}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all",
                  activeTab === 'general' 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                GERAIS
              </button>
              <button 
                onClick={() => setActiveTab('started')}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all",
                  activeTab === 'started' 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
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
              Estatísticas Rápidas
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs text-muted-foreground">Abertas hoje</span>
                <span className="text-lg font-black text-primary">24</span>
              </div>
              <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[70%]" />
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-muted-foreground">Tempo médio</span>
                <span className="text-lg font-black text-secondary">4m 20s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 space-y-4 min-h-[500px]">
          {conversations.length > 0 ? (
            conversations.map((conv, index) => (
              <div 
                key={conv.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MessageCard 
                  conv={conv} 
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
              <p className="text-muted-foreground font-bold text-lg">Nenhuma mensagem aqui.</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Experimente mudar o filtro ou buscar outro termo.</p>
            </div>
          )}
        </div>
      </div>

      <NewMessageModal 
        isOpen={isNewMessageModalOpen} 
        onClose={() => setIsNewMessageModalOpen(false)} 
      />

      {selectedConversation && (
        <ConversationDetailModal 
          conversation={selectedConversation}
          isOpen={!!selectedConversation}
          onClose={() => setSelectedConversation(null)}
          onDelete={handleDeleteConversation}
        />
      )}
    </div>
  );
};
