import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Mic,
  UserPlus,
  ArrowRight,
  Megaphone,
  MoreHorizontal,
  Trash2,
  Copy,
  Hash,
  X,
  Reply,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Sticker,
  ChevronDown,
  Loader2,
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
  onSendMessage?: (content: string, replyToId?: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onOpenModal?: (modal: 'import' | 'download' | 'audio' | 'history' | 'block' | 'attachment' | 'campaign') => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const MediaBubble: React.FC<{ msg: LiveMessage }> = ({ msg }) => {
  if (msg.type === 'image') {
    return msg.mediaUrl ? (
      <img
        src={msg.mediaUrl}
        alt="imagem"
        className="max-w-[220px] rounded-xl mb-1 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(msg.mediaUrl, '_blank')}
      />
    ) : (
      <div className="flex items-center gap-2 text-slate-400 text-xs bg-white/5 rounded-xl p-3 mb-1">
        <ImageIcon className="w-4 h-4 shrink-0" />
        <span>Imagem</span>
      </div>
    );
  }
  if (msg.type === 'video') {
    return msg.mediaUrl ? (
      <video src={msg.mediaUrl} controls className="max-w-[220px] rounded-xl mb-1" />
    ) : (
      <div className="flex items-center gap-2 text-slate-400 text-xs bg-white/5 rounded-xl p-3 mb-1">
        <Film className="w-4 h-4 shrink-0" />
        <span>Vídeo</span>
      </div>
    );
  }
  if (msg.type === 'audio') {
    return msg.mediaUrl ? (
      <audio src={msg.mediaUrl} controls className="max-w-[220px] mb-1" />
    ) : (
      <div className="flex items-center gap-2 text-slate-400 text-xs bg-white/5 rounded-xl p-3 mb-1">
        <Music className="w-4 h-4 shrink-0" />
        <span>Áudio</span>
      </div>
    );
  }
  if (msg.type === 'document' || msg.type === 'file') {
    return (
      <div className="flex items-center gap-2 text-slate-200 text-xs bg-white/10 rounded-xl p-3 mb-1">
        <FileText className="w-4 h-4 shrink-0 text-primary" />
        <span className="truncate max-w-[160px]">{msg.content || 'Documento'}</span>
        {msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline text-[9px] font-bold uppercase">
            Abrir
          </a>
        )}
      </div>
    );
  }
  if (msg.type === 'sticker') {
    return msg.mediaUrl ? (
      <img src={msg.mediaUrl} alt="sticker" className="w-20 h-20 mb-1" />
    ) : (
      <div className="flex items-center gap-2 text-slate-400 text-xs bg-white/5 rounded-xl p-3 mb-1">
        <Sticker className="w-4 h-4 shrink-0" />
        <span>Sticker</span>
      </div>
    );
  }
  return null;
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onSendMessage,
  onRetryMessage,
  onOpenModal,
  onLoadMore,
  isLoadingMore,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<LiveMessage | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.id]);

  // Only auto-scroll when near bottom
  const prevMsgLen = useRef(conversation.messages.length);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (atBottom || conversation.messages.length !== prevMsgLen.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevMsgLen.current = conversation.messages.length;
  }, [conversation.messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!atBottom);

    // trigger load more when scrolled to top
    if (el.scrollTop < 60 && onLoadMore && !isLoadingMore && conversation.hasMoreMessages) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message, replyingTo?.id);
      setMessage('');
      setShowEmojiPicker(false);
      setReplyingTo(null);
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
    if (e.key === 'Escape') setReplyingTo(null);
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

  const isMedia = (type: LiveMessage['type']) =>
    ['image', 'video', 'audio', 'document', 'file', 'sticker'].includes(type);

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative">
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
            <p className="text-[10px] text-slate-500 font-bold">{conversation.phoneNumber}</p>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-xl border-white/10 w-48">
              <DropdownMenuItem onClick={() => onOpenModal?.('download')} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                Exportar conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal?.('history')} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                Ver histórico
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => onOpenModal?.('block')} className="gap-2 text-xs font-bold text-rose-500 focus:bg-rose-500/20">
                Bloquear contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 z-10"
      >
        {/* Load more */}
        {conversation.hasMoreMessages && (
          <div className="flex justify-center mb-2">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-white/10 transition-all flex items-center gap-2"
            >
              {isLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isLoadingMore ? 'Carregando...' : 'Carregar mensagens anteriores'}
            </button>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <span className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">
            Criptografado de ponta a ponta
          </span>
        </div>

        <AnimatePresence initial={false}>
          {conversation.messages.map((msg) => (
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
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  {msg.fromMe && (
                    <div className="flex items-center gap-2 mb-1 opacity-50">
                      <span className="text-[9px] font-black uppercase tracking-tighter">Eu</span>
                    </div>
                  )}
                  {!msg.fromMe && (msg.senderName || msg.senderPhone) && (
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.senderName && (
                        <span className="text-[11px] font-bold text-primary">{msg.senderName}</span>
                      )}
                      {msg.senderPhone && (
                        <span className="text-[10px] text-slate-400 font-mono">+{msg.senderPhone}</span>
                      )}
                    </div>
                  )}

                  {/* Reply preview */}
                  {msg.replyTo && (
                    <div className={cn(
                      "mb-2 px-3 py-1.5 rounded-xl border-l-2 text-xs",
                      msg.fromMe
                        ? "bg-black/20 border-primary/60 text-slate-300"
                        : "bg-black/20 border-emerald-500/60 text-slate-300"
                    )}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-slate-400">
                        {msg.replyTo.fromMe ? 'Você' : 'Contato'}
                      </p>
                      <p className="truncate">{msg.replyTo.content || `[${msg.type}]`}</p>
                    </div>
                  )}

                  {/* Media */}
                  {isMedia(msg.type) && <MediaBubble msg={msg} />}

                  {/* Text content (only if not a pure media without caption) */}
                  {msg.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap relative z-10">{msg.content}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                    <span className="text-[9px] font-medium">
                      {(() => { try { return format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR }); } catch { return ''; } })()}
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

                {/* Message Actions */}
                <div className={cn(
                  "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100",
                  msg.fromMe ? "mr-1" : "ml-1"
                )}>
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                    title="Responder"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
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
                      <DropdownMenuItem onClick={() => setReplyingTo(msg)} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                        <Reply className="w-3.5 h-3.5" /> Responder
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem onClick={() => onOpenModal?.('import')} className="gap-2 text-xs font-bold text-primary focus:bg-primary/20">
                        <UserPlus className="w-3.5 h-3.5" /> Importar Contato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenModal?.('campaign')} className="gap-2 text-xs font-bold text-slate-200 focus:bg-primary/20">
                        <ArrowRight className="w-3.5 h-3.5" /> Enviar Campanha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 z-20 w-10 h-10 bg-primary rounded-full shadow-lg flex items-center justify-center text-white hover:bg-primary/90 transition-all active:scale-90"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply preview bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-10 bg-slate-800/90 border-t border-primary/20 px-4 py-2 flex items-center gap-3 overflow-hidden"
          >
            <div className="w-1 h-full min-h-[32px] bg-primary rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Respondendo a {replyingTo.fromMe ? 'você mesmo' : 'contato'}
              </p>
              <p className="text-xs text-slate-400 truncate">{replyingTo.content || `[${replyingTo.type}]`}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Input */}
      <div className="z-10 bg-card/80 backdrop-blur-xl border-t border-white/5 p-4 flex items-center gap-2 relative">
        <div className="flex items-center gap-1">
          <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/10 active:scale-95">
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
            placeholder={replyingTo ? `Respondendo a "${(replyingTo.content || '').slice(0, 30)}..."` : "Digite uma mensagem..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600"
          />
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
