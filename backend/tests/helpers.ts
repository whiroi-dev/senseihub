import assert from 'node:assert/strict';

export const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let body: any = undefined;

  if (options.body) {
    if (options.isFormData || options.body instanceof FormData) {
      body = options.body;
      // Do not set Content-Type header manually when body is FormData; fetch will set boundary
    } else if (typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    } else {
      body = options.body;
    }
  }

  try {
    const response = await fetch(url, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers,
      body,
    });

    let data: any;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      data,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

/**
 * Creates a minimal valid 1x1 PNG file buffer for upload tests
 */
export function createSamplePng(): { buffer: Buffer; fileName: string; mimeType: string } {
  // Minimal valid 1x1 pixel transparent PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  return {
    buffer,
    fileName: `test-logo-${Date.now()}.png`,
    mimeType: 'image/png',
  };
}

/**
 * Generates unique instructor test data
 */
export function generateInstructorData(prefix = 'instr') {
  const timestamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return {
    name: `Sensei Silva ${rand}`,
    email: `${prefix}_${timestamp}_${rand}@dojotest.com`,
    password: `P@ssw0rd_${rand}!`,
  };
}

/**
 * Generates unique certificate test data
 */
export function generateCertificateData(studentEmail?: string, rank = 'Faixa Preta (1º Dan)') {
  const rand = Math.floor(Math.random() * 10000);
  return {
    studentName: `Lucas Aluno ${rand}`,
    studentEmail: studentEmail || `student_${Date.now()}_${rand}@example.com`,
    rank,
    associationName: `Associação Shotokan Brasil ${rand}`,
    shihanName: 'Shihan Kenji Takahashi',
    presidentName: 'Presidente Carlos Sato',
    issueDate: new Date().toISOString().split('T')[0],
  };
}

export async function isServerRunning(url = API_BASE_URL): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch {
    return false;
  }
}
