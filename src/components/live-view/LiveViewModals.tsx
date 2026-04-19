import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  UserPlus, 
  Mic, 
  Pause, 
  Play, 
  Square, 
  Save, 
  FileSpreadsheet, 
  FileJson,
  History,
  ShieldAlert,
  Calendar,
  Clock,
  MessageSquare,
  ArrowRight,
  Megaphone,
  CheckCircle2,
  AlertCircle
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
import { LiveConversation } from './types';
import { cn } from '@/lib/utils';
import { campaignService } from '@/services/campaignService';
import type { Campaign } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveViewModalsProps {
  conversation: LiveConversation;
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
}

export const LiveViewModals: React.FC<LiveViewModalsProps> = ({ 
  conversation, 
  modals, 
  onClose,
  onConfirmImport,
  onConfirmBlock
}) => {
  const [importForm, setImportForm] = useState({ 
    name: conversation.contactName, 
    number: conversation.phoneNumber, 
    toKanban: false 
  });
  
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = (type: 'csv' | 'excel') => {
    toast.loading(`Gerando arquivo ${type.toUpperCase()}...`);
    setTimeout(() => {
      toast.success(`Download de ${conversation.contactName}.${type === 'csv' ? 'csv' : 'xlsx'} concluído!`);
      onClose('download');
    }, 1500);
  };

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    campaignService.list().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  return (
    <>
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
              <Input placeholder="Filtrar campanhas..." className="bg-white/5 border-white/10 pl-10" />
              <Megaphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {campaigns.map((camp) => (
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
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedCampaign === camp.id ? "bg-primary text-white" : "bg-slate-800 text-slate-400"
                    )}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{camp.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{camp.channel}</p>
                    </div>
                  </div>
                  {selectedCampaign === camp.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary animate-in zoom-in duration-300" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">Nota Importante</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">O disparo será processado pelo seu gateway atual e pode levar alguns segundos para aparecer no histórico.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onClose('campaign')}>Cancelar</Button>
            <Button 
              disabled={!selectedCampaign}
              onClick={() => {
                toast.success('Campanha enviada com sucesso!');
                onClose('campaign');
                setSelectedCampaign(null);
              }}
              className="bg-primary hover:bg-primary/90 gap-2 font-bold"
            >
              <ArrowRight className="w-4 h-4" /> Enviar Agora
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
                onChange={e => setImportForm({...importForm, name: e.target.value})}
                placeholder="Nome completo"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input 
                value={importForm.number} 
                onChange={e => setImportForm({...importForm, number: e.target.value})}
                placeholder="Ex: 5511999999999"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Importar para Kanban</Label>
                <p className="text-[10px] text-muted-foreground">Adiciona automaticamente ao seu fluxo de vendas.</p>
              </div>
              <Switch 
                checked={importForm.toKanban}
                onCheckedChange={val => setImportForm({...importForm, toKanban: val})}
              />
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

      {/* Download Contact Modal */}
      <Dialog open={modals.download} onOpenChange={() => onClose('download')}>
        <DialogContent className="sm:max-w-[300px] bg-card border-primary/20 animate-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="text-center">Escolha o formato</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button 
              variant="outline" 
              onClick={() => handleDownload('csv')}
              className="flex flex-col h-auto py-6 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group"
            >
              <FileSpreadsheet className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">CSV</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleDownload('excel')}
              className="flex flex-col h-auto py-6 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group"
            >
              <FileJson className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">EXCEL</span>
            </Button>
          </div>
          <Button variant="ghost" className="w-full text-xs" onClick={() => onClose('download')}>Cancelar</Button>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={modals.history} onOpenChange={() => onClose('history')}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] bg-[#0b141a] border-white/10 p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/5 bg-card/50">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <History className="w-6 h-6 text-primary" />
              Histórico Completo
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Linha do tempo detalhada de todas as interações com {conversation.contactName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="relative pl-8 space-y-8">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-transparent" />
              
              {[
                { date: 'Hoje', time: '14:20', type: 'message', title: 'Mensagem Recebida', content: 'Olá, gostaria de saber mais sobre o plano Pro.', status: 'read' },
                { date: 'Hoje', time: '14:22', type: 'message', title: 'Mensagem Enviada', content: 'Claro! Nosso plano Pro oferece acesso ilimitado...', status: 'delivered' },
                { date: 'Ontem', time: '10:00', type: 'event', title: 'Conversa Iniciada', content: 'Primeiro contato via Campanha Black Friday', icon: <MessageSquare className="w-3 h-3" /> },
                { date: '15 Out', time: '16:45', type: 'event', title: 'Tag Adicionada', content: 'Tag "Lead Quente" adicionada automaticamente pela IA', icon: <ArrowRight className="w-3 h-3" /> },
                { date: '12 Out', time: '09:15', type: 'event', title: 'Lead Capturado', content: 'Origem: Formulário Landing Page', icon: <UserPlus className="w-3 h-3" /> }
              ].map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="relative"
                >
                  <div className="absolute -left-[29px] w-6 h-6 rounded-full bg-[#0b141a] border-2 border-primary flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{item.date} • {item.time}</span>
                        <Badge variant="outline" className="text-[8px] border-white/10 text-slate-400">{item.title}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{item.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-white/5 bg-card/30 flex justify-end">
            <Button onClick={() => onClose('history')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white">
              Fechar Histórico
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Contact Modal */}
      <Dialog open={modals.block} onOpenChange={() => onClose('block')}>
        <DialogContent className="sm:max-w-[400px] bg-card border-rose-500/20 animate-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="w-6 h-6" />
              Bloquear Contato?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Ao bloquear <strong>{conversation.contactName}</strong>, você não receberá mais mensagens ou chamadas deste contato. Esta ação pode ser revertida a qualquer momento nas configurações.
            </p>
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Denunciar SPAM</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Excluir histórico de mensagens</Label>
                <Switch />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onClose('block')}>Cancelar</Button>
            <Button 
              onClick={() => {
                onConfirmBlock?.();
                onClose('block');
                toast.error(`${conversation.contactName} foi bloqueado.`);
              }} 
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
            >
              Bloquear Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Audio Recording Modal */}
      <Dialog open={modals.audio} onOpenChange={(open) => {
        if (!open) {
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
          setAudioStatus('idle');
          setRecordingTime(0);
        }
        onClose('audio');
      }}>
        <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-primary/20 p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative">
            {audioStatus === 'recording' && (
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
            )}
            <Mic className={cn("w-10 h-10 transition-colors", audioStatus === 'recording' ? "text-primary" : "text-muted-foreground")} />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black tracking-tight">{formatTime(recordingTime)}</h2>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
              {audioStatus === 'recording' ? 'Gravando Áudio...' : audioStatus === 'paused' ? 'Gravação Pausada' : audioStatus === 'finished' ? 'Gravação Finalizada' : 'Pronto para gravar'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {audioStatus === 'idle' && (
              <Button 
                onClick={() => {
                  setAudioStatus('recording');
                  recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
                }}
                className="bg-primary hover:bg-primary/90 rounded-full h-16 w-16 shadow-lg shadow-primary/20"
              >
                <Mic className="w-8 h-8" />
              </Button>
            )}

            {audioStatus === 'recording' && (
              <>
                <Button variant="outline" className="h-12 w-12 p-0 rounded-full" onClick={() => {
                  setAudioStatus('paused');
                  if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                }}>
                  <Pause className="w-5 h-5" />
                </Button>
                <Button variant="destructive" className="h-16 w-16 p-0 rounded-full shadow-lg shadow-destructive/20" onClick={() => {
                  setAudioStatus('finished');
                  if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                }}>
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}

            {audioStatus === 'paused' && (
              <>
                <Button variant="outline" className="h-12 w-12 p-0 rounded-full" onClick={() => {
                  setAudioStatus('recording');
                  recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
                }}>
                  <Play className="w-5 h-5" />
                </Button>
                <Button variant="destructive" className="h-16 w-16 p-0 rounded-full shadow-lg shadow-destructive/20" onClick={() => {
                  setAudioStatus('finished');
                  if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                }}>
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}
            
            {audioStatus === 'finished' && (
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3 w-full p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => {
                      setIsPlayingAudio(!isPlayingAudio);
                      if (!isPlayingAudio) setTimeout(() => setIsPlayingAudio(false), 3000);
                    }}
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
                  </Button>
                  <div className="flex-1 h-1 bg-primary/10 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full bg-primary transition-all duration-300", isPlayingAudio ? "w-full" : "w-0")}
                      style={{ transitionDuration: isPlayingAudio ? '3000ms' : '0ms' }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setAudioStatus('recording');
                    setRecordingTime(0);
                    recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
                  }}>Gravar Novamente</Button>
                  <Button className="bg-primary hover:bg-primary/90 gap-2 flex-1" onClick={() => {
                    toast.success('Áudio enviado com sucesso!');
                    onClose('audio');
                    setAudioStatus('idle');
                    setRecordingTime(0);
                  }}>
                    <Save className="w-4 h-4" /> Enviar Áudio
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => onClose('audio')}>Cancelar</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};