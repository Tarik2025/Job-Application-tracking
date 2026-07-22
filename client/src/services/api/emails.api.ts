import { get, post, del } from './client';
import type {
  EmailRecord,
  EmailClassification,
  ClassifyEmailResponse,
  EmailAccount,
  PaginatedResponse,
  ApplicationStatus,
} from '@/types/api.types';

export interface ClassifyEmailPayload {
  subject?: string;
  body: string;
  received_date?: string;
}

export interface ConfirmClassificationPayload {
  company: string;
  role?: string;
  status?: ApplicationStatus;
  received_date?: string;
  email_id?: number;
}

export interface AddEmailAccountPayload {
  email: string;
  password: string;
  host?: string;
  port?: number;
  label?: string;
}

export interface FetchEmailsResult {
  email: string;
  fetched?: number;
  error?: string;
  results?: Array<{
    subject: string;
    classification: EmailClassification;
    applicationId?: number;
  }>;
}

export const emailsApi = {
  list: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return get<PaginatedResponse<EmailRecord>>(`/emails${query}`);
  },

  classify: (payload: ClassifyEmailPayload) =>
    post<ClassifyEmailResponse>('/emails/classify', payload),

  confirmClassification: (payload: ConfirmClassificationPayload) =>
    post<{ applicationId: number; action: 'created' | 'updated' | 'exists' }>(
      '/emails/classify/confirm',
      payload,
    ),

  listAccounts: () =>
    get<EmailAccount[]>('/emails/accounts'),

  addAccount: (payload: AddEmailAccountPayload) =>
    post<{ id: number; message: string }>('/emails/accounts', payload),

  removeAccount: (id: number) =>
    del<{ message: string }>(`/emails/accounts/${id}`),

  fetchEmails: () =>
    post<{ results: FetchEmailsResult[] }>('/emails/fetch'),
};
