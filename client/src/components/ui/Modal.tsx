'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideClose?: boolean;
  className?: string;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose = false,
  className,
}: ModalProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full bg-[var(--card)] border border-[var(--border)]',
              'rounded-xl shadow-2xl max-h-[90vh] flex flex-col',
              modalSizes[size],
              className,
            )}
          >
            {/* Header */}
            {(title || !hideClose) && (
              <div className="flex items-start justify-between p-5 border-b border-[var(--border)] shrink-0">
                <div>
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-base font-semibold text-[var(--text)]"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className={cn(
                      'ml-4 shrink-0 w-7 h-7 flex items-center justify-center',
                      'rounded-md text-[var(--text-secondary)] hover:text-[var(--text)]',
                      'hover:bg-[var(--input)] transition-colors cursor-pointer',
                    )}
                    aria-label="Close modal"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
          {description && (
            <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger-solid' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Sheet (side drawer) ──────────────────────────────────────────────────────

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const sheetSizes = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
};

const sheetVariants = {
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
}: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            {...sheetVariants[side]}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative flex flex-col bg-[var(--card)] border-[var(--border)]',
              'h-full shadow-2xl',
              side === 'right'
                ? 'ml-auto border-l'
                : 'mr-auto border-r',
              sheetSizes[size],
            )}
          >
            {(title || true) && (
              <div className="flex items-start justify-between p-5 border-b border-[var(--border)] shrink-0">
                <div>
                  {title && (
                    <h2 className="text-base font-semibold text-[var(--text)]">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
