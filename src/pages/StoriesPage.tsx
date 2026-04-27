import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Video,
  Type,
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
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Story {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  timestamp: Date;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  text?: string;
  backgroundColor?: string;
  views?: number;
  isViewed: boolean;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export function StoriesPage() {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);

  // Mock data - substituir por chamada real à API
  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadStories();
    }
  }, [selectedSession]);

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
    // Mock - substituir por API real
    setSessions([
      { id: '1', name: 'Sessão Principal', phoneNumber: '+55 11 99999-9999', status: 'connected' },
      { id: '2', name: 'Sessão Vendas', phoneNumber: '+55 11 88888-8888', status: 'connected' },
    ]);
  };

  const loadStories = async () => {
    setLoading(true);
    try {
      // Mock data - substituir por chamada real à API
      const mockContacts: Contact[] = [
        {
          id: '1',
          name: 'João Silva',
          phone: '+55 11 91234-5678',
          avatar: undefined,
          hasUnviewed: true,
          stories: [
            {
              id: 's1',
              contactName: 'João Silva',
              contactPhone: '+55 11 91234-5678',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              type: 'image',
              mediaUrl: 'https://picsum.photos/400/700?random=1',
              views: 45,
              isViewed: false,
            },
            {
              id: 's2',
              contactName: 'João Silva',
              contactPhone: '+55 11 91234-5678',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
              type: 'text',
              text: 'Bom dia! 🌅\nQue dia incrível!',
              backgroundColor: '#FF6B6B',
              views: 32,
              isViewed: false,
            },
          ],
        },
        {
          id: '2',
          name: 'Maria Santos',
          phone: '+55 11 98765-4321',
          hasUnviewed: false,
          stories: [
            {
              id: 's3',
              contactName: 'Maria Santos',
              contactPhone: '+55 11 98765-4321',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
              type: 'video',
              mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              views: 78,
              isViewed: true,
            },
          ],
        },
        {
          id: '3',
          name: 'Pedro Costa',
          phone: '+55 11 97777-7777',
          hasUnviewed: true,
          stories: [
            {
              id: 's4',
              contactName: 'Pedro Costa',
              contactPhone: '+55 11 97777-7777',
              timestamp: new Date(Date.now() - 30 * 60 * 1000),
              type: 'image',
              mediaUrl: 'https://picsum.photos/400/700?random=2',
              views: 12,
              isViewed: false,
            },
          ],
        },
      ];

      setContacts(mockContacts);
    } catch (error) {
      toast.error('Erro ao carregar stories');
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleNextStory = () => {
    if (!selectedContact) return;

    if (currentStoryIndex < selectedContact.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      // Próximo contato
      const currentIndex = contacts.findIndex((c) => c.id === selectedContact.id);
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
      const currentIndex = contacts.findIndex((c) => c.id === selectedContact.id);
      if (currentIndex > 0) {
        const prevContact = contacts[currentIndex - 1];
        setSelectedContact(prevContact);
        setCurrentStoryIndex(prevContact.stories.length - 1);
        setProgress(0);
      }
    }
  };

  const handleDownload = async (story: Story) => {
    if (!story.mediaUrl) return;

    try {
      const response = await fetch(story.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-${story.id}.${story.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Story baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar story');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedContact) return;

    try {
      // Implementar envio de resposta via API
      toast.success('Resposta enviada!');
      setReplyText('');
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours < 1) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  const currentStory = selectedContact?.stories[currentStoryIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-primary" />
            Stories
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e interaja com os stories dos seus contatos
          </p>
        </div>
      </motion.div>

      {/* Session Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Sessão:</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Selecione uma sessão</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} - {session.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stories Grid */}
      {selectedSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
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
                  {contacts.map((contact) => (
                    <motion.button
                      key={contact.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleContactClick(contact)}
                      className="relative group"
                    >
                      <div
                        className={cn(
                          'w-full aspect-[3/4] rounded-2xl overflow-hidden border-4 transition-all',
                          contact.hasUnviewed
                            ? 'border-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
                            : 'border-gray-300'
                        )}
                      >
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm font-semibold truncate">
                            {contact.name}
                          </p>
                          <p className="text-white/80 text-xs">
                            {contact.stories.length} {contact.stories.length === 1 ? 'story' : 'stories'}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedContact && currentStory && (
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
                  <p className="text-white font-semibold">{selectedContact.name}</p>
                  <p className="text-white/80 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(currentStory.timestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <button
              onClick={handlePrevStory}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleNextStory}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* Story Content */}
            <div className="relative w-full max-w-md h-full max-h-[90vh] flex items-center justify-center">
              {currentStory.type === 'image' && (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain rounded-2xl"
                />
              )}

              {currentStory.type === 'video' && (
                <video
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  autoPlay
                  loop
                  muted
                />
              )}

              {currentStory.type === 'text' && (
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center p-8"
                  style={{ backgroundColor: currentStory.backgroundColor }}
                >
                  <p className="text-white text-3xl font-bold text-center whitespace-pre-wrap">
                    {currentStory.text}
                  </p>
                </div>
              )}

              {/* Story Info */}
              <div className="absolute bottom-20 left-4 right-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  {currentStory.views !== undefined && (
                    <div className="flex items-center gap-1 text-sm">
                      <Eye className="w-4 h-4" />
                      {currentStory.views}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(currentStory)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

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
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="p-3 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
