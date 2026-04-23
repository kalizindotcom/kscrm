import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string | null) => void;
  setSession: (session: { user: User; token: string; refreshToken: string }) => void;
  clearSession: () => void;
  hydrateMe: () => Promise<void>;
}

function normalizeIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value.includes('@') && value.toLowerCase() === 'admin') {
    return 'admin@kscsm.com';
  }
  return value;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setToken: (token) => set({ token, isAuthenticated: !!token }),

      setSession: ({ user, token, refreshToken }) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        }),

      clearSession: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      login: async (identifier, password) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizeIdentifier(identifier),
            password,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message ?? 'Falha no login');
        }

        get().setSession({
          user: payload.user as User,
          token: payload.token as string,
          refreshToken: payload.refreshToken as string,
        });
      },

      logout: async () => {
        const currentRefreshToken = get().refreshToken;
        get().clearSession();

        if (currentRefreshToken) {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
          }).catch(() => undefined);
        }
      },

      hydrateMe: async () => {
        const state = get();
        if (!state.token) {
          state.clearSession();
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${state.token}` },
        });

        if (response.ok) {
          const user = (await response.json()) as User;
          set({ user, isAuthenticated: true });
          return;
        }

        // Access token expired — try to refresh before giving up
        if (response.status === 401 && state.refreshToken) {
          try {
            const refreshResp = await fetch(`${API_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: state.refreshToken }),
            });
            if (refreshResp.ok) {
              const { token } = (await refreshResp.json()) as { token: string };
              set({ token });
              const retryResp = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (retryResp.ok) {
                const user = (await retryResp.json()) as User;
                set({ user, isAuthenticated: true });
                return;
              }
            }
          } catch {
            // fall through to clearSession
          }
        }

        state.clearSession();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isFiring: boolean;
  setIsFiring: (isFiring: boolean) => void;
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;
  progress: number;
  setProgress: (progress: number) => void;
  currentTarget: string | null;
  setCurrentTarget: (target: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  isFiring: false,
  setIsFiring: (isFiring) => set({ isFiring }),
  activeCampaignId: null,
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  progress: 0,
  setProgress: (progress) => set({ progress }),
  currentTarget: null,
  setCurrentTarget: (currentTarget) => set({ currentTarget }),
}));
