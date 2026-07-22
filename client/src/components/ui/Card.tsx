'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const cardPadding = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover, padding = 'md', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--card)] border border-[var(--border)] rounded-xl',
        'transition-colors duration-150',
        hover && 'hover:border-[var(--primary)]/30 cursor-pointer',
        cardPadding[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';

// ─── StatCard ─────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

const statColors = {
  primary: {
    icon: 'bg-[var(--primary)]/10 text-[var(--primary)]',
    value: 'text-[var(--text)]',
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-400',
    value: 'text-[var(--text)]',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-400',
    value: 'text-[var(--text)]',
  },
  danger: {
    icon: 'bg-red-500/10 text-red-400',
    value: 'text-[var(--text)]',
  },
  info: {
    icon: 'bg-blue-500/10 text-blue-400',
    value: 'text-[var(--text)]',
  },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'primary',
  className,
  onClick,
}: StatCardProps) {
  const colors = statColors[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--card)] border border-[var(--border)] rounded-xl p-4',
        'transition-colors duration-150',
        onClick && 'cursor-pointer hover:border-[var(--primary)]/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
            {label}
          </p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', colors.value)}>
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-1 font-medium',
                trend.value >= 0 ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              {trend.label && (
                <span className="text-[var(--text-secondary)] font-normal ml-1">
                  {trend.label}
                </span>
              )}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              colors.icon,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--input)]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg"
        >
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[var(--input)] flex items-center justify-center text-[var(--text-secondary)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mb-4 text-xl">
        ⚠
      </div>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed mb-4">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertStyles: Record<AlertVariant, string> = {
  info: 'bg-blue-500/8 border-blue-500/20 text-blue-400',
  success: 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/8 border-amber-500/20 text-amber-400',
  error: 'bg-red-500/8 border-red-500/20 text-red-400',
};

const alertIcons: Record<AlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-3.5 rounded-lg border text-sm',
        alertStyles[variant],
        className,
      )}
    >
      <span className="shrink-0 text-base leading-5">{alertIcons[variant]}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          {label}
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }

  return (
    <div className={cn('h-px bg-[var(--border)]', className)} role="separator" />
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--input)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Previous page"
      >
        ‹
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer',
            p === page
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--input)] hover:text-[var(--text)]',
          )}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--input)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
