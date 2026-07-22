import { get, post, del } from './client';
import type {
  StreakData,
  Goal,
  BlacklistEntry,
  Document,
  ActivityEntry,
  ApplicationScore,
  PaginatedResponse,
} from '@/types/api.types';

export interface CreateGoalPayload {
  title: string;
  target_count: number;
  period?: 'daily' | 'weekly' | 'monthly';
  start_date?: string;
  end_date?: string;
  goal_type?: 'applications' | 'interviews' | 'follow_ups' | 'custom';
}

export interface AddBlacklistPayload {
  company: string;
  reason?: string;
}

export interface CreateDocumentPayload {
  application_id?: number;
  doc_type?: string;
  title: string;
  content?: string;
}

export const advancedApi = {
  // ─── Streak ────────────────────────────────────────────────────────────────
  streak: () =>
    get<StreakData>('/advanced/streak'),

  // ─── Scores ────────────────────────────────────────────────────────────────
  scores: () =>
    get<ApplicationScore[]>('/advanced/scores'),

  syncScores: () =>
    post<{ message: string }>('/advanced/scores/sync'),

  // ─── Blacklist ─────────────────────────────────────────────────────────────
  listBlacklist: () =>
    get<BlacklistEntry[]>('/advanced/blacklist'),

  addBlacklist: (payload: AddBlacklistPayload) =>
    post<{ message: string }>('/advanced/blacklist', payload),

  removeBlacklist: (id: number) =>
    del<{ message: string }>(`/advanced/blacklist/${id}`),

  checkBlacklist: (company: string) =>
    get<{ blacklisted: boolean; entry?: BlacklistEntry }>(
      `/advanced/blacklist/check?company=${encodeURIComponent(company)}`,
    ),

  suggestBlacklist: () =>
    get<Array<{ company: string; times_ghosted: number; last_applied: string }>>(
      '/advanced/blacklist/suggest',
    ),

  // ─── Goals ─────────────────────────────────────────────────────────────────
  listGoals: () =>
    get<Goal[]>('/advanced/goals'),

  createGoal: (payload: CreateGoalPayload) =>
    post<{ id: number }>('/advanced/goals', payload),

  deleteGoal: (id: number) =>
    del<{ message: string }>(`/advanced/goals/${id}`),

  syncGoals: () =>
    post<{ message: string }>('/advanced/goals/sync'),

  // ─── Documents ─────────────────────────────────────────────────────────────
  listDocuments: (params: { application_id?: number; doc_type?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.application_id) qs.set('application_id', String(params.application_id));
    if (params.doc_type) qs.set('doc_type', params.doc_type);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return get<Document[]>(`/advanced/documents${query}`);
  },

  createDocument: (payload: CreateDocumentPayload) =>
    post<{ id: number }>('/advanced/documents', payload),

  deleteDocument: (id: number) =>
    del<{ message: string }>(`/advanced/documents/${id}`),

  // ─── Activity ──────────────────────────────────────────────────────────────
  activity: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return get<PaginatedResponse<ActivityEntry>>(`/advanced/activity${query}`);
  },
};
