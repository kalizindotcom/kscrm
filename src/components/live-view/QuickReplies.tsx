import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, X, Edit2, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  label: string;
  content: string;
  category?: string;
}

interface QuickRepliesProps {
  onSelect: (content: string) => void;
  className?: string;
}

const DEFAULT_REPLIES: QuickReply[] = [
  { id: '1', label: 'Olá', content: 'Olá! Como posso ajudar você hoje?', category: 'Saudação' },
  { id: '2', label: 'Obrigado', content: 'Obrigado pelo contato! Estamos à disposição.', category: 'Agradecimento' },
  { id: '3', label: 'Aguarde', content: 'Por favor, aguarde um momento enquanto verifico isso para você.', category: 'Atendimento' },
  { id: '4', label: 'Horário', content: 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.', category: 'Informação' },
  { id: '5', label: 'Mais info', content: 'Pode me passar mais informações sobre o que você precisa?', category: 'Atendimento' },
];

export const QuickReplies: React.FC<QuickRepliesProps> = ({ onSelect, className }) => {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newReply, setNewReply] = useState({ label: '', content: '', category: '' });

  useEffect(() => {
    const stored = localStorage.getItem('ks-quick-replies');
    if (stored) {
      try {
        setReplies(JSON.parse(stored));
      } catch {
        setReplies(DEFAULT_REPLIES);
      }
    } else {
      setReplies(DEFAULT_REPLIES);
    }
  }, []);

  const saveReplies = (newReplies: QuickReply[]) => {
    setReplies(newReplies);
    localStorage.setItem('ks-quick-replies', JSON.stringify(newReplies));
  };

  const handleAdd = () => {
    if (!newReply.label.trim() || !newReply.content.trim()) {
      toast.error('Preencha o título e o conteúdo');
      return;
    }
    const reply: QuickReply = {
      id: Date.now().toString(),
      label: newReply.label,
      content: newReply.content,
      category: newReply.category || 'Geral',
    };
    saveReplies([...replies, reply]);
    setNewReply({ label: '', content: '', category: '' });
    toast.success('Resposta rápida adicionada!');
  };

  const handleDelete = (id: string) => {
    saveReplies(replies.filter(r => r.id !== id));
    toast.success('Resposta removida');
  };

  const handleEdit = (id: string) => {
    const reply = replies.find(r => r.id === id);
    if (reply) {
      setNewReply({ label: reply.label, content: reply.content, category: reply.category || '' });
      setEditingId(id);
      // Scroll to top to show the form
      setTimeout(() => {
        const modal = document.querySelector('[data-quick-replies-modal]');
        if (modal) modal.scrollTop = 0;
      }, 0);
    }
  };

  const handleUpdate = () => {
    if (!editingId || !newReply.label.trim() || !newReply.content.trim()) return;
    saveReplies(replies.map(r => r.id === editingId ? { ...r, ...newReply } : r));
    setEditingId(null);
    setNewReply({ label: '', content: '', category: '' });
    toast.success('Resposta atualizada!');
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Respostas Rápidas</span>
        <button
          onClick={() => setShowManager(!showManager)}
          className="ml-auto p-1.5 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all"
          title="Gerenciar respostas"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {replies.slice(0, 6).map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelect(reply.content)}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-xs font-bold text-primary transition-all active:scale-95 flex items-center gap-1.5 group"
          >
            <Zap className="w-3 h-3 group-hover:scale-110 transition-transform" />
            {reply.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowManager(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-primary/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
              data-quick-replies-modal
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  {editingId ? 'Editar Resposta Rápida' : 'Gerenciar Respostas Rápidas'}
                </h3>
                <button
                  onClick={() => {
                    setShowManager(false);
                    setEditingId(null);
                    setNewReply({ label: '', content: '', category: '' });
                  }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">{editingId && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl mb-2">
                    <Edit2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Editando resposta rápida</span>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setNewReply({ label: '', content: '', category: '' });
                      }}
                      className="ml-auto text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Título</label>
                  <input
                    type="text"
                    placeholder="Ex: Olá, Obrigado, Aguarde..."
                    value={newReply.label}
                    onChange={(e) => setNewReply({ ...newReply, label: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Conteúdo</label>
                  <textarea
                    placeholder="Digite a mensagem que será enviada..."
                    value={newReply.content}
                    onChange={(e) => setNewReply({ ...newReply, content: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Categoria (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Saudação, Atendimento, Informação..."
                    value={newReply.category}
                    onChange={(e) => setNewReply({ ...newReply, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium placeholder:text-slate-600"
                  />
                </div>
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 scroll-smooth">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all group",
                      editingId === reply.id
                        ? "border-primary/40 bg-primary/10 ring-2 ring-primary/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{reply.label}</span>
                        {reply.category && (
                          <span className="text-[9px] font-bold text-primary/80 bg-primary/10 border border-primary/20 px-1.5 rounded uppercase tracking-tighter">
                            {reply.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{reply.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(reply.id)}
                        className="p-1.5 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(reply.id)}
                        className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
