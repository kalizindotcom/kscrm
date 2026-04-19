import React, { useState } from 'react';
import { LiveConversation } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MessageSquare, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatListProps {
  conversations: LiveConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ conversations, selectedId, onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c => 
    c.contactName.toLowerCase().includes(search.toLowerCase()) || 
    c.phoneNumber.includes(search)
  );

  return (
    <div className="flex flex-col h-full bg-card/10">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Conversas
          </h3>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
          </div>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none text-white placeholder:text-slate-600 font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
        <AnimatePresence mode="popLayout">
          {filtered.map((chat) => (
            <motion.button
              key={chat.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onSelect(chat.id)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative group",
                selectedId === chat.id 
                  ? "bg-primary/20 border border-primary/20 shadow-lg shadow-primary/5" 
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              {selectedId === chat.id && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_hsla(var(--primary),0.8)]"
                />
              )}
              
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden">
                  {chat.avatar ? (
                    <img src={chat.avatar} alt={chat.contactName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                      {chat.contactName[0]}
                    </div>
                  )}
                </div>
                {chat.status === 'active' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                )}
                {chat.status === 'error' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-start mb-0.5">
                  <h4 className={cn(
                    "font-bold text-sm truncate transition-colors",
                    selectedId === chat.id ? "text-white" : "text-slate-200 group-hover:text-white"
                  )}>
                    {chat.contactName}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0">
                    {chat.lastMessageTime && format(new Date(chat.lastMessageTime), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate leading-relaxed">
                  {chat.lastMessage}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg shadow-primary/20">
                      {chat.unreadCount}
                    </span>
                  )}
                  {chat.tags.slice(0, 1).map(tag => (
                    <span key={tag} className="text-[9px] font-bold text-primary/80 bg-primary/5 border border-primary/10 px-1.5 rounded uppercase tracking-tighter">
                      {tag}
                    </span>
                  ))}
                  <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-1.5 rounded uppercase tracking-tighter ml-auto">
                    {chat.origin}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
