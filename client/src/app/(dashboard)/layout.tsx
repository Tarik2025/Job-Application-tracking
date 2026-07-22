'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useLocalStorage } from '@/hooks';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants';
import { LoadingState } from '@/components/ui';

// ─── Inner layout (needs auth context) ───────────────────────────────────────

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed] = useLocalStorage('sidebar-collapsed', false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <LoadingState message="Loading your workspace..." />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <Topbar sidebarCollapsed={collapsed} />
      <main
        className={cn(
          'transition-all duration-200 pt-14',
          collapsed ? 'ml-16' : 'ml-[220px]',
        )}
      >
        {children}
      </main>
    </div>
  );
}

// ─── Dashboard layout (wraps with AuthProvider) ───────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
