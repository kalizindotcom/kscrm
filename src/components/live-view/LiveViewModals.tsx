import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  Mic,
  Pause,
  Play,
  Square,
  Save,
  FileSpreadsheet,
  FileText,
  History,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  Download,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button, Badge } from '@/components/ui/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LiveConversation, LiveMessage } from './types';
import { cn } from '@/lib/utils';
import { campaignService } from '@/services/campaignService';
import type { Campaign } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiClient } from '@/services/apiClient';

interface LiveViewModalsProps {
  conversation: LiveConversation;
  activeSessionId?: string;
  modals: {
    import: boolean;
    download: boolean;
    audio: boolean;
    history: boolean;
    block: boolean;
    attachment: boolean;
    campaign: boolean;
  };
  onClose: (modal: keyof LiveViewModalsProps['modals']) => void;
  onConfirmImport?: (data: any) => void;
  onConfirmBlock?: () => void;
  onMediaSent?: () => void;
}

/* ─── History Modal ─── */
const HistoryModal: React.FC<{ conversation: LiveConversation; open: boolean; onClose: () => void }> = ({
  conversation, open, onClose,
}) => {
  const [search, setSearch] = useState('');

  const allMsgs = [...conversation.messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const filtered = search.trim()
    ? allMsgs.filter((m) => m.content.toLowerCase().includes(search.toLowerCase()))
    : allMsgs;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] bg-[#0b141a] border-white/10 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-card/50 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <History className="w-6 h-6 text-primary" />
            Histórico Completo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {allMsgs.length} mensagens com {conversation.contactName}
          </DialogDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar nas mensagens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {search && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600 text-sm">Nenhuma mensagem encontrada.</div>
          ) : (
            filtered.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.fromMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                className={cn("flex gap-3", msg.fromMe ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "max-w-[75%] rounded-2xl p-3 text-sm leading-relaxed shadow",
                  msg.fromMe
                    ? "bg-primary/20 border border-primary/20 text-white rounded-tr-none"
                    : "bg-slate-800/80 border border-white/5 text-slate-100 rounded-tl-none"
                )}>
                  {!msg.fromMe && (msg.senderName || msg.senderPhone) && (
                    <p className="text-[10px] font-bold text-primary mb-1">{msg.senderName ?? `+${msg.senderPhone}`}</p>
                  )}
                  {msg.replyTo && (
                    <div className={cn(
                      "mb-2 rounded-lg overflow-hidden flex text-xs",
                      msg.fromMe ? "bg-black/25" : "bg-black/20"
                    )}>
                      <div className={cn("w-1 shrink-0", msg.replyTo.fromMe ? "bg-emerald-400" : "bg-primary")} />
                      <div className="px-2 py-1">
                        <p className={cn("text-[9px] font-bold mb-0.5", msg.replyTo.fromMe ? "text-emerald-400" : "text-primary")}>
                          {msg.replyTo.fromMe ? 'Você' : conversation.contactName}
                        </p>
                        <p className="text-slate-300 truncate">{msg.replyTo.content}</p>
                      </div>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content || `[${msg.type}]`}</p>
                  <p className={cn("text-[10px] mt-1 opacity-60 text-right")}>
                    {(() => { try { return format(new Date(msg.timestamp), "HH:mm · dd/MM/yyyy", { locale: ptBR }); } catch { return ''; } })()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-card/30 flex justify-end shrink-0">
          <Button onClick={onClose} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Audio Recording Modal ─── */
const AudioModal: React.FC<{
  open: boolean;
  onClose: () => void;
  conversation: LiveConversation;
  activeSessionId?: string;
  onMediaSent?: () => void;
}> = ({ open, onClose, conversation, activeSessionId, onMediaSent }) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle');
  const [time, setTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  const resetState = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    recorderRef.current = null;
    chunksRef.current = [];
    audioBlobRef.current = null;
    setStatus('idle');
    setTime(0);
    setAudioUrl(null);
  }, [audioUrl]);

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  const startTimer = () => {
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus('done');
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setStatus('recording');
      startTimer();
    } catch {
      toast.error('Sem permissão para acessar microfone');
    }
  };

  const pauseRecording = () => {
    recorderRef.current?.pause();
    stopTimer();
    setStatus('paused');
  };

  const resumeRecording = () => {
    recorderRef.current?.resume();
    startTimer();
    setStatus('recording');
  };

  const stopRecording = () => {
    stopTimer();
    recorderRef.current?.stop();
    // onstop will set status to 'done'
  };

  const sendAudio = async () => {
    if (!audioBlobRef.current || !activeSessionId) return;
    const conv = conversation;
    const targetPhone = (conv as any).rawPhone || conv.phoneNumber;
    if (!targetPhone) { toast.error('Conversa sem destino'); return; }
    const phone = conv.isGroup ? `${targetPhone}@g.us` : targetPhone;

    setSending(true);
    try {
      const form = new FormData();
      form.append('sessionId', activeSessionId);
      form.append('phone', phone);
      form.append('type', 'audio');
      form.append('file', audioBlobRef.current, 'audio.webm');
      await apiClient.post('/api/messages/send-media', form);
      toast.success('Áudio enviado!');
      onMediaSent?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar áudio');
    } finally {
      setSending(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[380px] bg-card/95 backdrop-blur-xl border-primary/20 p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
        <DialogHeader className="items-center text-center">
          <DialogTitle>Gravar Áudio</DialogTitle>
        </DialogHeader>

        {/* Waveform visual */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative">
          {status === 'recording' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
              <div className="absolute inset-2 rounded-full border border-primary/40 animate-pulse" />
            </>
          )}
          <Mic className={cn("w-10 h-10 transition-colors", status === 'recording' ? "text-primary" : "text-muted-foreground")} />
        </div>

        <div className="text-center">
          <p className="text-3xl font-black font-mono tracking-wider">{fmt(time)}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
            {status === 'idle' ? 'Pronto para gravar' : status === 'recording' ? 'Gravando...' : status === 'paused' ? 'Pausado' : 'Gravação concluída'}
          </p>
        </div>

        {/* Controls */}
        {status === 'idle' && (
          <Button onClick={startRecording} className="bg-primary hover:bg-primary/90 rounded-full h-16 w-16 p-0 shadow-lg shadow-primary/30">
            <Mic className="w-8 h-8" />
          </Button>
        )}

        {(status === 'recording' || status === 'paused') && (
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="h-12 w-12 p-0 rounded-full"
              onClick={status === 'recording' ? pauseRecording : resumeRecording}
            >
              {status === 'recording' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button
              variant="destructive"
              className="h-16 w-16 p-0 rounded-full shadow-lg shadow-destructive/20"
              onClick={stopRecording}
            >
              <Square className="w-6 h-6" />
            </Button>
          </div>
        )}

        {status === 'done' && audioUrl && (
          <div className="w-full space-y-4">
            <audio src={audioUrl} controls className="w-full rounded-xl" />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => { resetState(); }}
              >
                <Trash2 className="w-4 h-4" /> Descartar
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                onClick={sendAudio}
                disabled={sending}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        )}

        <Button variant="ghost" className="text-xs text-muted-foreground w-full" onClick={onClose}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Download Modal ─── */
const DownloadModal: React.FC<{ conversation: LiveConversation; open: boolean; onClose: () => void }> = ({
  conversation, open, onClose,
}) => {
  const [loading, setLoading] = useState<'csv' | 'txt' | null>(null);

  const download = async (format: 'csv' | 'txt') => {
    setLoading(format);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
      const { useAuthStore } = await import('@/store');
      const token = useAuthStore.getState().token;
      const res = await fetch(`${apiUrl}/api/conversations/${conversation.id}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Erro ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversa_${conversation.contactName}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Download concluído!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao exportar');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[300px] bg-card border-primary/20 animate-in zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-center">Exportar Conversa</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {conversation.contactName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            onClick={() => download('csv')}
            disabled={!!loading}
            className="flex flex-col h-auto py-6 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group"
          >
            {loading === 'csv' ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <FileSpreadsheet className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />}
            <span className="text-xs font-bold">CSV</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => download('txt')}
            disabled={!!loading}
            className="flex flex-col h-auto py-6 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group"
          >
            {loading === 'txt' ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <FileText className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />}
            <span className="text-xs font-bold">TXT</span>
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-xs" onClick={onClose}>Cancelar</Button>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Block Modal ─── */
const BlockModal: React.FC<{
  conversation: LiveConversation;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}> = ({ conversation, open, onClose, onConfirm }) => {
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await apiClient.post(`/api/conversations/${conversation.id}/block`);
      toast.success(`${conversation.contactName} foi bloqueado.`);
      onConfirm?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao bloquear contato');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-card border-rose-500/20 animate-in zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <ShieldAlert className="w-6 h-6" />
            Bloquear Contato?
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-400 leading-relaxed">
            Ao bloquear <strong>{conversation.contactName}</strong>, a conversa será marcada como resolvida e você não receberá mais mensagens desta conversa.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleBlock}
            disabled={blocking}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2"
          >
            {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            {blocking ? 'Bloqueando...' : 'Bloquear Agora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Main export ─── */
export const LiveViewModals: React.FC<LiveViewModalsProps> = ({
  conversation,
  activeSessionId,
  modals,
  onClose,
  onConfirmImport,
  onConfirmBlock,
  onMediaSent,
}) => {
  const [importForm, setImportForm] = useState({
    name: conversation.contactName,
    number: conversation.phoneNumber,
    toKanban: false,
  });

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);

  useEffect(() => {
    if (modals.campaign) campaignService.list().then(setCampaigns).catch(() => setCampaigns([]));
  }, [modals.campaign]);

  const sendCampaignToContact = async () => {
    if (!selectedCampaign || !activeSessionId) return;
    const camp = campaigns.find((c) => c.id === selectedCampaign);
    if (!camp?.messageContent) { toast.error('Campanha sem conteúdo de mensagem'); return; }
    const targetPhone = (conversation as any).rawPhone || conversation.phoneNumber;
    if (!targetPhone) { toast.error('Sem destino válido'); return; }
    const phone = conversation.isGroup ? `${targetPhone}@g.us` : targetPhone;
    setSendingCampaign(true);
    try {
      await apiClient.post('/api/messages/send', {
        sessionId: activeSessionId,
        phone,
        content: camp.messageContent,
      });
      toast.success(`Campanha "${camp.name}" enviada para ${conversation.contactName}!`);
      onClose('campaign');
      setSelectedCampaign(null);
      setCampaignSearch('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar campanha');
    } finally {
      setSendingCampaign(false);
    }
  };

  const filteredCampaigns = campaignSearch.trim()
    ? campaigns.filter((c) => c.name.toLowerCase().includes(campaignSearch.toLowerCase()))
    : campaigns;

  return (
    <>
      {/* History */}
      <HistoryModal
        conversation={conversation}
        open={modals.history}
        onClose={() => onClose('history')}
      />

      {/* Audio */}
      <AudioModal
        open={modals.audio}
        onClose={() => onClose('audio')}
        conversation={conversation}
        activeSessionId={activeSessionId}
        onMediaSent={onMediaSent}
      />

      {/* Download */}
      <DownloadModal
        conversation={conversation}
        open={modals.download}
        onClose={() => onClose('download')}
      />

      {/* Block */}
      <BlockModal
        conversation={conversation}
        open={modals.block}
        onClose={() => onClose('block')}
        onConfirm={onConfirmBlock}
      />

      {/* Send Campaign Modal */}
      <Dialog open={modals.campaign} onOpenChange={() => onClose('campaign')}>
        <DialogContent className="sm:max-w-[500px] bg-card border-primary/20 animate-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Disparar Campanha
            </DialogTitle>
            <DialogDescription>
              Selecione uma campanha para enviar para {conversation.contactName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Filtrar campanhas..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="bg-white/5 border-white/10 pl-10"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredCampaigns.length === 0 && (
                <p className="text-center text-slate-600 text-sm py-6">Nenhuma campanha encontrada.</p>
              )}
              {filteredCampaigns.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => setSelectedCampaign(camp.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                    selectedCampaign === camp.id
                      ? "bg-primary/10 border-primary shadow-lg shadow-primary/5 scale-[1.02]"
                      : "bg-white/5 border-white/10 hover:border-primary/30 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedCampaign === camp.id ? "bg-primary text-white" : "bg-slate-800 text-slate-400")}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{camp.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{camp.channel}</p>
                    </div>
                  </div>
                  {selectedCampaign === camp.id && <CheckCircle2 className="w-5 h-5 text-primary animate-in zoom-in duration-300" />}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">O disparo será processado pelo gateway e pode levar alguns segundos para aparecer no histórico.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onClose('campaign')}>Cancelar</Button>
            <Button
              disabled={!selectedCampaign || sendingCampaign}
              onClick={sendCampaignToContact}
              className="bg-primary hover:bg-primary/90 gap-2 font-bold"
            >
              {sendingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {sendingCampaign ? 'Enviando...' : 'Enviar Agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Contact Modal */}
      <Dialog open={modals.import} onOpenChange={() => onClose('import')}>
        <DialogContent className="sm:max-w-[400px] bg-card border-primary/20 animate-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Importar Contato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Contato</Label>
              <Input
                value={importForm.name}
                onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                placeholder="Nome completo"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={importForm.number}
                onChange={(e) => setImportForm({ ...importForm, number: e.target.value })}
                placeholder="Ex: 5511999999999"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Importar para Kanban</Label>
                <p className="text-[10px] text-muted-foreground">Adiciona automaticamente ao fluxo de vendas.</p>
              </div>
              <Switch checked={importForm.toKanban} onCheckedChange={(val) => setImportForm({ ...importForm, toKanban: val })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onClose('import')}>Cancelar</Button>
            <Button onClick={() => {
              onConfirmImport?.(importForm);
              onClose('import');
              toast.success(`${importForm.name} importado para o CRM.`);
            }} className="bg-primary hover:bg-primary/90">Confirmar Importação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
