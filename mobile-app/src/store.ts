import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { id: number; username: string; role: string } | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Identifiants incorrects');
      }

      const data = await response.json();
      set({ token: data.access_token, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erreur de connexion',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => set({ token: null, user: null }),
  setToken: (token: string) => set({ token }),
}));

interface DashboardState {
  stats: any | null;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      set({ stats: data, isLoading: false });
    } catch (error) {
      console.error('Erreur fetch stats:', error);
      set({ isLoading: false });
    }
  },
}));

interface IncidentsState {
  incidents: any[];
  isLoading: boolean;
  fetchIncidents: () => Promise<void>;
  resolveIncident: (id: number) => Promise<void>;
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  incidents: [],
  isLoading: false,

  fetchIncidents: async () => {
    set({ isLoading: true });
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/incidents_custom`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      set({ incidents: data.data || [], isLoading: false });
    } catch (error) {
      console.error('Erreur fetch incidents:', error);
      set({ isLoading: false });
    }
  },

  resolveIncident: async (id: number) => {
    const token = useAuthStore.getState().token;
    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/incidents_custom/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      get().fetchIncidents();
    } catch (error) {
      console.error('Erreur résolution incident:', error);
    }
  },
}));
