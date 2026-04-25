import React from 'react';
import { Check, ChevronDown, Zap, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Session } from '@/components/connectors/types';

interface SessionSelectorProps {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const activeSessions = sessions.filter((s) => s.status === 'connected');
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  if (activeSessions.length === 0) {
    return null;
  }

  // Se só há uma sessão ativa, mostra apenas o indicador
  if (activeSessions.length === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group"
      >
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 rounded-2xl backdrop-blur-xl shadow-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-md animate-pulse" />
            <Wifi className="w-5 h-5 text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate tracking-wide">
              {selectedSession?.name || activeSessions[0].name}
            </p>
            <p className="text-xs text-emerald-400/80 font-bold truncate">
              {selectedSession?.phone || activeSessions[0].phone || 'Conectado'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

        {/* Main button */}
        <div className="relative flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-primary/20 rounded-2xl backdrop-blur-xl shadow-2xl transition-all group-hover:border-primary/40">
          {/* Animated border gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ padding: '1px' }}>
            <div className="w-full h-full bg-slate-900 rounded-2xl" />
          </div>

          <div className="relative flex items-center gap-3 flex-1 min-w-0">
            {/* Status indicator with pulse */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-md animate-pulse" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative z-10 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
              />
            </div>

            {/* Session info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {selectedSession?.name || 'Selecione uma sessão'}
              </p>
              <p className="text-xs text-slate-400 font-bold truncate">
                {selectedSession?.phone || 'Nenhuma sessão selecionada'}
              </p>
            </div>

            {/* Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-500/20 to-primary/20 rounded-full border border-emerald-500/30 shadow-inner">
              <Zap className="w-3 h-3 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                {activeSessions.length}
              </span>
            </div>

            {/* Chevron */}
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
            </motion.div>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-full mt-3 left-0 right-0 z-50"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-emerald-500/20 blur-2xl opacity-50" />

              {/* Dropdown content */}
              <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-primary/30 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-primary/5 to-emerald-500/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sessões Ativas ({activeSessions.length})
                  </p>
                </div>

                {/* Sessions list */}
                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {activeSessions.map((session, index) => (
                    <motion.button
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(session.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left relative group/item overflow-hidden',
                        session.id === selectedSessionId
                          ? 'bg-gradient-to-r from-primary/20 via-emerald-500/10 to-primary/20 border border-primary/40 shadow-lg'
                          : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                      )}
                    >
                      {/* Selected item glow */}
                      {session.id === selectedSessionId && (
                        <motion.div
                          layoutId="selectedGlow"
                          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}

                      <div className="relative flex items-center gap-3 flex-1 min-w-0">
                        {/* Status indicator */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-md animate-pulse" />
                          <div
                            className={cn(
                              'w-2.5 h-2.5 rounded-full relative z-10 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
                              session.status === 'connected'
                                ? 'bg-emerald-400'
                                : 'bg-slate-500'
                            )}
                          />
                        </div>

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate tracking-wide">
                            {session.name}
                          </p>
                          <p className="text-xs text-slate-400 font-bold truncate">
                            {session.phone || 'Sem número'}
                          </p>
                        </div>

                        {/* Check icon */}
                        <AnimatePresence>
                          {session.id === selectedSessionId && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: 'spring', bounce: 0.5 }}
                              className="relative"
                            >
                              <div className="absolute inset-0 bg-primary/30 rounded-full blur-md" />
                              <Check className="w-5 h-5 text-primary relative z-10 drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-full group-hover/item:translate-x-full duration-700" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
