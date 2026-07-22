import { get, post, put } from './client';
import type {
  InterviewPrepSummary,
  InterviewPrepDetail,
  InterviewPrepResult,
  Interview,
} from '@/types/api.types';

export interface GeneratePrepPayload {
  application_id?: number;
  role?: string;
  company?: string;
}

export interface CreateInterviewPayload {
  application_id: number;
  round_name: string;
  interview_date: string;
  interview_type?: string;
  interviewer?: string;
  meeting_link?: string;
  notes?: string;
}

export interface UpdateInterviewPayload {
  outcome?: string;
  notes?: string;
  interview_date?: string;
  meeting_link?: string;
}

export const interviewApi = {
  generate: (payload: GeneratePrepPayload) =>
    post<InterviewPrepResult>('/interview/generate', payload),

  listPreps: () =>
    get<InterviewPrepSummary[]>('/interview'),

  getPrep: (id: number) =>
    get<InterviewPrepDetail>(`/interview/${id}`),

  listInterviews: (upcoming?: boolean) =>
    get<Interview[]>(`/advanced/interviews${upcoming ? '?upcoming=1' : ''}`),

  createInterview: (payload: CreateInterviewPayload) =>
    post<{ id: number }>('/advanced/interviews', payload),

  updateInterview: (id: number, payload: UpdateInterviewPayload) =>
    put<{ message: string }>(`/advanced/interviews/${id}`, payload),
};
