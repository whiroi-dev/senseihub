export interface User {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type RankKey =
  | 'Faixa Branca (7º Kyu)'
  | 'Faixa Amarela (6º Kyu)'
  | 'Faixa Laranja (5º Kyu)'
  | 'Faixa Azul (4º Kyu)'
  | 'Faixa Verde (3º Kyu)'
  | 'Faixa Roxa (2º Kyu)'
  | 'Faixa Marrom (1º Kyu)'
  | 'Faixa Preta (1º Dan)'
  | 'Faixa Preta (2º Dan)'
  | 'Faixa Preta (3º Dan)'
  | 'Faixa Preta (4º Dan)'
  | 'Faixa Preta (5º Dan)';

export const ranksList: RankKey[] = [
  'Faixa Branca (7º Kyu)',
  'Faixa Amarela (6º Kyu)',
  'Faixa Laranja (5º Kyu)',
  'Faixa Azul (4º Kyu)',
  'Faixa Verde (3º Kyu)',
  'Faixa Roxa (2º Kyu)',
  'Faixa Marrom (1º Kyu)',
  'Faixa Preta (1º Dan)',
  'Faixa Preta (2º Dan)',
  'Faixa Preta (3º Dan)',
  'Faixa Preta (4º Dan)',
  'Faixa Preta (5º Dan)'
];

export interface CertificateData {
  studentName: string;
  studentEmail?: string;
  rank: RankKey;
  associationName: string;
  shihanName: string;
  presidentName: string;
  issueDate: string;
}

export interface CertificateRecord {
  id: number;
  studentId: number;
  associationName: string;
  shihanName: string;
  presidentName: string;
  issueDate: string;
  createdAt?: string;
}

export interface CertificateApiResponse {
  success: boolean;
  certificate: CertificateRecord;
  email?: {
    sent: boolean;
    previewUrl?: string;
    messageId?: string;
  };
}

export interface RankDistributionItem {
  rank: string;
  count: number;
  color: string;
}

export interface DashboardStats {
  totalCertificates: number;
  totalStudents: number;
  rankDistribution: RankDistributionItem[];
  recentCertificates: Array<{
    id: number;
    studentName: string;
    rank: string;
    associationName: string;
    issueDate: string;
    createdAt: string;
  }>;
}

export interface LogoSettingsResponse {
  logoUrl: string;
  fullUrl: string;
}
