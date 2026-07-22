import { get, post, put, patch, del } from './client';
import type {
  AdminStats,
  AdminUser,
  User,
  Application,
  EmailRecord,
  AuditEntry,
  PaginatedResponse,
} from '@/types/api.types';

export interface AdminLoginPayload {
  email: string;
  password: string;
  secret_key: string;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  user_type?: string;
  is_active?: number;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

export interface AdminApplicationsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  user_id?: number;
  platform?: string;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

export interface AdminAuditQuery {
  page?: number;
  limit?: number;
  user_id?: number;
  action?: string;
  entity?: string;
  search?: string;
}

export interface AdminEmailsQuery {
  page?: number;
  limit?: number;
  search?: string;
  classification?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  name: string;
  user_type?: string;
}

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const adminApi = {
  login: (payload: AdminLoginPayload) =>
    post<{ admin: boolean; email: string }>('/admin/login', payload),

  logout: () =>
    post<{ message: string }>('/admin/logout'),

  me: () =>
    get<{ admin: boolean; email: string }>('/admin/me'),

  stats: () =>
    get<AdminStats>('/admin/stats'),

  search: (q: string) =>
    get<{
      users: User[];
      applications: Application[];
      emails: EmailRecord[];
    }>(`/admin/search?q=${encodeURIComponent(q)}`),

  // ─── Users ─────────────────────────────────────────────────────────────────

  listUsers: (params: AdminUsersQuery = {}) =>
    get<PaginatedResponse<AdminUser>>(`/admin/users${buildQuery(params as Record<string, unknown>)}`),

  getUser: (id: number) =>
    get<AdminUser>(`/admin/users/${id}`),

  createUser: (payload: CreateAdminUserPayload) =>
    post<{ id: number; email: string; name: string }>('/admin/users', payload),

  updateUser: (id: number, payload: Partial<User & { password?: string }>) =>
    put<{ message: string }>(`/admin/users/${id}`, payload),

  deleteUser: (id: number) =>
    del<{ message: string }>(`/admin/users/${id}`),

  toggleUser: (id: number) =>
    patch<{ is_active: number }>(`/admin/users/${id}/toggle`),

  // ─── Applications ──────────────────────────────────────────────────────────

  listApplications: (params: AdminApplicationsQuery = {}) =>
    get<PaginatedResponse<Application & { user_name: string; user_email: string }>>(
      `/admin/applications${buildQuery(params as Record<string, unknown>)}`,
    ),

  updateApplication: (id: number, payload: Partial<Application>) =>
    put<Application>(`/admin/applications/${id}`, payload),

  deleteApplication: (id: number) =>
    del<{ message: string }>(`/admin/applications/${id}`),

  // ─── Emails ────────────────────────────────────────────────────────────────

  listEmails: (params: AdminEmailsQuery = {}) =>
    get<PaginatedResponse<EmailRecord & { user_name: string }>>(
      `/admin/emails${buildQuery(params as Record<string, unknown>)}`,
    ),

  // ─── Audit ─────────────────────────────────────────────────────────────────

  auditLog: (params: AdminAuditQuery = {}) =>
    get<PaginatedResponse<AuditEntry>>(
      `/admin/audit${buildQuery(params as Record<string, unknown>)}`,
    ),
};
