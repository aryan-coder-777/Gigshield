import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

const inferHost = () => {
  if (Platform.OS === 'web' && typeof globalThis.location !== 'undefined') {
    return globalThis.location.hostname;
  }

  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname;
  } catch {
    return null;
  }
};

const getBaseUrl = () => {
  if (EXPO_PUBLIC_API_URL) {
    return EXPO_PUBLIC_API_URL;
  }

  const inferredHost = inferHost();
  if (inferredHost) {
    if (Platform.OS === 'android' && (inferredHost === 'localhost' || inferredHost === '127.0.0.1')) {
      return 'http://10.0.2.2:8001';
    }
    return `http://${inferredHost}:8001`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8001';
  }
  return 'http://127.0.0.1:8001';
};

export const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Handle 401 by clearing token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('worker');
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: any) => api.post('/api/v1/auth/register', data),
  login: (phone: string, password: string) =>
    api.post('/api/v1/auth/login', { phone, password }),
  getMe: () => api.get('/api/v1/auth/me'),
  updateKYC: (data: any) => api.put('/api/v1/auth/kyc', data),
};

// ─── Policies ────────────────────────────────────────────────────────────────

export const policiesAPI = {
  getPlans: () => api.get('/api/v1/policies/plans'),
  createPolicy: (plan_type: string) =>
    api.post('/api/v1/policies/create', { plan_type }),
  getActive: () => api.get('/api/v1/policies/active'),
  getHistory: () => api.get('/api/v1/policies/history'),
  renew: () => api.post('/api/v1/policies/renew'),
};

// ─── Claims ──────────────────────────────────────────────────────────────────

export const claimsAPI = {
  getMyClaims: () => api.get('/api/v1/claims/'),
  getClaimDetail: (id: number) => api.get(`/api/v1/claims/${id}`),
  submitAppeal: (id: number, note: string) =>
    api.post(`/api/v1/claims/${id}/appeal`, { appeal_note: note }),
  getPayouts: () => api.get('/api/v1/claims/payouts/history'),
};

export const workerAPI = {
  getDashboardSummary: () => api.get('/api/v1/worker/dashboard-summary'),
};

// ─── Triggers ────────────────────────────────────────────────────────────────

export type TriggerSimulatePayload = {
  trigger_type: string;
  zone: string;
  measured_value?: number;
  description?: string;
  simulate_gps_spoof?: boolean;
  simulate_low_weather_history?: boolean;
  latitude?: number;
  longitude?: number;
};

export const triggersAPI = {
  getActive: () => api.get('/api/v1/triggers/active'),
  checkAll: () => api.get('/api/v1/triggers/check-all'),
  getZonesGeo: () => api.get('/api/v1/triggers/zones/geo'),
  simulate: (payload: TriggerSimulatePayload) =>
    api.post('/api/v1/triggers/simulate', payload),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminAPI = {
  getDashboard: () => api.get('/api/v1/admin/dashboard'),
  getPredictions: () => api.get('/api/v1/admin/predictions'),
  getFlaggedClaims: () => api.get('/api/v1/admin/claims/flagged'),
  makeDecision: (claimId: number, decision: string, note?: string) =>
    api.put(`/api/v1/admin/claims/${claimId}/decision?decision=${decision}&note=${note || ''}`),
  getWorkers: () => api.get('/api/v1/admin/workers'),
};
