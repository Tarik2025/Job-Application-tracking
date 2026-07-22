'use client';

import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast notification provider using Sonner.
 *
 * Sonner is chosen over react-hot-toast because:
 * - Native Next.js 13+ App Router support
 * - Stacking toasts with proper queue management
 * - Built-in promise toasts for async operations
 * - Accessible by default (role="status", aria-live)
 * - Matches our design system via CSS variables
 */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </>
  );
}
