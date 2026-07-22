/**
 * Centralized TanStack Query key factory.
 *
 * Rules:
 * - Every key is a function — never a raw array literal scattered across the codebase.
 * - Hierarchical structure enables targeted invalidation (invalidate all applications
 *   vs. a single application vs. application tags).
 * - Keys are typed — no magic strings outside this file.
 */

export const queryKeys = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    all: () => ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },

  // ─── Applications ──────────────────────────────────────────────────────────
  applications: {
    all: () => ['applications'] as const,
    lists: () => ['applications', 'list'] as const,
    list: (params: Record<string, unknown>) => ['applications', 'list', params] as const,
    details: () => ['applications', 'detail'] as const,
    detail: (id: number) => ['applications', 'detail', id] as const,
    tags: () => ['applications', 'tags'] as const,
    reminders: (showDone?: boolean) => ['applications', 'reminders', { showDone }] as const,
    companies: () => ['applications', 'companies'] as const,
    weekly: () => ['applications', 'weekly'] as const,
    scores: () => ['applications', 'scores'] as const,
    predict: (id: number) => ['applications', 'predict', id] as const,
    followUp: (id: number) => ['applications', 'follow-up', id] as const,
  },

  // ─── Emails ────────────────────────────────────────────────────────────────
  emails: {
    all: () => ['emails'] as const,
    list: (params: Record<string, unknown>) => ['emails', 'list', params] as const,
    accounts: () => ['emails', 'accounts'] as const,
  },

  // ─── Resume ────────────────────────────────────────────────────────────────
  resumes: {
    all: () => ['resumes'] as const,
    list: () => ['resumes', 'list'] as const,
    analysis: (id: number) => ['resumes', 'analysis', id] as const,
  },

  // ─── Interview ─────────────────────────────────────────────────────────────
  interview: {
    all: () => ['interview'] as const,
    preps: () => ['interview', 'preps'] as const,
    prep: (id: number) => ['interview', 'prep', id] as const,
    calendar: (upcoming?: boolean) => ['interview', 'calendar', { upcoming }] as const,
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    all: () => ['analytics'] as const,
    dashboard: () => ['analytics', 'dashboard'] as const,
    companies: () => ['analytics', 'companies'] as const,
    timeline: () => ['analytics', 'timeline'] as const,
    salary: () => ['analytics', 'salary'] as const,
    skillsGap: () => ['analytics', 'skills-gap'] as const,
    offers: () => ['analytics', 'offers'] as const,
  },

  // ─── Advanced ──────────────────────────────────────────────────────────────
  advanced: {
    all: () => ['advanced'] as const,
    streak: () => ['advanced', 'streak'] as const,
    blacklist: () => ['advanced', 'blacklist'] as const,
    blacklistSuggest: () => ['advanced', 'blacklist', 'suggest'] as const,
    goals: () => ['advanced', 'goals'] as const,
    activity: (params: Record<string, unknown>) => ['advanced', 'activity', params] as const,
    documents: (params: Record<string, unknown>) => ['advanced', 'documents', params] as const,
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    all: () => ['admin'] as const,
    me: () => ['admin', 'me'] as const,
    stats: () => ['admin', 'stats'] as const,
    users: (params: Record<string, unknown>) => ['admin', 'users', params] as const,
    user: (id: number) => ['admin', 'user', id] as const,
    applications: (params: Record<string, unknown>) => ['admin', 'applications', params] as const,
    emails: (params: Record<string, unknown>) => ['admin', 'emails', params] as const,
    audit: (params: Record<string, unknown>) => ['admin', 'audit', params] as const,
  },

  // ─── Static / Reference ────────────────────────────────────────────────────
  colleges: {
    all: () => ['colleges'] as const,
    search: (q: string) => ['colleges', 'search', q] as const,
  },

  stacks: {
    all: () => ['stacks'] as const,
  },

  search: {
    results: (q: string) => ['search', q] as const,
  },
} as const;
