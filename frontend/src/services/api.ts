import type {
  AuthResponse,
  User,
  CertificateData,
  CertificateApiResponse,
  DashboardStats,
  LogoSettingsResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

export const handleAuthFailure = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleAuthFailure();
    let errorMsg = 'Sessão expirada ou não autorizada.';
    try {
      const errData = await response.json();
      if (errData.error) errorMsg = errData.error;
    } catch {
      // Fallback message
    }
    throw new ApiError(errorMsg, 401);
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? (data as { error: string }).error
        : `Erro na requisição (${response.status})`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};

export const authApi = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),

  register: (name: string, email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/api/auth/register', { name, email, password }),

  me: (): Promise<{ user: User }> =>
    api.get<{ user: User }>('/api/auth/me'),
};

export const certificateApi = {
  create: (data: CertificateData): Promise<CertificateApiResponse> =>
    api.post<CertificateApiResponse>('/api/certificates', data),
};

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    api.get<DashboardStats>('/api/dashboard/stats'),
};

export const settingsApi = {
  getLogo: (): Promise<LogoSettingsResponse> =>
    api.get<LogoSettingsResponse>('/api/settings/logo'),

  uploadLogo: (file: File): Promise<LogoSettingsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<LogoSettingsResponse>('/api/settings/logo', formData);
  },
};

export interface StudentRecord {
  id: number;
  name: string;
  rank: string;
  createdAt: string;
  certificates: Array<{
    id: number;
    issueDate: string;
    associationName: string;
    shihanName: string;
    presidentName: string;
  }>;
}

export const studentApi = {
  list: (): Promise<StudentRecord[]> =>
    api.get<StudentRecord[]>('/api/students'),
  create: (data: { name: string; rank: string }): Promise<StudentRecord> =>
    api.post<StudentRecord>('/api/students', data),
};
