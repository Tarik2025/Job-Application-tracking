'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-solid'
  | 'outline'
  | 'success';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-[var(--accent-h)] hover:border-[var(--accent-h)] shadow-sm shadow-[var(--primary)]/20',
  secondary:
    'bg-[var(--input)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)]/50 hover:text-[var(--text)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--input)] hover:text-[var(--text)]',
  danger:
    'bg-transparent text-[var(--danger)] border border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 hover:border-[var(--danger)]',
  'danger-solid':
    'bg-[var(--danger)] text-white border border-[var(--danger)] hover:opacity-90',
  outline:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)]/50',
  success:
    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-xl',
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'select-none whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
