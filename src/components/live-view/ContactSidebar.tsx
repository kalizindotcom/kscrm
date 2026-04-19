import React from 'react';
import { LiveConversation } from './types';
import {
  User,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Clock,
  ShieldAlert,
  Download,
  Hash
} from 'lucide-react';

import { Badge } from '@/components/ui/shared';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactSidebarProps {
  conversation: LiveConversation;
  onOpenModal?: (modal: 'import' | 'download' | 'audio' | 'history' | 'block' | 'attachment') => void;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({ conversation, onOpenModal }) => {
  const lastMessages = [...conversation.messages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  const createdLabel = conversation.createdAt
    ? (() => {
        try {
          return format(new Date(conversation.createdAt), "d 'de' MMMM, yyyy", { locale: ptBR });
        } catch {
          return '—';
        }
      })()
    : '—';

  return (
    <div className="h-full flex flex-col bg-card/30 backdrop-blur-xl overflow-y-auto custom-scrollbar">
      <div className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-800 border-2 border-primary/20 p-1 relative overflow-hidden rotate-3">
            {conversation.avatar ? (
              <img src={conversation.avatar} alt={conversation.contactName} className="w-full h-full object-cover rounded-[1.75rem]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-3xl font-black">
                {conversation.contactName[0]}
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-black text-white mb-1 tracking-tight">{conversation.contactName}</h3>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{conversation.phoneNumber}</p>

        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {conversation.tags.map(tag => (
            <Badge key={tag} className="bg-primary/10 text-primary border-primary/20 px-2 py-1 text-[9px] uppercase font-black">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Quick Info */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <User className="w-3 h-3 text-primary" /> Informações do Contato
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Origem</span>
              <span className="text-white font-black uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded-md">{conversation.origin}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold flex items-center gap-1"><Hash className="w-3 h-3" /> ID</span>
              <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md text-[10px]">{conversation.id.slice(-8)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Primeira Interação</span>
              <span className="text-white">{createdLabel}</span>
            </div>
            {conversation.isGroup && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">Tipo</span>
                <span className="text-primary font-black bg-primary/10 px-2 py-0.5 rounded-md uppercase text-[9px]">Grupo</span>
              </div>
            )}
          </div>
        </section>

        {/* Metrics */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <BarChart2 className="w-3 h-3 text-secondary" /> Métricas de Engajamento
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Enviadas</p>
              <p className="text-xl font-black text-white group-hover:text-primary transition-colors">{conversation.metrics.totalSent}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center group hover:bg-secondary/5 hover:border-secondary/20 transition-all">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Recebidas</p>
              <p className="text-xl font-black text-white group-hover:text-secondary transition-colors">{conversation.metrics.totalReceived}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center col-span-2 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Taxa de Resposta</p>
                <p className="text-xl font-black text-emerald-400">{conversation.metrics.responseRate}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Timeline — last real messages */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Clock className="w-3 h-3 text-amber-500" /> Últimos Eventos
          </h4>
          {lastMessages.length === 0 ? (
            <p className="text-xs text-slate-600">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="space-y-4">
              {lastMessages.map((m, i) => (
                <div key={m.id} className="flex gap-3 relative">
                  {i < lastMessages.length - 1 && (
                    <div className="absolute left-1.5 top-6 bottom-0 w-px bg-white/5" />
                  )}
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${m.fromMe ? 'bg-primary/20 border-primary/50' : 'bg-emerald-500/20 border-emerald-500/50'}`}>
                    <div className={`w-1 h-1 rounded-full ${m.fromMe ? 'bg-primary' : 'bg-emerald-500'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-white font-bold truncate max-w-[160px]">
                      {m.content || `[${m.type}]`}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {m.fromMe ? 'Enviado' : 'Recebido'} · {(() => {
                        try { return format(new Date(m.timestamp), "HH:mm 'de' dd/MM", { locale: ptBR }); } catch { return '—'; }
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="pt-4 flex flex-col gap-2">
          <button
            onClick={() => onOpenModal?.('download')}
            className="w-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 text-white font-bold text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" /> Exportar Conversa
          </button>
          <button
            onClick={() => onOpenModal?.('history')}
            className="w-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 text-white font-bold text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> Ver Histórico Completo
          </button>
          <button
            onClick={() => onOpenModal?.('block')}
            className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold text-xs py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 group"
          >
            <ShieldAlert className="w-4 h-4 group-hover:animate-shake" /> Bloquear Contato
          </button>
        </div>

      </div>
    </div>
  );
};
