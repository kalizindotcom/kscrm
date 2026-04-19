import React, { useRef, useEffect, useState } from 'react';
import { LiveConversation, LiveMessage } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video,
  Info,
  Mic,
  Download,
  UserPlus,
  ArrowRight,
  Megaphone,
  MoreHorizontal,
  Trash2,
  Copy,
  Hash,
  X
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge, Button } from '@/components/ui/shared';
import { toast } from 'sonner';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface ChatWindowProps {
  conversation: LiveConversation;
  onSendMessage?: (content: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onOpenModal?: (modal: 'import' | 'download' | 'audio' | 'history' | 'block' | 'attachment' | 'campaign') => void;
}


export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversation, 
  onSendMessage,
  onRetryMessage,
  onOpenModal
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.messages]);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Mensagem copiada!');
  };

  const getStatusIcon = (status: LiveMessage['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3 text-slate-500" />;
      case 'sending': return <Clock className="w-3 h-3 text-slate-500 animate-spin" />;
      case 'sent': return <Check className="w-3 h-3 text-slate-500" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-slate-500" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-emerald-500" />;
      case 'replied': return <CheckCheck className="w-3 h-3 text-primary" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-rose-500" />;
      default: return null;
    }
  };


  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative">
      {/* WhatsApp style background overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
      
      {/* Header */}
      <div className="z-10 bg-card/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden">
            {conversation.avatar ? (
              <img src={conversation.avatar} alt={conversation.contactName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                {conversation.contactName[0]}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{conversation.contactName}</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> online
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            onClick={() => onOpenModal?.('campaign')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-[0_5px_15px_-5px_rgba(var(--primary),0.5)] transition-all active:scale-95 group text-[10px] uppercase tracking-wider"
          >
            <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-12 transition-transform">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            ENVIAR CAMPANHA
          </Button>
          <div className="w-px h-6 bg-white/5 mx-2" />
          <button 
            onClick={() => toast.info('Opções da conversa')}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 z-10"
      >
        <div className="flex justify-center mb-6">
          <span className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">
            Criptografado de ponta a ponta
          </span>
        </div>

        <AnimatePresence initial={false}>
          {conversation.messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full mb-4",
                msg.fromMe ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] sm:max-w-[70%] group relative flex flex-col",
                msg.fromMe ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "p-3 rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden",
                  msg.fromMe 
                    ? "bg-primary/20 border border-primary/20 text-white rounded-tr-none" 
                    : "bg-slate-800/80 backdrop-blur-sm border border-white/5 text-slate-100 rounded-tl-none"
                )}>
                  {/* Glow animation on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  {msg.fromMe && (
                    <div className="flex items-center gap-2 mb-1 opacity-50">
                      <span className="text-[9px] font-black uppercase tracking-tighter">Ks Leads Gateway</span>
                    </div>
                  )}
                  
                  <p className="text-sm leading-relaxed whitespace-pre-wrap relative z-10">{msg.content}</p>
                  
                  <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                    <span className="text-[9px] font-medium">
                      {format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}
                    </span>
                    {msg.fromMe && getStatusIcon(msg.status)}
                  </div>

                  {msg.status === 'failed' && (
                    <div className="mt-2 pt-2 border-t border-rose-500/20 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[10px] text-rose-400 font-bold">{msg.error}</span>
                      <button 
                        onClick={() => onRetryMessage?.(msg.id)}
                        className="ml-auto text-[10px] text-white bg-rose-500 hover:bg-rose-600 px-2 py-0.5 rounded-md transition-all font-bold shadow-lg shadow-rose-500/20"
                      >
                        REENVIAR
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Actions - Quick Overlay */}
                <div className={cn(
                  "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100",
                  msg.fromMe ? "mr-1" : "ml-1"
                )}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={msg.fromMe ? "end" : "start"} className="bg-slate-900/95 backdrop-blur-xl border-white/10 w-48">
                      <DropdownMenuItem onClick={() => copyToClipboard(msg.content)} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                        <Copy className="w-3.5 h-3.5" /> Copiar Mensagem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenModal?.('history')} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                        <Hash className="w-3.5 h-3.5" /> Ver no Histórico
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem onClick={() => onOpenModal?.('import')} className="gap-2 text-xs font-bold text-primary focus:bg-primary/20">
                        <UserPlus className="w-3.5 h-3.5" /> Importar Contato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenModal?.('campaign')} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                        <ArrowRight className="w-3.5 h-3.5" /> Enviar Campanha
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="gap-2 text-xs font-bold text-rose-500 focus:bg-rose-500/20">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir (Apenas UI)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}

        </AnimatePresence>
      </div>

      {/* Footer / Input */}
      <div className="z-10 bg-card/80 backdrop-blur-xl border-t border-white/5 p-4 flex items-center gap-2 relative">
        <div className="flex items-center gap-1">
          <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/10 active:scale-95"
              >
                <Smile className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="p-0 border-none bg-transparent shadow-none mb-2">
              <EmojiPicker 
                theme={Theme.DARK} 
                onEmojiClick={onEmojiClick}
                width={350}
                height={400}
                lazyLoadEmojis={true}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            onClick={() => onOpenModal?.('attachment')}
            className="p-2 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/10 active:scale-95"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button 
            onClick={() => onOpenModal?.('audio')}
            className="p-2 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/10 active:scale-95 group"
          >
            <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600"
          />
          
          {/* Progress bar effect on focus */}
          <div className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-300 rounded-full" style={{ width: message.length > 0 ? '100%' : '0%' }} />
        </div>

        <button 
          onClick={handleSend}
          disabled={!message.trim()}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90",
            message.trim() 
              ? "bg-primary text-white shadow-[0_0_20px_hsla(var(--primary),0.3)] scale-100" 
              : "bg-primary/20 text-primary opacity-50 scale-95 cursor-not-allowed"
          )}
        >
          <Send className={cn("w-5 h-5", message.trim() && "animate-in slide-in-from-left-2")} />
        </button>
      </div>

    </div>
  );
};
