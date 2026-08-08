import axios, { AxiosRequestConfig } from 'axios';
import { tokenStore } from '../auth/session';

export function newCorrelationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `corr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function createClient(baseURL: string) {
  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers['X-Correlation-Id']) {
      config.headers['X-Correlation-Id'] = newCorrelationId();
    }
    return config;
  });

  return instance;
}

export const commandClient = createClient('/consent-cmd');
export const queryClient = createClient('/consent-qry');
export const userClient = createClient('/users');
export const billingClient = createClient('/billing');
export const promotionClient = createClient('/promotions');
export const auditClient = createClient('/audit');
export const dashboardClient = createClient('/dashboard');

export type { AxiosRequestConfig };
