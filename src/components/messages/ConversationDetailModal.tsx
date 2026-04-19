import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  FileText, 
  Download, 
  UserPlus, 
  BarChart3, 
  MoreVertical,
  Phone,
  MessageCircle,
  MessageSquare,
  Copy,
  Hash,
  Type,
  Maximize2,
  Trash2,
  CheckCircle2,
  Check,
  Mic,
  Paperclip,
  Tag as TagIcon,
  User,
  Plus,
  ArrowDownToLine,
  Trash,
  Music,
  Pause,
  Play,
  Square,
  Save,
  FileSpreadsheet,
  FileJson,
  Loader2,
  ChevronRight,
  ExternalLink,
  PhoneCall,
  Video
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button, Badge, Card } from '../ui/shared';
import { cn } from '../../lib/utils';
import { Conversation, Message, Campaign, CampaignButton } from '../../types';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { conversationService } from '../../services/conversationService';
import { campaignService } from '../../services/campaignService';
import { templateService } from '../../services/templateService';
import { apiClient } from '../../services/apiClient';
import { useSessionStore } from '../../store/useSessionStore';

interface ConversationDetailModalProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const formatWhatsAppMessage = (text: string) => {
  if (!text) return text;
  
  // Bold: *text* -> <strong>text</strong>
  let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  // Italic: _text_ -> <em>text</em>
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Strikethrough: ~text~ -> <del>text</del>
  formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
  
  // Monospace: ```text``` -> <code>text</code>
  formatted = formatted.replace(/```(.*?)```/g, '<code>$1</code>');
  
  // New lines: \n -> <br />
  formatted = formatted.split('\n').join('<br />');
  
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

export const ConversationDetailModal: React.FC<ConversationDetailModalProps> = ({ conversation, isOpen, onClose, onDelete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tags, setTags] = useState<string[]>(['Lead', 'Black Friday']);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  
  // New States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCampaignPreviewOpen, setIsCampaignPreviewOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { sessions } = useSessionStore();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [importForm, setImportForm] = useState({ 
    name: conversation.contactName, 
    number: conversation.phone || '', 
    toKanban: false 
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;
    conversationService.getMessages(conversation.id)
      .then(setMessages)
      .catch(() => setMessages([]));
    campaignService.list()
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, [isOpen, conversation.id]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const content = inputValue;
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: conversation.id,
      direction: 'outbound',
      content,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    try {
      const sessionId = sessions.find(s => s.status === 'connected')?.id;
      await apiClient.post('/api/messages/send', {
        sessionId,
        phone: conversation.phone,
        content,
      });
    } catch {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'failed' } : m));
      toast.error('Falha ao enviar mensagem.');
    }
  };

  const handleDownloadProfilePic = () => {
    setIsProfilePicModalOpen(true);
  };

  const downloadImage = () => {
    toast.success('Iniciando download da foto de perfil...');
  };

  const handleDownloadContact = () => {
    setIsDownloadModalOpen(true);
  };

  const handleImportContact = () => {
    setIsImportModalOpen(true);
  };

  const confirmImport = () => {
    toast.success(`${importForm.name} importado para o CRM.`);
    setIsImportModalOpen(false);
  };

  const handleDownload = (type: 'csv' | 'excel') => {
    toast.loading(`Gerando arquivo ${type.toUpperCase()}...`);
    setTimeout(() => {
      toast.success(`Download de ${conversation.contactName}.${type === 'csv' ? 'csv' : 'xlsx'} concluído!`);
      setIsDownloadModalOpen(false);
    }, 1500);
  };

  const handleExtractData = () => {
    toast.loading('Extraindo dados da conversa...');
    setTimeout(() => toast.success('Dados extraídos e processados pela IA.'), 1500);
  };

  const handleSendCampaign = () => {
    setIsCampaignModalOpen(true);
  };

  const confirmSendCampaign = () => {
    toast.success(`Campanha "${selectedCampaign.name}" enviada para ${conversation.contactName}!`);
    setIsCampaignPreviewOpen(false);
    setIsCampaignModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleDeleteChat = () => {
    if (confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
      onDelete?.(conversation.id);
      onClose();
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (deleteConfirmId === id) {
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success('Mensagem removida');
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setShowTagInput(false);
      toast.success('Tag adicionada.');
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPendingFiles(prev => [...prev, ...filesArray]);
      toast.success(`${filesArray.length} arquivo(s) importado(s) e aguardando envio.`);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = () => {
    setIsAudioModalOpen(true);
    startRecording();
  };

  const startRecording = () => {
    setAudioStatus('recording');
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const pauseRecording = () => {
    setAudioStatus('paused');
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const resumeRecording = () => {
    setAudioStatus('recording');
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setAudioStatus('finished');
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const saveRecording = () => {
    toast.success('Áudio gravado e enviado!');
    setIsAudioModalOpen(false);
    setAudioStatus('idle');
    setRecordingTime(0);
    
    // Add audio message
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: conversation.id,
      direction: 'outbound',
      content: '🎤 Áudio enviado',
      type: 'text', // simplification
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageTicks = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3 text-muted-foreground/50" />;
      case 'delivered': return <div className="flex -space-x-1.5"><Check className="w-3 h-3 text-muted-foreground" /><Check className="w-3 h-3 text-muted-foreground" /></div>;
      case 'read': return <div className="flex -space-x-1.5"><Check className="w-3 h-3 text-primary" /><Check className="w-3 h-3 text-primary" /></div>;
      default: return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1000px] h-[85vh] p-0 gap-0 bg-card/95 backdrop-blur-3xl border-primary/20 shadow-[0_0_50px_-10px_rgba(var(--primary),0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
          <style>{`
            @keyframes kamehameha {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .kamehameha-glow {
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              background-size: 200% 100%;
              animation: kamehameha 3s linear infinite;
            }
          `}</style>
          {/* Header */}
          <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div 
                  onClick={handleDownloadProfilePic}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary p-0.5 cursor-pointer relative overflow-hidden"
                >
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                    {conversation.avatar ? (
                      <img src={conversation.avatar} alt={conversation.contactName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="font-bold text-lg text-primary">{conversation.contactName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {conversation.contactName}
                  <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20">WhatsApp</Badge>
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {conversation.phone || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadContact} className="h-9 px-3 gap-2 border-primary/20 hover:bg-primary/5 transition-all hover:scale-105 active:scale-95">
                <Download className="w-4 h-4" /> Baixar Contato
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportContact} className="h-9 px-3 gap-2 border-primary/20 hover:bg-primary/5 transition-all hover:scale-105 active:scale-95">
                <UserPlus className="w-4 h-4" /> Importar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteChat} className="h-9 w-9 p-0 transition-all hover:rotate-6">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-muted/10 relative">
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "max-w-[70%] p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 relative group overflow-hidden",
                      msg.direction === 'outbound' 
                        ? "ml-auto bg-primary text-primary-foreground rounded-tr-none shadow-[0_10px_20px_-10px_rgba(var(--primary),0.3)]" 
                        : "mr-auto bg-card border border-primary/10 rounded-tl-none shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Kamehameha Effect */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                      <div className="absolute bottom-0 left-0 w-full h-[2px] kamehameha-glow opacity-50" />
                    </div>

                    {/* Delete Message Button */}
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className={cn(
                        "absolute top-2 right-2 px-1.5 py-1 rounded-md transition-all text-[10px] font-bold",
                        deleteConfirmId === msg.id 
                          ? "bg-destructive text-white opacity-100" 
                          : "bg-black/5 hover:bg-black/10 opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {deleteConfirmId === msg.id ? "Confirmar?" : <Trash className="w-3 h-3" />}
                    </button>

                    <p className="text-sm leading-relaxed relative z-10">{msg.content}</p>
                    <div className={cn(
                      "text-[10px] mt-2 flex items-center justify-end gap-1 opacity-70 relative z-10",
                      msg.direction === 'outbound' ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.direction === 'outbound' && renderMessageTicks(msg.status || 'sent')}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="mr-auto bg-card border border-primary/10 p-3 rounded-2xl rounded-tl-none animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Pending Files Preview */}
              {pendingFiles.length > 0 && (
                <div className="px-4 py-2 border-t border-primary/10 bg-primary/5 flex gap-2 overflow-x-auto custom-scrollbar">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-card border border-primary/20 px-3 py-1.5 rounded-xl shrink-0 animate-in zoom-in-95">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold truncate max-w-[100px]">{file.name}</span>
                        <span className="text-[8px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => removePendingFile(i)} className="p-1 hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary pl-2 italic">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Aguardando envio...
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-primary/10 bg-card/50">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Type className="w-4 h-4" /></Button>
                    <Button onClick={handleFileClick} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Paperclip className="w-4 h-4" /></Button>
                    <Button onClick={handleFileClick} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><ImageIcon className="w-4 h-4" /></Button>
                    <div className="w-[1px] h-4 bg-primary/20 mx-1" />
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase text-primary/60 hover:text-primary">*Negrito*</Button>
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase text-primary/60 hover:text-primary">_Itálico_</Button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    multiple 
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full min-h-[44px] max-h-32 bg-background border border-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none custom-scrollbar"
                      placeholder="Digite sua mensagem..."
                      rows={1}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      onClick={toggleRecording}
                      variant="ghost"
                      className="h-11 w-11 rounded-xl shrink-0 transition-all hover:bg-primary/10 group"
                    >
                      <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() && pendingFiles.length === 0}
                      className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Options */}
            <div className="w-80 border-l border-primary/10 bg-card/80 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Ações Rápidas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleExtractData} className="flex flex-col h-auto py-3 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group">
                    <BarChart3 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Extrair Dados</span>
                  </Button>
                  <Button variant="outline" onClick={handleSendCampaign} className="flex flex-col h-auto py-3 gap-2 border-primary/10 hover:border-primary/40 bg-primary/5 group">
                    <Send className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Enviar Campanha</span>
                  </Button>
                </div>
              </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Informações do Contato</h4>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-muted/20 border border-primary/10 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Número Interno</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{conversation.phone}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(conversation.phone || '');
                        toast.success('Copiado!');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-primary/10 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Última Interação</p>
                  <p className="text-sm">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</h4>
                <TagIcon className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 group">
                    {tag}
                    <X 
                      className="w-2.5 h-2.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={() => setTags(tags.filter(t => t !== tag))}
                    />
                  </Badge>
                ))}
                
                {showTagInput ? (
                  <div className="flex items-center gap-1 w-full mt-2">
                    <input 
                      autoFocus
                      className="flex-1 bg-background border border-primary/20 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Nova tag..."
                    />
                    <Button size="sm" className="h-7 px-2" onClick={handleAddTag}>OK</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowTagInput(false)}><X className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold border border-dashed rounded-full leading-none whitespace-nowrap gap-1 border-muted-foreground/30 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" /> Tag
                  </button>
                )}
              </div>
            </section>

            <div className="mt-auto pt-6 space-y-2">
              <Button variant="outline" onClick={handleDeleteChat} className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
                <Trash className="w-4 h-4" /> Excluir Conversa
              </Button>
              <Button variant="destructive" className="w-full gap-2 opacity-50 hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" /> Bloquear Contato
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Import Contact Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Número (Corrigir se necessário)</Label>
              <Input 
                value={importForm.number} 
                onChange={e => setImportForm({...importForm, number: e.target.value})}
                placeholder="Ex: 5511999999999"
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
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmImport} className="bg-primary hover:bg-primary/90">Confirmar Importação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Contact Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
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
          <Button variant="ghost" className="w-full text-xs" onClick={() => setIsDownloadModalOpen(false)}>Cancelar</Button>
        </DialogContent>
      </Dialog>

      {/* Audio Recording Modal */}
      <Dialog open={isAudioModalOpen} onOpenChange={(open) => {
        if (!open) stopRecording();
        setIsAudioModalOpen(open);
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
              {audioStatus === 'recording' ? 'Gravando Áudio...' : audioStatus === 'paused' ? 'Gravação Pausada' : 'Gravação Finalizada'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {audioStatus === 'recording' ? (
              <Button variant="outline" className="h-12 w-12 p-0 rounded-full" onClick={pauseRecording}>
                <Pause className="w-5 h-5" />
              </Button>
            ) : audioStatus === 'paused' ? (
              <Button variant="outline" className="h-12 w-12 p-0 rounded-full" onClick={resumeRecording}>
                <Play className="w-5 h-5" />
              </Button>
            ) : null}

            {audioStatus !== 'finished' && (
              <Button variant="destructive" className="h-16 w-16 p-0 rounded-full shadow-lg shadow-destructive/20" onClick={stopRecording}>
                <Square className="w-6 h-6" />
              </Button>
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
                  <Button variant="outline" className="flex-1" onClick={() => startRecording()}>Gravar Novamente</Button>
                  <Button className="bg-primary hover:bg-primary/90 gap-2 flex-1" onClick={saveRecording}>
                    <Save className="w-4 h-4" /> Enviar Áudio
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setIsAudioModalOpen(false)}>Cancelar</Button>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Modal */}
      <Dialog open={isProfilePicModalOpen} onOpenChange={setIsProfilePicModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <div className="relative group">
            <div className="aspect-square w-full bg-card rounded-2xl overflow-hidden border border-primary/20 shadow-2xl">
              {conversation.avatar ? (
                <img src={conversation.avatar} alt={conversation.contactName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <User className="w-32 h-32 text-primary/20" />
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 animate-in slide-in-from-bottom-4">
              <Button onClick={downloadImage} className="bg-primary/90 hover:bg-primary backdrop-blur-md gap-2 shadow-xl">
                <Download className="w-4 h-4" /> Baixar Foto
              </Button>
              <Button variant="secondary" onClick={() => setIsProfilePicModalOpen(false)} className="bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md">
                Sair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {isCampaignPreviewOpen ? 'Confirmar Envio' : 'Enviar Campanha'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {!isCampaignPreviewOpen ? (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecione uma Campanha</Label>
                <div className="grid gap-3">
                  {campaigns.map(campaign => {
                    const template = undefined;
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] group flex gap-4",
                          selectedCampaign?.id === campaign.id 
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)]" 
                            : "bg-muted/30 border-primary/10 hover:border-primary/30"
                        )}
                      >
                        {campaign.mediaUrl && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-primary/10 bg-muted/50">
                            {campaign.mediaType === 'image' ? (
                              <img src={campaign.mediaUrl} alt={campaign.name} className="w-full h-full object-cover" />
                            ) : campaign.mediaType === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-black/20">
                                <Video className="w-6 h-6 text-primary" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/20">
                                <FileText className="w-6 h-6 text-primary" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{campaign.name}</h4>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20">
                              {campaign.channel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">
                            {template?.content.replace('{{nome}}', conversation.contactName)}
                          </p>
                          {campaign.buttonsEnabled && campaign.buttons && campaign.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {campaign.buttons.map((btn, i) => (
                                <span key={i} className="text-[10px] bg-primary/5 text-primary/70 px-2 py-0.5 rounded border border-primary/10 flex items-center gap-1">
                                  {btn.type === 'url' && <ExternalLink className="w-2.5 h-2.5" />}
                                  {btn.type === 'call' && <PhoneCall className="w-2.5 h-2.5" />}
                                  {btn.type === 'reply' && <MessageSquare className="w-2.5 h-2.5" />}
                                  {btn.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview da Mensagem</h4>
                  <div className="p-0 overflow-hidden bg-[#E5DDD5] dark:bg-zinc-950 rounded-2xl border border-primary/20 relative min-h-[350px] flex flex-col shadow-2xl">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-bg.png")', backgroundSize: '400px', backgroundRepeat: 'repeat' }} />
                    
                    <div className="relative p-6 flex flex-col gap-1 items-end z-10">
                      <div className="max-w-[90%] bg-[#DCF8C6] dark:bg-[#056162] rounded-lg rounded-tr-none p-2 shadow-md relative">
                        <div className="absolute top-0 -right-2 w-3 h-3 bg-[#DCF8C6] dark:bg-[#056162]" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                        
                        <div className="p-1 space-y-3">
                          {selectedCampaign?.mediaUrl && (
                            <div className="rounded-md overflow-hidden bg-white/50 dark:bg-black/20">
                              {selectedCampaign.mediaType === 'image' ? (
                                <img src={selectedCampaign.mediaUrl} alt="Mídia" className="w-full aspect-video object-cover" />
                              ) : selectedCampaign.mediaType === 'video' ? (
                                <div className="aspect-video bg-black/20 flex items-center justify-center">
                                  <Video className="w-10 h-10 text-white/50" />
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div className="px-1 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                            {formatWhatsAppMessage(selectedCampaign?.messageContent?.replace('{{nome}}', conversation.contactName) || '')}
                          </div>
                          
                          <div className="flex items-center justify-end gap-1 px-1 pb-1 opacity-50">
                            <span className="text-[10px]">14:30</span>
                            <div className="flex -space-x-1">
                              <Check className="w-3 h-3 text-blue-500" />
                              <Check className="w-3 h-3 text-blue-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedCampaign?.buttonsEnabled && selectedCampaign?.buttons && (
                        <div className="max-w-[90%] w-full space-y-1 mt-1">
                          {selectedCampaign.buttons.map((btn, idx) => (
                            <div key={idx} className="w-full bg-white dark:bg-zinc-800 py-2.5 px-4 rounded-lg shadow-sm text-blue-500 text-[14px] font-medium flex items-center justify-center gap-2 border border-zinc-100 dark:border-zinc-700">
                              {btn.type === 'url' && <ExternalLink className="w-3.5 h-3.5" />}
                              {btn.type === 'call' && <PhoneCall className="w-3.5 h-3.5" />}
                              {btn.type === 'reply' && <MessageSquare className="w-3.5 h-3.5" />}
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary">
                  <div className="p-2 bg-primary/10 rounded-full shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Confirmação de Envio</p>
                    <p className="text-[10px] opacity-80">Esta campanha será enviada imediatamente para o contato {conversation.contactName}.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              if (isCampaignPreviewOpen) setIsCampaignPreviewOpen(false);
              else setIsCampaignModalOpen(false);
            }}>
              {isCampaignPreviewOpen ? 'Voltar e Alterar' : 'Cancelar'}
            </Button>
            <Button 
              disabled={!selectedCampaign}
              onClick={() => {
                if (isCampaignPreviewOpen) confirmSendCampaign();
                else setIsCampaignPreviewOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isCampaignPreviewOpen ? 'Confirmar e Enviar Agora' : 'Ver Preview Completo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
