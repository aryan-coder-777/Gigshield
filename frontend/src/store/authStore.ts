import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMemoryToken } from '../lib/api';

interface Worker {
  id: number;
  name: string;
  phone: string;
  email?: string;
  partner_id?: string;
  platform: string;
  city: string;
  zones: string[];
  weekly_hours?: number;
  zone_risk_score: number;
  risk_tier: string;
  kyc_status: string;
  onboarding_complete: boolean;
  role: string;
}

interface AuthState {
  token: string | null;
  worker: Worker | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, worker: Worker) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  worker: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: async (token, worker) => {
    setMemoryToken(token);
    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('worker', JSON.stringify(worker));
    set({ token, worker, isAuthenticated: true });
  },

  logout: async () => {
    setMemoryToken(null);
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('worker');
    set({ token: null, worker: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const workerStr = await AsyncStorage.getItem('worker');
      if (token && workerStr) {
        const worker = JSON.parse(workerStr);
        setMemoryToken(token);
        set({ token, worker, isAuthenticated: true });
      }
    } catch {}
    set({ isLoading: false });
  },
}));
