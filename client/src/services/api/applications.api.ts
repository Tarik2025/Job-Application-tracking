import { get, post, put, patch, del, downloadBlob } from './client';
import type {
  Application,
  ApplicationDetail,
  ApplicationsQuery,
  PaginatedResponse,
  Tag,
  Reminder,
  WeeklyReport,
  CompanyStat,
  StatusPrediction,
  FollowUpEmail,
  ApplicationStatus,
  PriorityLevel,
  WorkMode,
} from '@/types/api.types';

export interface CreateApplicationPayload {
  company: string;
  role: string;
  status?: ApplicationStatus;
  platform?: string;
  job_url?: string;
  job_description?: string;
  salary_expected?: string;
  salary_offered?: string;
  location?: string;
  work_mode?: WorkMode;
  contact_person?: string;
  contact_email?: string;
  notes?: string;
  priority?: PriorityLevel;
  tags?: string[];
}

export interface UpdateApplicationPayload extends Partial<CreateApplicationPayload> {
  status_note?: string;
}

export interface BulkStatusPayload {
  ids: number[];
  status: ApplicationStatus;
}

export interface BulkDeletePayload {
  ids: number[];
}

export interface CreateTagPayload {
  name: string;
  color?: string;
}

export interface CreateReminderPayload {
  application_id?: number;
  title: string;
  remind_at: string;
}

// Build query string from params object — filters out undefined/null values
function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const applicationsApi = {
  // ─── CRUD ──────────────────────────────────────────────────────────────────

  list: (params: ApplicationsQuery = {}) =>
    get<PaginatedResponse<Application>>(`/applications${buildQuery(params as Record<string, unknown>)}`),

  get: (id: number) =>
    get<ApplicationDetail>(`/applications/${id}`),

  create: (payload: CreateApplicationPayload) =>
    post<Application>('/applications', payload),

  update: (id: number, payload: UpdateApplicationPayload) =>
    put<Application>(`/applications/${id}`, payload),

  delete: (id: number) =>
    del<{ message: string }>(`/applications/${id}`),

  // ─── Bulk ──────────────────────────────────────────────────────────────────

  bulkUpdateStatus: (payload: BulkStatusPayload) =>
    patch<{ updated: number }>('/applications/bulk/status', payload),

  bulkDelete: (payload: BulkDeletePayload) =>
    post<{ deleted: number }>('/applications/bulk/delete', payload),

  // ─── Notes ─────────────────────────────────────────────────────────────────

  addNote: (id: number, content: string) =>
    post<{ id: number; content: string; created_at: string }>(
      `/applications/${id}/notes`,
      { content },
    ),

  // ─── Tags ──────────────────────────────────────────────────────────────────

  listTags: () =>
    get<Tag[]>('/applications/tags/list'),

  createTag: (payload: CreateTagPayload) =>
    post<{ message: string }>('/applications/tags', payload),

  deleteTag: (id: number) =>
    del<{ message: string }>(`/applications/tags/${id}`),

  // ─── Reminders ─────────────────────────────────────────────────────────────

  listReminders: (showDone?: boolean) =>
    get<Reminder[]>(`/applications/reminders/list${showDone ? '?show_done=1' : ''}`),

  createReminder: (payload: CreateReminderPayload) =>
    post<{ id: number }>('/applications/reminders', payload),

  markReminderDone: (id: number) =>
    patch<{ message: string }>(`/applications/reminders/${id}/done`),

  deleteReminder: (id: number) =>
    del<{ message: string }>(`/applications/reminders/${id}`),

  // ─── Reports ───────────────────────────────────────────────────────────────

  weeklyReport: () =>
    get<WeeklyReport>('/applications/report/weekly'),

  companyStats: () =>
    get<CompanyStat[]>('/applications/companies/stats'),

  exportCsv: () =>
    downloadBlob('/applications/export'),

  // ─── AI ────────────────────────────────────────────────────────────────────

  predict: (id: number) =>
    get<StatusPrediction>(`/applications/${id}/predict`),

  followUp: (id: number) =>
    get<FollowUpEmail>(`/applications/${id}/follow-up`),
};
