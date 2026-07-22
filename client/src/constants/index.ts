/**
 * Centralized application constants.
 * Single source of truth for all magic strings, limits, and config values.
 */

export const APP_NAME = 'Career Copilot';
export const APP_VERSION = '2.0.0';

// Application statuses — must match backend CHECK constraint exactly
export const APPLICATION_STATUSES = [
  'applied',
  'under_review',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Priority levels
export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// Work modes
export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

// Interview types
export const INTERVIEW_TYPES = [
  'phone',
  'video',
  'onsite',
  'coding',
  'system_design',
  'hr',
  'managerial',
] as const;

// Interview outcomes
export const INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'rescheduled'] as const;

// Document types
export const DOCUMENT_TYPES = ['cover_letter', 'offer_letter', 'referral', 'other'] as const;

// Goal types
export const GOAL_TYPES = ['applications', 'interviews', 'follow_ups', 'custom'] as const;

// Goal periods
export const GOAL_PERIODS = ['daily', 'weekly', 'monthly'] as const;

// Email classification types
export const EMAIL_CLASSIFICATIONS = [
  'application_received',
  'interview_invitation',
  'rejection',
  'offer',
  'follow_up',
  'other',
] as const;

// Status display config — color tokens + labels
export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  applied: {
    label: 'Applied',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  interview: {
    label: 'Interview',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  offer: {
    label: 'Offer',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
};

export const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; color: string; bg: string }
> = {
  low: { label: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/10' },
};

// API limits (mirrors backend constraints)
export const LIMITS = {
  MAX_EMAIL_ACCOUNTS: 5,
  MAX_RESUMES: 10,
  MAX_BULK_OPS: 100,
  MAX_RESUME_SIZE_MB: 2,
  AI_RATE_LIMIT_PER_HOUR: 10,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_DEBOUNCE_MS: 300,
  PAGINATION_DEFAULT: 20,
  PAGINATION_MAX: 100,
} as const;

// Route paths — single source of truth for navigation
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  APPLICATIONS: '/applications',
  APPLICATION_DETAIL: (id: number | string) => `/applications/${id}`,
  EMAILS: '/emails',
  RESUME: '/resume',
  INTERVIEW: '/interview',
  ANALYTICS: '/analytics',
  GOALS: '/goals',
  REMINDERS: '/reminders',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_USERS: '/admin/users',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_EMAILS: '/admin/emails',
  ADMIN_AUDIT: '/admin/audit',
} as const;

// Query stale times
export const STALE_TIMES = {
  INSTANT: 0,
  SHORT: 30 * 1000,        // 30s — frequently changing data
  MEDIUM: 2 * 60 * 1000,   // 2m  — moderately changing data
  LONG: 5 * 60 * 1000,     // 5m  — slowly changing data
  STATIC: 60 * 60 * 1000,  // 1h  — near-static data (colleges, stacks)
} as const;
