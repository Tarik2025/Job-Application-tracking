'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';
import type { ApplicationStatus, PriorityLevel } from '@/types/api.types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/constants';

// ─── Badge ────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--input)] text-[var(--text-secondary)] border border-[var(--border)]',
  primary: 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  muted: 'bg-[var(--input)] text-[var(--text-secondary)] border border-transparent',
};

const badgeSizes = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-400',
            variant === 'warning' && 'bg-amber-400',
            variant === 'danger' && 'bg-red-400',
            variant === 'info' && 'bg-blue-400',
            variant === 'primary' && 'bg-[var(--primary)]',
            (variant === 'default' || variant === 'muted') &&
              'bg-[var(--text-secondary)]',
          )}
        />
      )}
      {children}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.applied;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap',
        config.bg,
        config.color,
        `border ${config.border}`,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          status === 'applied' && 'bg-indigo-400',
          status === 'under_review' && 'bg-amber-400',
          status === 'interview' && 'bg-blue-400',
          status === 'offer' && 'bg-emerald-400',
          status === 'rejected' && 'bg-red-400',
          status === 'withdrawn' && 'bg-gray-400',
        )}
      />
      {config.label}
    </span>
  );
}

// ─── PriorityBadge ────────────────────────────────────────────────────────────

export function PriorityBadge({
  priority,
  size = 'md',
}: {
  priority: PriorityLevel;
  size?: 'sm' | 'md';
}) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        config.bg,
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface TagProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export function Tag({ name, color = '#6366f1', onRemove, size = 'md' }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      )}
      style={{
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity cursor-pointer"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'Avatar'}
        className={cn(
          'rounded-full object-cover shrink-0',
          avatarSizes[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-[var(--primary)]/15 text-[var(--primary)]',
        'flex items-center justify-center font-semibold shrink-0',
        avatarSizes[size],
        className,
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
