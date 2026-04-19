import React from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Globe, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EmptyState: React.FC = () => {
  const { openCreateSessionModal } = useSessionStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full bg-card/40 backdrop-blur-xl border border-primary/20 rounded-[2rem] p-12 text-center shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center rotate-12 shadow-[0_0_30px_rgba(var(--primary),0.2)]"
              >
                <ShieldAlert className="w-12 h-12 text-primary" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center -rotate-12 shadow-[0_0_20px_rgba(var(--secondary),0.3)]"
              >
                <Zap className="w-6 h-6 text-secondary" />
              </motion.div>
            </div>
          </div>

          <h2 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            Live-View Indisponível
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Para acessar o monitoramento em tempo real, você precisa ter pelo menos uma <span className="text-primary font-bold">sessão ativa e conectada</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Status Global</h4>
                <p className="text-xs text-slate-500">Nenhuma sessão encontrada no buffer.</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Auto-Sincronização</h4>
                <p className="text-xs text-slate-500">Aguardando gatilho de conexão.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={openCreateSessionModal}
              className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              CONECTAR AGORA
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 rounded-2xl border-white/10 bg-white/5 text-white font-bold text-lg hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-5 h-5" />
              VERIFICAR NOVAMENTE
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
