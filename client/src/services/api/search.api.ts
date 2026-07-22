import { get, post } from './client';
import type { SearchResults } from '@/types/api.types';

export const searchApi = {
  search: (q: string) =>
    get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export const collegesApi = {
  search: (q?: string) =>
    get<string[]>(`/colleges${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  add: (name: string) =>
    post<{ message: string }>('/colleges', { name }),
};

export const stacksApi = {
  list: () =>
    get<string[]>('/stacks'),

  add: (name: string) =>
    post<{ message: string }>('/stacks', { name }),
};
