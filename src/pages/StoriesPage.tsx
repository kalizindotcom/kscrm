import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Send,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSessionStore } from '@/store/useSessionStore';
import { SessionSelector } from '@/components/shared/SessionSelector';
import { sessionService } from '@/services/sessionService';
import { storiesService, StoryContact, Story } from '@/services/storiesService';

export function StoriesPage() {
  const { sessions, setSessions, selectedSessionId, selectSession } = useSessionStore();
  const [contacts, setContacts] = useState<StoryContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<StoryContact | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeSession = sessions.find((s) => s.id === selectedSessionId && s.status === 'connected') ||
    sessions.find((s) => s.status === 'connected') || null;

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadStories();
    }
  }, [activeSession?.id]);

  // Auto-advance stories
  useEffect(() => {
    if (!selectedContact || !isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [selectedContact, currentStoryIndex, isPlaying]);

  const loadSessions = async () => {
    try {
      const sessionList = await sessionService.list();
      setSessions(sessionList);

      // Auto-select first connected session
      const connectedSession = sessionList.find((s) => s.status === 'connected');
      if (connectedSession && !selectedSessionId) {
        selectSession(connectedSession.id);
      }
    } catch (error) {
      toast.error('Erro ao carregar sessões');
    }
  };

  const loadStories = async () => {
    if (!activeSession) return;

    setLoading(true);
    try {
      const data = await storiesService.list(activeSession.id);
      setContacts(data);
    } catch (error: any) {
      console.error('Erro ao carregar stories:', error);
      toast.error(error?.message || 'Erro ao carregar stories');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStories();
    setIsRefreshing(false);
    toast.success('Stories atualizados!');
  };

  const handleContactClick = async (contact: StoryContact) => {
    setSelectedContact(contact);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPlaying(true);

    // Marcar primeiro story como visualizado
    if (contact.stories.length > 0 && !contact.stories[0].isViewed && activeSession) {
      try {
        await storiesService.markViewed(activeSession.id, contact.stories[0].id);
        // Atualizar estado local
        setContacts(prev => prev.map(c => {
          if (c.jid === contact.jid) {
            const updatedStories = c.stories.map((s, idx) =>
              idx === 0 ? { ...s, isViewed: true } : s
            );
            return {
              ...c,
              stories: updatedStories,
              hasUnviewed: updatedStories.some(s => !s.isViewed),
            };
          }
          return c;
        }));
      } catch (error) {
        console.error('Erro ao marcar story como visualizado:', error);
      }
    }
  };

  const handleNextStory = async () => {
    if (!selectedContact || !activeSession) return;

    if (currentStoryIndex < selectedContact.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setProgress(0);

      // Marcar próximo story como visualizado
      const nextStory = selectedContact.stories[nextIndex];
      if (!nextStory.isViewed) {
        try {
          await storiesService.markViewed(activeSession.id, nextStory.id);
          setContacts(prev => prev.map(c => {
            if (c.jid === selectedContact.jid) {
              const updatedStories = c.stories.map((s, idx) =>
                idx === nextIndex ? { ...s, isViewed: true } : s
              );
              return {
                ...c,
                stories: updatedStories,
                hasUnviewed: updatedStories.some(s => !s.isViewed),
              };
            }
            return c;
          }));
        } catch (error) {
          console.error('Erro ao marcar story como visualizado:', error);
        }
      }
    } else {
      // Próximo contato
      const currentIndex = contacts.findIndex((c) => c.jid === selectedContact.jid);
      if (currentIndex < contacts.length - 1) {
        handleContactClick(contacts[currentIndex + 1]);
      } else {
        setSelectedContact(null);
      }
    }
  };

  const handlePrevStory = () => {
    if (!selectedContact) return;

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else {
      // Contato anterior
      const currentIndex = contacts.findIndex((c) => c.jid === selectedContact.jid);
      if (currentIndex > 0) {
        const prevContact = contacts[currentIndex - 1];
        setSelectedContact(prevContact);
        setCurrentStoryIndex(prevContact.stories.length - 1);
        setProgress(0);
      }
    }
  };

  const handleDownload = async (story: Story) => {
    if (!story.mediaUrl || !activeSession) return;

    try {
      const url = storiesService.getMediaUrl(activeSession.id, story.id);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `story-${story.id}.${story.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('Story baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar story:', error);
      toast.error('Erro ao baixar story');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedContact || !activeSession) return;

    const currentStory = selectedContact.stories[currentStoryIndex];
    if (!currentStory) return;

    try {
      await storiesService.reply(
        activeSession.id,
        currentStory.id,
        selectedContact.jid,
        replyText
      );
      toast.success('Resposta enviada!');
      setReplyText('');
    } catch (error: any) {
      console.error('Erro ao enviar resposta:', error);
      toast.error(error?.message || 'Erro ao enviar resposta');
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours < 1) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  const currentStory = selectedContact?.stories[currentStoryIndex];

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md w-full bg-card/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Nenhuma Sessão Conectada</h2>
          <p className="text-muted-foreground mb-6">
            Para visualizar stories, você precisa ter uma sessão ativa e conectada.
          </p>
          <Button
            onClick={() => window.location.href = '/connectors'}
            className="bg-primary hover:bg-primary/90"
          >
            Conectar Sessão
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-neon-gradient flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-primary" />
            Stories
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e interaja com os stories dos seus contatos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SessionSelector
            sessions={sessions}
            selectedSessionId={activeSession.id}
            onSelectSession={selectSession}
          />
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="bg-primary/10 border-primary/20 hover:bg-primary/20"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </motion.div>

      {/* Stories Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/40 backdrop-blur-xl border-primary/20">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum story disponível</h3>
                <p className="text-sm text-muted-foreground">
                  Não há stories para visualizar no momento
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {contacts.map((contact, index) => (
                  <motion.button
                    key={contact.jid}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleContactClick(contact)}
                    className="relative group"
                  >
                    {/* Border gradient wrapper */}
                    <div className={cn(
                      'w-full aspect-[3/4] rounded-2xl p-1 transition-all shadow-lg',
                      contact.hasUnviewed
                        ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
                        : 'bg-gray-600'
                    )}>
                      <div className="w-full h-full rounded-xl overflow-hidden bg-background">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-4xl font-bold text-primary">
                              {contact.name[0]}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-xl" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm font-semibold truncate drop-shadow-lg">
                            {contact.name}
                          </p>
                          <p className="text-white/80 text-xs drop-shadow-lg">
                            {contact.stories.length} {contact.stories.length === 1 ? 'story' : 'stories'}
                          </p>
                        </div>
                        {contact.hasUnviewed && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedContact && currentStory && activeSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
              {selectedContact.stories.map((_, index) => (
                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{
                      width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%',
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-white">
                  <span className="text-sm font-bold text-white">
                    {selectedContact.name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold drop-shadow-lg">{selectedContact.name}</p>
                  <p className="text-white/80 text-xs flex items-center gap-1 drop-shadow-lg">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(currentStory.timestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedContact(null)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Navigation */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevStory}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20 backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextStory}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20 backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </motion.button>

            {/* Story Content */}
            <motion.div
              key={currentStory.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-md h-full max-h-[90vh] flex items-center justify-center"
            >
              {currentStory.type === 'image' && currentStory.mediaUrl && (
                <img
                  src={storiesService.getMediaUrl(activeSession.id, currentStory.id)}
                  alt="Story"
                  className="w-full h-full object-contain rounded-2xl"
                />
              )}

              {currentStory.type === 'video' && currentStory.mediaUrl && (
                <video
                  src={storiesService.getMediaUrl(activeSession.id, currentStory.id)}
                  className="w-full h-full object-contain rounded-2xl"
                  autoPlay
                  loop
                  muted
                />
              )}

              {currentStory.type === 'text' && (
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center p-8"
                  style={{ backgroundColor: currentStory.backgroundColor || '#1a1a1a' }}
                >
                  <p className="text-white text-3xl font-bold text-center whitespace-pre-wrap">
                    {currentStory.text}
                  </p>
                </div>
              )}

              {/* Story Info */}
              <div className="absolute bottom-20 left-4 right-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  {/* Views counter removed as it's not available from WhatsApp API */}
                </div>
                {currentStory.mediaUrl && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDownload(currentStory)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <Download className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Reply Input */}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="max-w-md mx-auto flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                  placeholder="Responder..."
                  className="flex-1 px-4 py-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="p-3 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
