'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Plus, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Label } from './FormElements';

export interface ComboboxProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onSearch?: (q: string) => void;
  onAddNew?: (value: string) => Promise<void> | void;
  loading?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  allowOther?: boolean; // shows "Other" option + free-text entry
  className?: string;
}

export function Combobox({
  label,
  placeholder = 'Search or select…',
  value,
  onChange,
  options,
  onSearch,
  onAddNew,
  loading,
  error,
  hint,
  required,
  disabled,
  allowOther = true,
  className,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Notify parent of search query changes
  useEffect(() => {
    if (open) onSearch?.(query);
  }, [query, open]);

  const filtered = query.length >= 1
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery('');
    setOpen(false);
    setOtherMode(false);
  };

  const handleOtherSubmit = async () => {
    const trimmed = otherText.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAddNew?.(trimmed);
      onChange(trimmed);
      setOtherText('');
      setOtherMode(false);
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  const displayValue = value || '';

  return (
    <div className={cn('flex flex-col relative', className)} ref={containerRef}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}

      {/* Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          'w-full h-9 px-3 text-sm rounded-lg text-left flex items-center justify-between gap-2',
          'bg-[var(--input)] border transition-colors duration-150',
          'focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-[var(--danger)]' : open ? 'border-[var(--primary)]' : 'border-[var(--border)]',
        )}
      >
        <span className={displayValue ? 'text-[var(--text)]' : 'text-[var(--text-secondary)] opacity-60'}>
          {displayValue || placeholder}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[100] mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
          style={{ top: '100%', left: 0 }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-[var(--text-secondary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full h-8 pl-8 pr-3 text-sm bg-[var(--input)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--text)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto bg-[var(--card)]">
            {loading ? (
              <div className="py-6 text-center text-xs text-[var(--text-secondary)]">Loading…</div>
            ) : filtered.length === 0 && !allowOther ? (
              <div className="py-6 text-center text-xs text-[var(--text-secondary)]">No results found</div>
            ) : (
              <>
                {filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-[var(--input)] transition-colors text-[var(--text)]"
                  >
                    <span>{opt}</span>
                    {value === opt && <Check size={13} className="text-[var(--primary)] shrink-0" />}
                  </button>
                ))}

                {/* Other option */}
                {allowOther && (
                  <button
                    type="button"
                    onClick={() => { setOtherMode(true); setQuery(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[var(--input)] transition-colors border-t border-[var(--border)] text-[var(--text-secondary)]"
                  >
                    <Plus size={13} />
                    {query.length > 0 ? `Add "${query}"` : 'Other / Add new'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Other free-text entry */}
          {otherMode && (
            <div className="p-2 border-t border-[var(--border)] bg-[var(--card)] flex gap-2">
              <input
                autoFocus
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleOtherSubmit()}
                placeholder="Enter name…"
                className="flex-1 h-8 px-3 text-sm bg-[var(--input)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--text)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
              />
              <button
                type="button"
                disabled={!otherText.trim() || adding}
                onClick={handleOtherSubmit}
                className="h-8 px-3 text-xs font-medium bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {adding ? '…' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

// ─── Multi-select tag combobox ────────────────────────────────────────────────

export interface MultiComboboxProps {
  label?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  onSearch?: (q: string) => void;
  onAddNew?: (value: string) => Promise<void> | void;
  loading?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  max?: number;
}

export function MultiCombobox({
  label,
  placeholder = 'Search and select…',
  values,
  onChange,
  options,
  onSearch,
  onAddNew,
  loading,
  error,
  hint,
  required,
  max,
}: MultiComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) onSearch?.(query);
  }, [query, open]);

  const filtered = query.length >= 1
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()) && !values.includes(o))
    : options.filter((o) => !values.includes(o));

  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      if (max && values.length >= max) return;
      const next = [...values, opt];
      onChange(next);
      if (max && next.length >= max) setOpen(false);
    }
  };

  const handleOtherSubmit = async () => {
    const trimmed = otherText.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAddNew?.(trimmed);
      if (!values.includes(trimmed)) onChange([...values, trimmed]);
      setOtherText('');
      setOtherMode(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col relative" ref={containerRef}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}

      {/* Selected tags */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-400 transition-colors">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        id={id}
        type="button"
        disabled={!!(max && values.length >= max)}
        onClick={() => { setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          'w-full h-9 px-3 text-sm rounded-lg text-left flex items-center justify-between gap-2',
          'bg-[var(--input)] border transition-colors duration-150',
          'focus:outline-none focus:border-[var(--primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-[var(--danger)]' : open ? 'border-[var(--primary)]' : 'border-[var(--border)]',
        )}
      >
        <span className="text-[var(--text-secondary)] opacity-60 text-sm">
          {max && values.length >= max ? `Max ${max} selected` : placeholder}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[100] mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
          style={{ top: '100%', left: 0 }}
        >
          <div className="p-2 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-[var(--text-secondary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full h-8 pl-8 pr-3 text-sm bg-[var(--input)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--text)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto bg-[var(--card)]">
            {loading ? (
              <div className="py-6 text-center text-xs text-[var(--text-secondary)]">Loading…</div>
            ) : (
              <>
                {filtered.map((opt) => (
                  <button key={opt} type="button" onClick={() => toggle(opt)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-[var(--input)] transition-colors text-[var(--text)]">
                    <span>{opt}</span>
                    {values.includes(opt) && <Check size={13} className="text-[var(--primary)] shrink-0" />}
                  </button>
                ))}
                {filtered.length === 0 && !otherMode && (
                  <div className="py-4 text-center text-xs text-[var(--text-secondary)]">No results</div>
                )}
                <button type="button" onClick={() => setOtherMode(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[var(--input)] transition-colors border-t border-[var(--border)] text-[var(--text-secondary)]">
                  <Plus size={13} />
                  {query.length > 0 ? `Add "${query}"` : 'Add custom'}
                </button>
              </>
            )}
          </div>
          {otherMode && (
            <div className="p-2 border-t border-[var(--border)] bg-[var(--card)] flex gap-2">
              <input autoFocus value={otherText} onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleOtherSubmit()}
                placeholder="Enter name…"
                className="flex-1 h-8 px-3 text-sm bg-[var(--input)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--text)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
              />
              <button type="button" disabled={!otherText.trim() || adding} onClick={handleOtherSubmit}
                className="h-8 px-3 text-xs font-medium bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity">
                {adding ? '…' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}
