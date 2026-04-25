import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
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

  // Se só há uma sessão ativa, não mostra o seletor
  if (activeSessions.length === 1) {
    return null;
  }

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium text-white"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">{selectedSession?.name || 'Selecione uma sessão'}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-2 space-y-1">
                {activeSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelect(session.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                      session.id === selectedSessionId
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          session.status === 'connected'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {session.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {session.phone || 'Sem número'}
                        </p>
                      </div>
                    </div>
                    {session.id === selectedSessionId && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
