import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data as { detail?: string; error?: string } | undefined;
    return detail?.detail ?? error.message;
  }

  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}

function getDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000`;
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? getDefaultApiBaseUrl()).replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API request failed', {
      method: error.config?.method?.toUpperCase(),
      url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>({
    url: path,
    ...config,
  });

  return response.data;
}
