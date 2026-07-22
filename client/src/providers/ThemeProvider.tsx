'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider using next-themes.
 * Replaces the custom ThemeProvider in lib/theme.js.
 *
 * - defaultTheme: 'dark' — matches existing design
 * - attribute: 'data-theme' — matches existing CSS variable selectors
 * - enableSystem: true — respects OS preference on first visit
 * - disableTransitionOnChange: true — prevents flash during theme switch
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
