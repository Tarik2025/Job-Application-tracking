'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

// ─── Page Container ───────────────────────────────────────────────────────────

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidths = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'xl',
}: PageContainerProps) {
  return (
    <div className={cn('w-full mx-auto px-5 py-6', maxWidths[maxWidth], className)}>
      {children}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-1.5" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span className="text-[var(--text-secondary)] text-xs">/</span>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold text-[var(--text)] truncate">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
