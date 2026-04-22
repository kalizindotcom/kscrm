import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Session, SessionLog } from '@/components/connectors/types';

interface SessionState {
  sessions: Session[];
  isCreateModalOpen: boolean;
  selectedSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  upsertSession: (session: Session) => void;
  updateSession: (id: string, session: Partial<Session>) => void;
  removeSession: (id: string) => void;
  addSessionLog: (sessionId: string, log: Omit<SessionLog, 'id' | 'timestamp' | 'sessionId'>) => void;
  selectSession: (id: string | null) => void;
  openCreateSessionModal: () => void;
  closeCreateSessionModal: () => void;
  getSelectedSession: () => Session | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      isCreateModalOpen: false,
      selectedSessionId: null,

      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
        })),

      upsertSession: (session) =>
        set((state) => {
          const exists = state.sessions.some((item) => item.id === session.id);
          if (!exists) {
            return { sessions: [session, ...state.sessions] };
          }
          return {
            sessions: state.sessions.map((item) => (item.id === session.id ? session : item)),
          };
        }),

      updateSession: (id, sessionUpdate) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, ...sessionUpdate, updatedAt: new Date().toISOString() } : session,
          ),
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== id),
        })),

      addSessionLog: (sessionId, logData) =>
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== sessionId) return session;
            const newLog: SessionLog = {
              ...logData,
              id: `log-${Math.random().toString(36).slice(2, 11)}`,
              timestamp: new Date().toISOString(),
              sessionId,
            };
            return {
              ...session,
              recentLogs: [newLog, ...session.recentLogs].slice(0, 50),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      selectSession: (id) => set({ selectedSessionId: id }),
      openCreateSessionModal: () => set({ isCreateModalOpen: true }),
      closeCreateSessionModal: () => set({ isCreateModalOpen: false }),

      getSelectedSession: () => {
        const { sessions, selectedSessionId } = get();
        return sessions.find((session) => session.id === selectedSessionId) ?? null;
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedSessionId: state.selectedSessionId,
      }),
    },
  ),
);
