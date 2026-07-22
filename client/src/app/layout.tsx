import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { CSRFProvider } from '@/providers/CSRFProvider';

export const metadata: Metadata = {
  title: {
    default: 'Career Copilot — AI-Powered Job Application Tracker',
    template: '%s | Career Copilot',
  },
  description:
    'Track, analyze, and optimize your job applications with AI. Kanban board, email classification, resume matching, interview prep, and more.',
  keywords: ['job tracker', 'application tracker', 'career', 'AI', 'resume'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <ThemeProvider>
            <CSRFProvider>
              <ToastProvider>{children}</ToastProvider>
            </CSRFProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
