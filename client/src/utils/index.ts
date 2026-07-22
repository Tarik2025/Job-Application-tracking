/**
 * Utility functions used across the application.
 * Pure functions — no side effects, no imports from feature code.
 */

import { type ApplicationStatus, type PriorityLevel } from '@/types/api.types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/constants';

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Formats a date string into a human-readable relative time.
 * e.g. "2 days ago", "just now", "3 months ago"
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m} ${m === 1 ? 'min' : 'mins'} ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }
  if (seconds < 2592000) {
    const d = Math.floor(seconds / 86400);
    return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  }
  if (seconds < 31536000) {
    const mo = Math.floor(seconds / 2592000);
    return `${mo} ${mo === 1 ? 'month' : 'months'} ago`;
  }
  const y = Math.floor(seconds / 31536000);
  return `${y} ${y === 1 ? 'year' : 'years'} ago`;
}

/**
 * Formats a date string to a short readable format.
 * e.g. "Jan 15, 2025"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date string to include time.
 * e.g. "Jan 15, 2025 at 2:30 PM"
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns ISO date string for today.
 * e.g. "2025-01-15"
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns ISO date string N days from now.
 */
export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getStatusConfig(status: ApplicationStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.applied;
}

export function getPriorityConfig(priority: PriorityLevel) {
  return PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Returns initials from a name string.
 * e.g. "John Doe" → "JD", "Alice" → "A"
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncates a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Number helpers ───────────────────────────────────────────────────────────

/**
 * Formats a number with commas.
 * e.g. 1234567 → "1,234,567"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/**
 * Formats a percentage.
 * e.g. 0.756 → "75.6%"
 */
export function formatPercent(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}%`;
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

/**
 * Triggers a browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats file size in human-readable form.
 * e.g. 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Extracts a user-friendly message from any error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Safely opens a URL in a new tab.
 * Validates the URL before opening to prevent XSS.
 */
export function openUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch {
    // Invalid URL — do nothing
  }
}

// ─── Array helpers ────────────────────────────────────────────────────────────

/**
 * Groups an array of objects by a key.
 */
export function groupBy<T>(
  array: T[],
  key: keyof T,
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const groupKey = String(item[key]);
      return {
        ...groups,
        [groupKey]: [...(groups[groupKey] ?? []), item],
      };
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Removes duplicate values from an array.
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
