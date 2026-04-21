import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Send, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Smartphone,
  MessageSquare,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  BarChart2,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Users,
  XCircle,
  PlayCircle,
  Smile,
  Mic,
  Phone,
  User as UserIcon,
  Check,
  Bold,
  Italic,
  Strikethrough,
  FileAudio,
  Paperclip,
  Save,
  Link2,
  PhoneCall,
  Settings2,
  PlusCircle,
  X
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { toast } from 'sonner';
import { cn, formatDate } from '../lib/utils';
import { FireButton } from "../components/ui/FireButton";
import { useAppStore } from '../store';
import { useSessionStore } from '../store/useSessionStore';
import { CampaignFiringModal } from '../components/campaigns/CampaignFiringModal';
import { CampaignStatus, CampaignChannel, Campaign, Contact, CampaignButton, MessageTemplate } from '../types';
import { campaignService, type TargetSource } from '../services/campaignService';
import { contactService } from '../services/contactService';
import { sessionService } from '../services/sessionService';
import { templateService } from '../services/templateService';
import { groupsService } from '../services/groupsService';
import { useCampaignProgress } from '../hooks/useCampaignProgress';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const statusMap: Record<CampaignStatus, { label: string, variant: any, icon: any }> = {
  draft: { label: 'Rascunho', variant: 'outline', icon: FileText },
  scheduled: { label: 'Agendada', variant: 'warning', icon: Clock },
  running: { label: 'Em andamento', variant: 'default', icon: Send },
  completed: { label: 'Concluída', variant: 'success', icon: CheckCircle2 },
  paused: { label: 'Pausada', variant: 'error', icon: PauseCircle },
  cancelled: { label: 'Cancelada', variant: 'outline', icon: XCircle },
  failed: { label: 'Falhou', variant: 'error', icon: AlertCircle },
};

const channelIconMap: Record<CampaignChannel, any> = {
  whatsapp: Smartphone,
  sms: MessageSquare,
};

// XSS-safe: escape HTML first, then apply WhatsApp formatting.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Sample vars for preview rendering of {{variable}} placeholders.
const samplePreviewVars: Record<string, string> = {
  nome: 'João',
  primeiro_nome: 'João',
  telefone: '+55 11 99999-9999',
};

const applySampleVars = (text: string) =>
  text.replace(/\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g, (_m, key) => samplePreviewVars[key] ?? `[${key}]`);

const formatWhatsAppMessage = (text: string) => {
  if (!text) return null;
  let formatted = escapeHtml(applySampleVars(text));
  // Monospace must run before single-char markers (```text```)
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<code>$1</code>');
  formatted = formatted.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  formatted = formatted.replace(/~([^~\n]+)~/g, '<del>$1</del>');
  formatted = formatted.split('\n').join('<br />');
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

const toCampaignModel = (payload: any): Campaign => ({
  id: payload.id,
  name: payload.name,
  channel: (payload.channel as CampaignChannel) ?? 'whatsapp',
  status: (payload.status as CampaignStatus) ?? 'draft',
  templateId: payload.templateId ?? undefined,
  segmentId: payload.segmentId ?? undefined,
  messageContent: payload.messageContent ?? undefined,
  scheduledAt: payload.scheduledAt ?? undefined,
  sentCount: payload.sentCount ?? 0,
  deliveredCount: payload.deliveredCount ?? 0,
  failedCount: payload.failedCount ?? 0,
  responseCount: payload.responseCount ?? 0,
  batchLimit: payload.batchLimit ?? undefined,
  windowStart: payload.windowStart ?? undefined,
  windowEnd: payload.windowEnd ?? undefined,
  buttonsEnabled: payload.buttonsEnabled ?? false,
  buttons:
    (Array.isArray(payload.buttonsJson) ? payload.buttonsJson : payload.buttons) ??
    [],
  mediaUrl: payload.mediaUrl ?? undefined,
  mediaType: payload.mediaType ?? 'none',
  createdAt: payload.createdAt ?? new Date().toISOString(),
  updatedAt: payload.updatedAt ?? new Date().toISOString(),
});

const WhatsAppPreview: React.FC<{ 
  campaign: Campaign; 
  onBack: () => void;
  onSave?: (updatedCampaign: Campaign) => void;
  onDelete?: (id: string) => void;
}> = ({ campaign, onBack, onSave, onDelete }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const template = templates.find(t => t.id === campaign.templateId);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(campaign.name);
  const [editedMessage, setEditedMessage] = useState(campaign.messageContent || template?.content || "");
  const [editedLink, setEditedLink] = useState("");
  const [buttonsEnabled, setButtonsEnabled] = useState(campaign.buttonsEnabled || false);
  const [buttons, setButtons] = useState<CampaignButton[]>(campaign.buttons || [
    { text: 'Saiba Mais', type: 'url', value: 'https://' },
    { text: 'Falar com Atendente', type: 'reply', value: 'Quero falar com um atendente' }
  ]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'none'>('image');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [intervalValue, setIntervalValue] = useState(15);
  const [isUploading, setIsUploading] = useState(false);
  const [showFiringModal, setShowFiringModal] = useState(false);
  const { 
    isFiring, 
    setIsFiring, 
    activeCampaignId, 
    setActiveCampaignId,
    progress,
    setProgress,
    currentTarget,
    setCurrentTarget
  } = useAppStore();
  const { sessions, setSessions } = useSessionStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);

  const [showContactSelector, setShowContactSelector] = useState(false);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [isStartingCampaign, setIsStartingCampaign] = useState(false);
  const [importsList, setImportsList] = useState<{ id: string; name: string; count: number }[]>([]);

  const totalSelectedContacts = importsList
    .filter(imp => selectedImports.includes(imp.id))
    .reduce((acc, curr) => acc + curr.count, 0);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaUrl(URL.createObjectURL(file));
      if (file.type.startsWith('image/')) setMediaType('image');
      else if (file.type.startsWith('video/')) setMediaType('video');
      else if (file.type.startsWith('audio/')) setMediaType('audio');
    }
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textAreaRef.current) return;

    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    const text = editedMessage;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    setEditedMessage(`${before}${prefix}${selection}${suffix}${after}`);

    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setEditedMessage((previous) => previous + emojiData.emoji);
  };

  const handleSaveEdit = () => {
    if (onSave) {
      onSave({
        ...campaign,
        name: editedName,
        buttons,
        buttonsEnabled,
        messageContent: editedMessage,
        mediaType,
        mediaUrl: mediaUrl ?? campaign.mediaUrl,
      });
    }
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await campaignService.uploadCSV(campaign.id, file);
      setContactsCount(result.total);
      toast.success(
        `CSV processado: ${result.added} adicionados, ${result.duplicates} duplicados. Total: ${result.total}.`,
      );
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao enviar CSV');
    } finally {
      setIsUploading(false);
      // reset the input so the same file can be re-uploaded
      e.target.value = '';
    }
  };

  const handleStartCampaign = async () => {
    if (isFiring && activeCampaignId !== campaign.id) {
      toast.error('Já existe uma campanha em andamento. Interrompa-a antes de iniciar uma nova.');
      return;
    }
    if (!selectedSessionId) {
      toast.error('Selecione uma sessão para realizar o disparo.');
      return;
    }

    // If the user selected imports from the picker, push them as targets now.
    if (showContactSelector && selectedImports.length > 0) {
      try {
        await campaignService.setTargets(campaign.id, {
          replace: true,
          importIds: selectedImports,
        });
      } catch (err: any) {
        toast.error(err?.message ?? 'Falha ao carregar contatos das listas');
        return;
      }
    }

    // Validate there are real targets
    try {
      const detail = await campaignService.get(campaign.id);
      const pending = detail.targetsByStatus?.pending ?? 0;
      if (pending === 0 && (detail.targetTotal ?? 0) === 0) {
        toast.error('Nenhum destinatário pendente. Envie um CSV ou selecione listas antes de disparar.');
        return;
      }
    } catch {
      // fallthrough — backend will reject if empty
    }

    setShowFiringModal(true);
  };

  const confirmStartCampaign = async () => {
    setIsStartingCampaign(true);
    try {
      const result = await campaignService.fire(campaign.id, {
        sessionId: selectedSessionId,
        intervalSec: intervalValue,
      });

      if (result.status === 'scheduled') {
        toast.success('Campanha agendada com sucesso.');
      } else {
        toast.success('Disparo iniciado!');
        setIsFiring(true);
        setActiveCampaignId(campaign.id);
        setIsPaused(false);
        setProgress(0);
        setCurrentTarget(null);
      }
      setShowFiringModal(false);
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao iniciar campanha.');
    } finally {
      setIsStartingCampaign(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      if (!isPaused) {
        await campaignService.pause(campaign.id);
        setIsPaused(true);
        toast.info('Campanha pausada. O disparo atual será concluído.');
      } else {
        await campaignService.resume(campaign.id);
        setIsPaused(false);
        toast.success('Campanha retomada.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao alterar estado da campanha');
    }
  };

  const handleCancelCampaign = async () => {
    try {
      await campaignService.cancel(campaign.id);
      setIsFiring(false);
      setActiveCampaignId(null);
      setIsPaused(false);
      setProgress(0);
      setCurrentTarget(null);
      toast.success('Campanha cancelada.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao cancelar');
    }
  };

  const handleRetryFailed = async () => {
    try {
      const res = await campaignService.retryFailed(campaign.id);
      if (res.reset === 0) {
        toast.info('Não há destinatários com falha para reprocessar.');
      } else {
        toast.success(
          `${res.reset} destinatários reenfileirados${res.started ? ' — disparo iniciado.' : '.'}`,
        );
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao reprocessar');
    }
  };

  useEffect(() => {
    contactService
      .list({ pageSize: 500 })
      .then((res) => setAvailableContacts(res.items ?? []))
      .catch(() => setAvailableContacts([]));
    templateService
      .list()
      .then(setTemplates)
      .catch(() => setTemplates([]));
    contactService
      .listImports()
      .then(items => setImportsList(items.map(i => ({ id: i.id, name: i.name, count: i.contactCount ?? 0 }))))
      .catch(() => setImportsList([]));
  }, []);

  useEffect(() => {
    if (sessions.length > 0) return;
    sessionService
      .list()
      .then((items) => setSessions(items))
      .catch(() => undefined);
  }, [sessions.length, setSessions]);

  // Real-time progress via WebSocket (replaces the old 2s polling)
  const wsProgress = useCampaignProgress(
    isFiring && activeCampaignId === campaign.id ? campaign.id : null,
  );

  useEffect(() => {
    if (!wsProgress) return;
    setProgress(wsProgress.progress);
    if (wsProgress.currentTarget) setCurrentTarget(wsProgress.currentTarget);
  }, [wsProgress, setProgress, setCurrentTarget]);

  // Reconcile terminal status (completed/cancelled/failed) by refetching periodically while running.
  useEffect(() => {
    if (!isFiring || activeCampaignId !== campaign.id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const latest = await campaignService.get(campaign.id);
        if (cancelled) return;
        if (latest.status && latest.status !== 'running' && latest.status !== 'paused') {
          setIsFiring(false);
          setActiveCampaignId(null);
          if (latest.status === 'completed') setProgress(100);
        }
      } catch {
        /* ignore transient errors */
      }
    };
    const timer = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isFiring, activeCampaignId, campaign.id, setIsFiring, setActiveCampaignId, setProgress]);

  // Removido para que a campanha continue mesmo ao sair da aba
  /*
  useEffect(() => {
    return () => {
      setIsFiring(false);
    };
  }, [setIsFiring]);
  */

  const toggleImport = (id: string) => {
    setSelectedImports(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllImports = () => {
    if (selectedImports.length === importsList.length) {
      setSelectedImports([]);
    } else {
      setSelectedImports(importsList.map(i => i.id));
    }
  };

  const StatusIcon = statusMap[campaign.status].icon;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-lg sm:text-xl font-bold truncate max-w-[150px] sm:max-w-none">{campaign.name}</h2>
          <Badge variant={statusMap[campaign.status].variant} className="text-[10px] py-0">
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusMap[campaign.status].label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (isFiring && activeCampaignId === campaign.id) {
                toast.error('Campanha em execução não pode ser deletada. Cancele-a primeiro.');
                return;
              }
              toast('Excluir esta campanha?', {
                action: {
                  label: 'Excluir',
                  onClick: () => { if (onDelete) onDelete(campaign.id); },
                },
                cancel: { label: 'Cancelar', onClick: () => undefined },
              });
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </Button>
          <Button size="sm" onClick={() => setIsEditing(true)} disabled={isFiring}>
            <Edit2 className="w-4 h-4 mr-2" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <div className="p-0 overflow-hidden bg-[#E5DDD5] dark:bg-zinc-950 relative min-h-[600px] flex flex-col">
              {/* Header iOS Style */}
              <div className="bg-[#f6f6f6] dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 pt-8 flex items-center gap-3">
                <ChevronLeft className="w-5 h-5 text-blue-500" />
                <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-zinc-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[15px] leading-tight">Contato da Campanha</p>
                  <p className="text-[11px] text-zinc-500">online</p>
                </div>
                <div className="flex gap-4">
                  <Video className="w-5 h-5 text-blue-500" />
                  <Phone className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 relative p-4 overflow-y-auto bg-[#E5DDD5] dark:bg-zinc-950" style={{ backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-bg.png")', backgroundSize: '400px', backgroundRepeat: 'repeat' }}>
                <div className="absolute inset-0 opacity-40 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'inherit', backgroundSize: 'inherit' }} />
                
                <div className="relative flex flex-col gap-1 items-end">
                  <div className="max-w-[85%] bg-[#DCF8C6] dark:bg-[#056162] rounded-lg rounded-tr-none p-3 shadow-sm relative">
                    {/* Message Tail */}
                    <div className="absolute top-0 -right-2 w-3 h-3 bg-[#DCF8C6] dark:bg-[#056162]" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                    
                    <div className="space-y-2">
                      {(mediaUrl || mediaType !== 'none') && (
                        <div className="rounded-md overflow-hidden bg-white/50 dark:bg-black/20">
                          {mediaType === 'image' && mediaUrl ? (
                            <img src={mediaUrl} alt="Mídia" className="w-full aspect-video object-cover" />
                          ) : mediaType === 'video' && mediaUrl ? (
                            <video src={mediaUrl} className="w-full aspect-video object-cover" controls />
                          ) : mediaType === 'audio' && mediaUrl ? (
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 flex items-center gap-3">
                              <Mic className="w-6 h-6 text-blue-500" />
                              <div className="flex-1 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                              <span className="text-[10px]">0:15</span>
                            </div>
                          ) : (
                            <div className="aspect-video bg-zinc-200/50 dark:bg-zinc-700/50 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                              <ImageIcon className="w-8 h-8 mb-2" />
                              <p className="text-[10px] uppercase font-bold tracking-wider">Mídia da Campanha</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-[14.5px] leading-relaxed text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                        {formatWhatsAppMessage(editedMessage)}
                      </div>

                      {editedLink && (
                        <div className="bg-white/40 dark:bg-black/20 rounded p-2 flex items-center gap-3 border border-white/20">
                          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center shrink-0">
                            <ExternalLink className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Acesse nosso site</p>
                            <p className="text-[10px] text-zinc-500 truncate">{editedLink}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-300">14:30</span>
                        <div className="flex -space-x-1">
                          <Check className="w-3 h-3 text-blue-500" />
                          <Check className="w-3 h-3 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Buttons */}
                  {buttonsEnabled && buttons.length > 0 && (
                    <div className="max-w-[85%] w-full space-y-1 mt-1">
                      {buttons.map((btn, idx) => (
                        <button key={idx} className="w-full bg-white dark:bg-zinc-800 py-2 px-4 rounded-lg shadow-sm text-blue-500 text-[14px] font-medium hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
                          {btn.type === 'url' && <ExternalLink className="w-3.5 h-3.5" />}
                          {btn.type === 'call' && <PhoneCall className="w-3.5 h-3.5" />}
                          {btn.type === 'reply' && <MessageSquare className="w-3.5 h-3.5" />}
                          {btn.text || 'Botão ' + (idx + 1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Footer Input */}
              <div className="bg-[#f6f6f6] dark:bg-zinc-900 p-2 pb-6 flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <Plus className="w-6 h-6 text-blue-500" />
                <div className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full py-1.5 px-4 flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Mensagem</span>
                  <Smile className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
              </div>
          </Card>

          {isFiring && (
            <Card className="border-primary/50 bg-primary/5 animate-in slide-in-from-top duration-500 mt-6 shadow-[0_0_20px_rgba(34,211,238,0.15)] overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </div>
                    <span className="text-sm font-bold">Andamento dos Disparos</span>
                  </div>
                  <Badge variant={isPaused ? 'warning' : 'default'}>
                    {isPaused ? 'Pausado' : 'Disparando...'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-primary/10 rounded-full relative">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        isFiring ? "river-progress-indicator scale-y-125" : "bg-primary"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-primary/20">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Número Atual</p>
                      <p className="text-sm font-mono font-bold">{currentTarget || 'Iniciando...'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleTogglePause}>
                        {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={handleCancelCampaign}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Template</p>
                      <p className="text-xs font-bold truncate">{template?.title || 'Personalizado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Intervalo</p>
                      <p className="text-xs font-bold">{intervalValue} segundos</p>
                    </div>
                  </div>

                  {selectedImports.length > 0 && (
                    <div className="pt-2 border-t border-primary/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Listas Utilizadas</p>
                      <div className="flex flex-wrap gap-1">
                        {importsList.filter(i => selectedImports.includes(i.id)).map(imp => (
                          <Badge key={imp.id} variant="outline" className="text-[9px] py-0 h-4">{imp.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    <Button variant="destructive" size="sm" className="w-full" onClick={handleCancelCampaign}>
                      Cancelar Todos os Disparos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isFiring && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Entregues</p>
                  <p className="text-2xl font-bold">{campaign.deliveredCount}</p>
                  <p className="text-xs text-green-500 mt-1">{(campaign.deliveredCount / campaign.sentCount * 100).toFixed(1)}% de sucesso</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Canais</p>
                  <p className="text-2xl font-bold capitalize">{campaign.channel}</p>
                  <p className="text-xs text-blue-500 mt-1">Via {campaign.channel}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Enviar Campanha
              </h3>
              
              <div className="space-y-4">
                <div className={cn("space-y-2", isFiring && "opacity-50 pointer-events-none")}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contacts-upload" className="text-sm font-medium">
                      Público Alvo
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-primary"
                      onClick={() => setShowContactSelector(!showContactSelector)}
                    >
                      {showContactSelector ? 'Usar Arquivo' : 'Selecionar da Agenda'}
                    </Button>
                  </div>
                  
                  {!showContactSelector ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input 
                        type="file" 
                        id="contacts-upload" 
                        className="hidden" 
                        ref={fileInputRef}
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                      />
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-center">
                        {isUploading ? "Processando arquivo..." : "Importar Contatos (CSV ou Excel)"}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">Clique para selecionar ou arraste o arquivo</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden flex flex-col max-h-[250px] animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 bg-muted/50 border-b flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{selectedImports.length} selecionados</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllImports}>
                          {selectedImports.length === importsList.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </Button>
                      </div>
                      <div className="overflow-y-auto p-1">
                        {importsList.map(imp => (
                          <div 
                            key={imp.id}
                            onClick={() => toggleImport(imp.id)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-primary/5 transition-colors",
                              selectedImports.includes(imp.id) && "bg-primary/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center",
                                selectedImports.includes(imp.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                              )}>
                                {selectedImports.includes(imp.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{imp.name}</p>
                                <p className="text-[10px] text-muted-foreground">{imp.count} contatos</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] px-1 h-4">Importação</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(contactsCount !== null || selectedImports.length > 0) && (
                  <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {showContactSelector ? <Users className="w-4 h-4 text-primary" /> : <FileSpreadsheet className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {showContactSelector ? `${totalSelectedContacts} contatos selecionados` : `${contactsCount} contatos identificados`}
                      </p>
                      <p className="text-xs text-muted-foreground">A campanha será enviada para esses números.</p>
                    </div>
                  </div>
                )}

                <div className={cn("space-y-3", isFiring && "opacity-50 pointer-events-none")}>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="interval" className="text-sm font-medium">
                      Intervalo entre mensagens
                    </Label>
                    <span className="text-xs font-bold text-primary">{intervalValue} segundos</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input 
                      type="range" 
                      id="interval"
                      min="5" 
                      max="120" 
                      step="5"
                      value={intervalValue}
                      onChange={(e) => setIntervalValue(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5s (Rápido)</span>
                    <span>120s (Seguro)</span>
                  </div>
                </div>

                <div className={cn("space-y-3", isFiring && "opacity-50 pointer-events-none")}>
                  <Label className="text-sm font-medium">Sessão para Envio</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800">
                      <SelectValue placeholder="Selecione uma sessão conectada" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {sessions
                        .filter(s => s.status === 'connected')
                        .map(session => (
                          <SelectItem key={session.id} value={session.id} className="focus:bg-blue-500/10 focus:text-blue-400">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                              <span>{session.name}</span>
                              <span className="text-[10px] text-slate-500 ml-2">{session.phoneNumber}</span>
                            </div>
                          </SelectItem>
                        ))
                      }
                      {sessions.filter(s => s.status === 'connected').length === 0 && (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-500">Nenhuma sessão conectada encontrada.</p>
                          <Button variant="link" className="text-[10px] h-auto p-0 text-blue-500" onClick={() => window.location.href='/connectors'}>
                            Conectar uma agora
                          </Button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <FireButton 
                    intensity="medium"
                    className="w-full transition-all duration-500"
                    disabled={(contactsCount === null && totalSelectedContacts === 0 && availableContacts.length === 0) || isUploading || isFiring || !selectedSessionId || isStartingCampaign}
                    onClick={handleStartCampaign}
                    label={isFiring && activeCampaignId === campaign.id ? 'Campanha em Execução...' : 
                      isFiring ? 'Outra Campanha em Andamento' :
                      `Disparar Campanha para ${showContactSelector ? totalSelectedContacts : (contactsCount || availableContacts.length)} contatos`}
                  >
                    <Send className="w-4 h-4 mr-2" /> 
                    {isFiring && activeCampaignId === campaign.id ? 'Campanha em Execução...' : 
                     isFiring ? 'Outra Campanha em Andamento' :
                     `Disparar Campanha para ${showContactSelector ? totalSelectedContacts : (contactsCount || availableContacts.length)} contatos`}
                  </FireButton>
                </div>
              </div>
            </CardContent>
          </Card>

          <CampaignFiringModal
            isOpen={showFiringModal}
            onClose={() => setShowFiringModal(false)}
            onConfirm={confirmStartCampaign}
            campaignName={campaign.name}
            contactCount={showContactSelector ? totalSelectedContacts : (contactsCount ?? 0)}
            sessionName={sessions.find(s => s.id === selectedSessionId)?.name ?? 'Sessão Selecionada'}
            intervalSec={intervalValue}
            isSubmitting={isStartingCampaign}
          />

          <div className={cn("bg-muted/30 rounded-lg p-4 space-y-3", isFiring && "opacity-50 pointer-events-none")}>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Configurações de Envio
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="skip-duplicate" className="rounded border-muted-foreground/30" defaultChecked />
                <Label htmlFor="skip-duplicate" className="text-xs cursor-pointer">Ignorar números duplicados na lista</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="validation" className="rounded border-muted-foreground/30" defaultChecked />
                <Label htmlFor="validation" className="text-xs cursor-pointer">Validar formato de número internacional</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold">Detalhes do Agendamento</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada em:</span>
                <span>{formatDate(campaign.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal:</span>
                <span className="capitalize">{campaign.channel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 gap-0 bg-card border border-primary/30 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5),0_0_100px_-30px_hsl(var(--secondary)/0.4)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/10 overflow-hidden z-20 rounded-t-lg">
            <div className="h-full w-full river-progress-indicator" />
          </div>

          <DialogHeader className="px-6 pt-6 pb-4 border-b border-primary/20 relative z-10 bg-card/60 backdrop-blur-sm">
            <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                <Edit2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-neon-gradient">EDITAR CAMPANHA</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
              <div className="overflow-y-auto custom-scrollbar p-6 space-y-6 border-r border-primary/10">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Ex: Black Friday 2024"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Conteúdo da Mensagem</Label>
                <div className="relative border rounded-md focus-within:ring-1 focus-within:ring-primary">
                  <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormatting('*')}>
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormatting('_')}>
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormatting('~')}>
                      <Strikethrough className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Smile className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 border-none w-auto" side="top">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea 
                    ref={textAreaRef}
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="min-h-[200px] border-none focus-visible:ring-0 resize-none"
                    placeholder="Digite sua mensagem aqui..."
                  />
                  <div className="p-2 border-t bg-muted/30 flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold">
                    <span>Use {"{{nome}}"} para personalizar</span>
                    <span>{editedMessage.length} caracteres</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mídia da Campanha</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={mediaType === 'image' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" /> Imagem
                  </Button>
                  <Button 
                    variant={mediaType === 'video' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <Video className="w-4 h-4 mr-2" /> Vídeo
                  </Button>
                  <Button 
                    variant={mediaType === 'audio' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <FileAudio className="w-4 h-4 mr-2" /> Áudio
                  </Button>
                  {mediaType !== 'none' && (
                    <Button variant="ghost" size="sm" onClick={() => { setMediaType('none'); setMediaUrl(null); }}>
                      Remover
                    </Button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  className="hidden" 
                  onChange={handleMediaUpload}
                  accept="image/*,video/*,audio/*"
                />
              </div>

              <div className="space-y-2">
                <Label>Link da Campanha (opcional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={editedLink}
                      onChange={(e) => setEditedLink(e.target.value)}
                      className="pl-9"
                      placeholder="https://exemplo.com/promo"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">O link será exibido como um card na mensagem</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Botões Interativos (WhatsApp API)</Label>
                    <p className="text-xs text-muted-foreground">Adicione botões clicáveis à sua mensagem</p>
                  </div>
                  <Switch 
                    checked={buttonsEnabled} 
                    onCheckedChange={setButtonsEnabled} 
                  />
                </div>

                {buttonsEnabled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    {buttons.map((button, index) => (
                      <Card key={index} className="p-4 bg-muted/30 border-dashed relative">
                        <div className="absolute top-2 right-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setButtons(prev => prev.filter((_, i) => i !== index))}
                            disabled={buttons.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Texto do Botão</Label>
                            <Input 
                              value={button.text}
                              onChange={(e) => {
                                const newButtons = [...buttons];
                                newButtons[index].text = e.target.value;
                                setButtons(newButtons);
                              }}
                              placeholder="Ex: Saiba Mais"
                              maxLength={20}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Ação</Label>
                            <Select 
                              value={button.type} 
                              onValueChange={(val: any) => {
                                const newButtons = [...buttons];
                                newButtons[index].type = val;
                                setButtons(newButtons);
                              }}
                            >
                              <SelectTrigger className="h-9 bg-background border-primary/30 text-foreground hover:border-primary/60 focus:ring-primary/40 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.3)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-primary/30 text-popover-foreground shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                                <SelectItem value="url" className="focus:bg-primary/10 focus:text-primary cursor-pointer">Abrir Link (URL)</SelectItem>
                                <SelectItem value="call" className="focus:bg-primary/10 focus:text-primary cursor-pointer">Ligar para Número</SelectItem>
                                <SelectItem value="reply" className="focus:bg-primary/10 focus:text-primary cursor-pointer">Resposta Rápida (Texto)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="sm:col-span-2 space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {button.type === 'url' ? 'URL do Link' : button.type === 'call' ? 'Número de Telefone' : 'Texto da Resposta'}
                            </Label>
                            <div className="relative">
                              {button.type === 'url' && <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                              {button.type === 'call' && <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                              {button.type === 'reply' && <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                              <Input 
                                value={button.value}
                                onChange={(e) => {
                                  const newButtons = [...buttons];
                                  newButtons[index].value = e.target.value;
                                  setButtons(newButtons);
                                }}
                                className="pl-9 h-9"
                                placeholder={button.type === 'url' ? 'https://...' : button.type === 'call' ? '+55...' : 'Digite a resposta...'}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {buttons.length < 2 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-dashed h-10 border-primary/20 text-primary hover:bg-primary/5" 
                        onClick={() => setButtons(prev => [...prev, { text: 'Novo Botão', type: 'reply', value: 'Resposta' }])}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Segundo Botão
                      </Button>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* RIGHT: Sticky preview column */}
              <div className="hidden md:flex flex-col bg-gradient-to-br from-card via-card to-muted/20 p-6 overflow-y-auto custom-scrollbar relative">
                <div className="sticky top-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
                      Pré-visualização ao vivo
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">WhatsApp</span>
                  </div>
                  <div className="border border-primary/20 rounded-2xl overflow-hidden bg-[#E5DDD5] dark:bg-zinc-950 aspect-[9/16] max-h-[60vh] relative flex flex-col shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] mx-auto w-full max-w-[320px]">
                    <div className="bg-[#f6f6f6] dark:bg-zinc-900 border-b p-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate text-zinc-900 dark:text-zinc-100">Contato da Campanha</p>
                        <p className="text-[8px] text-zinc-500">online</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-2 overflow-y-auto" style={{ backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-bg.png")', backgroundSize: '300px' }}>
                      <div className="flex flex-col items-end">
                        <div className="max-w-[90%] bg-[#DCF8C6] dark:bg-[#056162] rounded-lg rounded-tr-none p-2 shadow-sm relative">
                          <div className="absolute top-0 -right-1.5 w-2 h-2 bg-[#DCF8C6] dark:bg-[#056162]" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                          
                          <div className="space-y-2">
                            {mediaUrl && (
                              <div className="rounded overflow-hidden">
                                {mediaType === 'image' && <img src={mediaUrl} className="w-full h-auto" />}
                                {mediaType === 'video' && <video src={mediaUrl} className="w-full h-auto" />}
                                {mediaType === 'audio' && <div className="p-2 bg-black/10 rounded flex items-center gap-2"><Mic className="w-4 h-4" /><div className="flex-1 h-1 bg-black/20 rounded-full" /></div>}
                              </div>
                            )}
                            <div className="text-[12px] leading-snug text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                              {formatWhatsAppMessage(editedMessage)}
                            </div>
                            {editedLink && (
                              <div className="bg-white/40 dark:bg-black/20 rounded p-1 flex items-center gap-2 border border-white/20">
                                <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center shrink-0">
                                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[8px] font-bold truncate uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Acesse nosso site</p>
                                  <p className="text-[7px] text-zinc-500 truncate">{editedLink}</p>
                                </div>
                              </div>
                            )}
                            {buttonsEnabled && buttons.length > 0 && (
                              <div className="w-full space-y-1 mt-2">
                                {buttons.map((btn, idx) => (
                                  <div key={idx} className="w-full bg-white dark:bg-zinc-800 py-1.5 px-3 rounded-md shadow-sm text-blue-500 text-[10px] font-medium flex items-center justify-center gap-1.5 border border-zinc-100 dark:border-zinc-700">
                                    {btn.type === 'url' && <ExternalLink className="w-2.5 h-2.5" />}
                                    {btn.type === 'call' && <PhoneCall className="w-2.5 h-2.5" />}
                                    {btn.type === 'reply' && <MessageSquare className="w-2.5 h-2.5" />}
                                    {btn.text || 'Botão ' + (idx + 1)}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="text-[8px] text-zinc-500 dark:text-zinc-400 text-right">14:30</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center uppercase font-bold tracking-wider">As alterações aparecem aqui em tempo real</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-primary/20 bg-card/60 backdrop-blur-sm relative z-10">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveEdit}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold shadow-[0_0_20px_-5px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.8)] hover:scale-[1.02] transition-all"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const { isFiring, activeCampaignId, progress } = useAppStore();
  const location = useLocation();

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const items = await campaignService.list();
      setCampaigns(items.map(toCampaignModel));
    } catch {
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const created = await campaignService.create({
        name: `Nova Campanha ${campaigns.length + 1}`,
        channel: 'whatsapp',
        messageContent: '',
        intervalSec: 15,
      });
      const normalized = toCampaignModel(created);
      setCampaigns((previous) => [normalized, ...previous]);
      setSelectedCampaign(normalized);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao criar campanha');
    }
  };

  useEffect(() => {
    loadCampaigns().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (location.state?.createNew) {
      handleCreateCampaign();
      // Clear the state to avoid creating a new campaign on every refresh/navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveCampaign = async (updatedCampaign: Campaign) => {
    try {
      const saved = await campaignService.update(updatedCampaign.id, {
        name: updatedCampaign.name,
        channel: updatedCampaign.channel,
        templateId: updatedCampaign.templateId,
        segmentId: updatedCampaign.segmentId,
        messageContent: updatedCampaign.messageContent,
        buttonsEnabled: updatedCampaign.buttonsEnabled ?? false,
        buttons: updatedCampaign.buttons ?? [],
        mediaType: updatedCampaign.mediaType as any,
        mediaUrl: updatedCampaign.mediaUrl,
      });
      const normalized = toCampaignModel(saved);
      setCampaigns((previous) => previous.map((campaign) => (campaign.id === normalized.id ? normalized : campaign)));
      setSelectedCampaign(normalized);
      toast.success('Campanha salva.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao salvar campanha');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await campaignService.remove(id);
      setCampaigns((previous) => previous.filter((campaign) => campaign.id !== id));
      setSelectedCampaign(null);
      toast.success('Campanha excluída.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao excluir');
    }
  };

  if (selectedCampaign) {
    return (
      <WhatsAppPreview 
        campaign={selectedCampaign} 
        onBack={() => setSelectedCampaign(null)} 
        onSave={handleSaveCampaign}
        onDelete={handleDeleteCampaign}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Crie e acompanhe suas campanhas de marketing.</p>
        </div>
        <Button 
          onClick={handleCreateCampaign}
          disabled={isFiring} 
          title={isFiring ? "Já existe uma campanha em andamento" : ""}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="rounded-full px-4 py-1">Todas</Badge>
          <span className="text-sm text-muted-foreground">{campaigns.length} campanhas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar campanhas..."
              className="pl-8 h-9 w-[200px] lg:w-[300px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" /> Filtrar
          </Button>
        </div>
      </div>

      {isLoadingCampaigns && (
        <div className="text-sm text-muted-foreground">Carregando campanhas...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => {
          const isRunning = campaign.status === 'running' || (isFiring && activeCampaignId === campaign.id);
          const StatusIcon = statusMap[campaign.status].icon;
          const ChannelIcon = channelIconMap[campaign.channel];
          const deliveryRate = isRunning 
            ? Math.round(progress)
            : (campaign.sentCount > 0 ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100) : 0);

          return (
            <Card 
              key={campaign.id} 
              className={cn(
                "flex flex-col cursor-pointer transition-all duration-500 group relative",
                isRunning ? "animate-energy-glow border-primary scale-[1.02] z-10" : "hover:border-primary/50"
              )}
              onClick={() => setSelectedCampaign(campaign)}
            >
              {isRunning && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <Badge className="bg-primary text-primary-foreground font-black px-4 py-1.5 shadow-[0_0_15px_rgba(34,211,238,0.8)] border-none animate-bounce flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    EM ANDAMENTO
                  </Badge>
                </div>
              )}

              <CardContent className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isRunning ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
                  )}>
                    <ChannelIcon className={cn("w-5 h-5", isRunning ? "text-primary animate-pulse" : "text-primary")} />
                  </div>
                  <Badge variant={isRunning ? 'default' : statusMap[campaign.status].variant}>
                    <StatusIcon className={cn("w-3 h-3 mr-1", isRunning && "animate-spin")} />
                    {isRunning ? 'Executando' : statusMap[campaign.status].label}
                  </Badge>
                </div>
                
                <h3 className="font-extrabold text-xl mb-1 truncate tracking-tight">{campaign.name}</h3>
                <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Criada em {formatDate(campaign.createdAt)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/30 rounded-xl border border-primary/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3" /> Público
                    </p>
                    <p className="text-sm font-bold">{campaign.sentCount.toLocaleString()} contatos</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Canal</p>
                    <p className="text-sm font-bold capitalize">{campaign.channel}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground uppercase tracking-widest">Progresso de Entrega</span>
                      <span className={cn(isRunning ? "text-primary" : "text-muted-foreground")}>{deliveryRate}%</span>
                    </div>
                    <div className="w-full h-3 bg-primary/10 rounded-full relative border border-primary/5">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000 ease-out rounded-full",
                          isRunning ? "river-progress-indicator scale-y-125" : "bg-primary"
                        )}
                        style={{ width: `${deliveryRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                      <p className="text-[10px] text-green-500/70 uppercase font-black tracking-tighter">Entregues</p>
                      <p className="text-lg font-black text-green-500">{campaign.deliveredCount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-zinc-500/5 rounded-xl border border-zinc-500/10">
                      <p className="text-[10px] text-zinc-500/70 uppercase font-black tracking-tighter">Status</p>
                      <p className="text-lg font-black text-zinc-500 capitalize">{campaign.status}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t bg-muted/50 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCampaign(campaign);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFiring && activeCampaignId === campaign.id) {
                      toast.error('Campanha em execução não pode ser deletada. Cancele-a primeiro.');
                      return;
                    }
                    toast(`Excluir "${campaign.name}"?`, {
                      action: {
                        label: 'Excluir',
                        onClick: () => handleDeleteCampaign(campaign.id),
                      },
                      cancel: { label: 'Cancelar', onClick: () => undefined },
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};


