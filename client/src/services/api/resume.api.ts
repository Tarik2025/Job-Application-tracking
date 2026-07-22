import { get, del, upload } from './client';
import type { Resume, ResumeAnalysis, ResumeMatch } from '@/types/api.types';
import client from './client';

export interface MatchResumePayload {
  resume_id?: number;
  application_id?: number;
  job_description?: string;
}

export interface UploadResumeResponse {
  id: number;
  filename: string;
  analysis: ResumeAnalysis;
}

export const resumeApi = {
  list: () =>
    get<Resume[]>('/resumes'),

  upload: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('resume', file);
    return upload<UploadResumeResponse>('/resumes/upload', formData, onProgress);
  },

  delete: (id: number) =>
    del<{ message: string }>(`/resumes/${id}`),

  analyze: (id: number) =>
    get<ResumeAnalysis>(`/resumes/${id}/analyze`),

  match: (payload: MatchResumePayload) =>
    client.post<ResumeMatch>('/resumes/match', payload).then((r) => r.data),
};
