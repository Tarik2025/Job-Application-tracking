'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebounce, useKeyboard, useClickOutside } from '@/hooks';
import { searchApi } from '@/services/api/search.api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import { LIMITS } from '@/constants';
import { StatusBadge } from './Badge';
import type { ApplicationStatus } from '@/types/api.types';

// ─── Command Palette ──────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, LIMITS.SEARCH_DEBOUNCE_MS);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const { data: results, isLoading } = useQuery({
    queryKey: queryKeys.search.results(debouncedQuery),
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= LIMITS.SEARCH_MIN_LENGTH,
    staleTime: 30_000,
  });

  const hasResults =
    results &&
    (results.applications.length > 0 ||
      results.emails.length > 0 ||
      results.resumes.length > 0);

  const navigate = (path: string) => {
    onNavigate?.(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search size={15} className="text-[var(--text-secondary)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search applications, emails, resumes..."
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] outline-none"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--input)] border border-[var(--border)] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
                <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </div>
              )}

              {!isLoading && hasResults && (
                <div className="p-2">
                  {/* Applications */}
                  {results.applications.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Applications
                      </p>
                      {results.applications.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => navigate(`/applications/${app.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer text-left group"
                        >
                          <div className="w-7 h-7 rounded-md bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                            {app.company[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] truncate">
                              {app.company}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {app.role}
                            </p>
                          </div>
                          <StatusBadge
                            status={app.status as ApplicationStatus}
                            size="sm"
                          />
                          <ArrowRight
                            size={12}
                            className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Emails */}
                  {results.emails.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Emails
                      </p>
                      {results.emails.map((email) => (
                        <button
                          key={email.id}
                          onClick={() => navigate('/emails')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer text-left"
                        >
                          <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 text-xs">
                            @
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] truncate">
                              {email.subject ?? 'No subject'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {email.classification}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Resumes */}
                  {results.resumes.length > 0 && (
                    <div>
                      <p className="px-2 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Resumes
                      </p>
                      {results.resumes.map((resume) => (
                        <button
                          key={resume.id}
                          onClick={() => navigate('/resume')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer text-left"
                        >
                          <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 text-xs">
                            📄
                          </div>
                          <p className="text-sm font-medium text-[var(--text)] truncate">
                            {resume.filename}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Default state — no query */}
              {debouncedQuery.length < 2 && (
                <div className="p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-3 font-medium">
                    Quick navigation
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: 'Applications', path: '/applications', icon: '📋' },
                      { label: 'Analytics', path: '/analytics', icon: '📈' },
                      { label: 'Email AI', path: '/emails', icon: '📧' },
                      { label: 'Resume Match', path: '/resume', icon: '📄' },
                      { label: 'Interview Prep', path: '/interview', icon: '🎓' },
                      { label: 'Goals', path: '/goals', icon: '🎯' },
                    ].map((item) => (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer text-left"
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-sm text-[var(--text)]">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
              <span className="text-[10px] text-[var(--text-secondary)]">
                <kbd className="px-1 py-0.5 bg-[var(--input)] border border-[var(--border)] rounded text-[10px]">
                  ↑↓
                </kbd>{' '}
                navigate
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                <kbd className="px-1 py-0.5 bg-[var(--input)] border border-[var(--border)] rounded text-[10px]">
                  ↵
                </kbd>{' '}
                open
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                <kbd className="px-1 py-0.5 bg-[var(--input)] border border-[var(--border)] rounded text-[10px]">
                  ESC
                </kbd>{' '}
                close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Inline Search Bar ────────────────────────────────────────────────────────

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  onClear,
}: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        size={14}
        className="absolute left-3 text-[var(--text-secondary)] pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-8 pl-8 pr-8 text-sm rounded-lg',
          'bg-[var(--input)] border border-[var(--border)] text-[var(--text)]',
          'placeholder:text-[var(--text-secondary)] placeholder:opacity-60',
          'outline-none focus:border-[var(--primary)] transition-colors',
        )}
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2.5 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
