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
  Mic,
  UserPlus,
  ArrowRight,
  Megaphone,
  MoreHorizontal,
  Copy,
  X,
  Reply,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Download,
  ChevronDown,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/shared';
import { toast } from 'sonner';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/services/apiClient';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface PastePreview {
  file: File;
  previewUrl: string;
  caption: string;
}

interface ChatWindowProps {
  conversation: LiveConversation;
  activeSessionId?: string;
  onSendMessage?: (content: string, replyToId?: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onOpenModal?: (modal: 'import' | 'download' | 'audio' | 'history' | 'block' | 'attachment' | 'campaign') => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

/* ---------- Media placeholder (WhatsApp style) ---------- */
const MediaPlaceholder: React.FC<{ type: LiveMessage['type']; mediaUrl?: string; mediaMime?: string; content?: string }> = ({
  type, mediaUrl: rawMediaUrl, mediaMime, content,
}) => {
  const [revealed, setRevealed] = useState(false);
  const mediaUrl = resolveMediaUrl(rawMediaUrl);

  if (type === 'image') {
    if (mediaUrl && revealed) {
      return (
        <img
          src={mediaUrl}
          alt="imagem"
          className="max-w-[220px] rounded-xl mb-1 cursor-pointer hover:opacity-90"
          onClick={() => window.open(mediaUrl, '_blank')}
        />
      );
    }
    return (
      <div className="relative max-w-[220px] mb-1 rounded-xl overflow-hidden cursor-pointer group" onClick={() => mediaUrl ? setRevealed(true) : undefined}>
        {/* blurred grey placeholder like WhatsApp */}
        <div className="w-[220px] h-[160px] bg-slate-700/60 flex flex-col items-center justify-center gap-2 relative">
          {/* faint diagonal lines pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }}
          />
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            mediaUrl ? "bg-white/20 group-hover:bg-white/30" : "bg-white/10"
          )}>
            {mediaUrl
              ? <Download className="w-5 h-5 text-white" />
              : <ImageIcon className="w-5 h-5 text-slate-400" />
            }
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            {mediaUrl ? 'Clique para ver' : 'Imagem'}
          </span>
        </div>
      </div>
    );
  }

  if (type === 'video') {
    if (mediaUrl && revealed) return <video src={mediaUrl} controls className="max-w-[220px] rounded-xl mb-1" />;
    return (
      <div className="relative max-w-[220px] mb-1 rounded-xl overflow-hidden cursor-pointer group" onClick={() => mediaUrl ? setRevealed(true) : undefined}>
        <div className="w-[220px] h-[140px] bg-slate-700/60 flex flex-col items-center justify-center gap-2">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", mediaUrl ? "bg-white/20 group-hover:bg-white/30" : "bg-white/10")}>
            {mediaUrl ? <Download className="w-5 h-5 text-white" /> : <Film className="w-5 h-5 text-slate-400" />}
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{mediaUrl ? 'Clique para ver' : 'Vídeo'}</span>
        </div>
      </div>
    );
  }

  if (type === 'audio') {
    if (mediaUrl) return <audio src={mediaUrl} controls className="max-w-[220px] mb-1 rounded-xl" />;
    return (
      <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 mb-1 w-[200px]">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Music className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-1 bg-white/20 rounded-full" />
          <div className="h-1 bg-white/10 rounded-full w-2/3" />
        </div>
      </div>
    );
  }

  if (type === 'document' || type === 'file') {
    return (
      <div className="flex items-center gap-2 text-slate-200 text-xs bg-white/10 rounded-xl p-3 mb-1">
        <FileText className="w-4 h-4 shrink-0 text-primary" />
        <span className="truncate max-w-[160px]">{content || 'Documento'}</span>
        {mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline text-[9px] font-bold uppercase">
            Abrir
          </a>
        )}
      </div>
    );
  }

  if (type === 'sticker') {
    if (mediaUrl) return <img src={mediaUrl} alt="sticker" className="w-20 h-20 mb-1" />;
    return (
      <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center mb-1">
        <span className="text-2xl">😊</span>
      </div>
    );
  }

  return null;
};

/* ---------- Main component ---------- */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  activeSessionId,
  onSendMessage,
  onRetryMessage,
  onOpenModal,
  onLoadMore,
  isLoadingMore,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<LiveMessage | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pastePreview, setPastePreview] = useState<PastePreview | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.id]);

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
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
    if (el.scrollTop < 60 && onLoadMore && !isLoadingMore && conversation.hasMoreMessages) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  /* --- Paste handler --- */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(i => i.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPastePreview({ file, previewUrl, caption: '' });
  };

  /* --- Send pasted image --- */
  const sendPastedImage = async () => {
    if (!pastePreview || !activeSessionId) return;
    const conv = conversation;
    const targetPhone = (conv as any).rawPhone || conv.phoneNumber;
    if (!targetPhone) { toast.error('Conversa sem destino válido'); return; }
    const phone = conv.isGroup ? `${targetPhone}@g.us` : targetPhone;

    setSendingMedia(true);
    const form = new FormData();
    form.append('sessionId', activeSessionId);
    form.append('phone', phone);
    form.append('type', 'image');
    form.append('caption', pastePreview.caption);
    form.append('file', pastePreview.file, pastePreview.file.name || 'paste.png');

    try {
      await apiClient.post('/api/messages/send-media', form);
      toast.success('Imagem enviada!');
      URL.revokeObjectURL(pastePreview.previewUrl);
      setPastePreview(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar imagem');
    } finally {
      setSendingMedia(false);
    }
  };

  /* --- Send file from input --- */
  const sendFileFromInput = async (file: File) => {
    if (!activeSessionId) return;
    const conv = conversation;
    const targetPhone = (conv as any).rawPhone || conv.phoneNumber;
    if (!targetPhone) { toast.error('Conversa sem destino válido'); return; }
    const phone = conv.isGroup ? `${targetPhone}@g.us` : targetPhone;

    const mime = file.type;
    let type: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime.startsWith('video/')) type = 'video';
    else if (mime.startsWith('audio/')) type = 'audio';

    setSendingMedia(true);
    const form = new FormData();
    form.append('sessionId', activeSessionId);
    form.append('phone', phone);
    form.append('type', type);
    form.append('file', file, file.name);

    try {
      await apiClient.post('/api/messages/send-media', form);
      toast.success('Arquivo enviado!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar arquivo');
    } finally {
      setSendingMedia(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setPastePreview({ file, previewUrl, caption: '' });
    } else {
      await sendFileFromInput(file);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
              className={cn("flex w-full mb-4", msg.fromMe ? "justify-end" : "justify-start")}
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
                      {msg.senderName && <span className="text-[11px] font-bold text-primary">{msg.senderName}</span>}
                      {msg.senderPhone && <span className="text-[10px] text-slate-400 font-mono">+{msg.senderPhone}</span>}
                    </div>
                  )}

                  {/* Reply preview — WhatsApp style */}
                  {msg.replyTo && (
                    <div className={cn(
                      "mb-2 rounded-lg overflow-hidden flex",
                      msg.fromMe ? "bg-black/25" : "bg-black/20"
                    )}>
                      <div className={cn(
                        "w-1 shrink-0",
                        msg.replyTo.fromMe ? "bg-emerald-400" : "bg-primary"
                      )} />
                      <div className="px-2.5 py-1.5 min-w-0">
                        <p className={cn(
                          "text-[11px] font-bold mb-0.5",
                          msg.replyTo.fromMe ? "text-emerald-400" : "text-primary"
                        )}>
                          {msg.replyTo.fromMe ? 'Você' : conversation.contactName}
                        </p>
                        <p className="text-xs text-slate-300 truncate leading-relaxed">
                          {msg.replyTo.content || `[mídia]`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Media */}
                  {isMedia(msg.type) && (
                    <MediaPlaceholder
                      type={msg.type}
                      mediaUrl={msg.mediaUrl}
                      mediaMime={msg.mediaMime}
                      content={msg.content}
                    />
                  )}

                  {/* Text */}
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

                {/* Message actions */}
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

      {/* Scroll to bottom */}
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

      {/* Paste image preview modal */}
      <AnimatePresence>
        {pastePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6"
          >
            <div className="flex items-center justify-between w-full max-w-sm mb-2">
              <span className="text-white font-black text-sm uppercase tracking-widest">Enviar imagem</span>
              <button
                onClick={() => { URL.revokeObjectURL(pastePreview.previewUrl); setPastePreview(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={pastePreview.previewUrl}
              alt="preview"
              className="max-w-sm max-h-[50vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <input
              type="text"
              placeholder="Legenda (opcional)..."
              value={pastePreview.caption}
              onChange={(e) => setPastePreview(p => p ? { ...p, caption: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendPastedImage(); }}
              className="w-full max-w-sm bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <button
              onClick={sendPastedImage}
              disabled={sendingMedia}
              className="w-full max-w-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-black text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {sendingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingMedia ? 'Enviando...' : 'Enviar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply bar — WhatsApp style */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-10 bg-[#1f2c34] border-t border-white/5 px-4 py-2 flex items-center gap-3 overflow-hidden"
          >
            <Reply className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0 bg-white/5 rounded-lg overflow-hidden flex">
              <div className={cn(
                "w-1 shrink-0",
                replyingTo.fromMe ? "bg-emerald-400" : "bg-primary"
              )} />
              <div className="px-2.5 py-1.5 min-w-0">
                <p className={cn(
                  "text-[11px] font-bold mb-0.5",
                  replyingTo.fromMe ? "text-emerald-400" : "text-primary"
                )}>
                  {replyingTo.fromMe ? 'Você' : conversation.contactName}
                </p>
                <p className="text-xs text-slate-400 truncate">{replyingTo.content || `[mídia]`}</p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer input */}
      <div
        className="z-10 bg-card/80 backdrop-blur-xl border-t border-white/5 p-4 flex items-center gap-2 relative"
        onPaste={handlePaste}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />
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
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/10 active:scale-95"
            title="Anexar arquivo ou imagem"
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
            ref={inputRef}
            type="text"
            placeholder={replyingTo ? `Respondendo...` : "Digite uma mensagem ou cole uma imagem (Ctrl+V)"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
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
