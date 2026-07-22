'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Download,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { useKeyboard, useLocalStorage } from '@/hooks';
import { Avatar, Tooltip, ActionMenu } from '@/components/ui';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { authApi } from '@/services/api/auth.api';
import { applicationsApi } from '@/services/api/applications.api';
import { downloadBlob } from '@/utils';
import { toast } from 'sonner';
import { ROUTES } from '@/constants';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg bg-[var(--input)]" />;
  }

  return (
    <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'bg-[var(--input)] border border-[var(--border)]',
          'text-[var(--text-secondary)] hover:text-[var(--text)]',
          'transition-colors cursor-pointer',
        )}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </Tooltip>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

interface TopbarProps {
  sidebarCollapsed?: boolean;
}

export function Topbar({ sidebarCollapsed }: TopbarProps) {
  const router = useRouter();
  const { user, invalidate } = useAuth();
  const queryClient = useQueryClient();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState(false);

  // Cmd+K / Ctrl+K opens command palette
  useKeyboard('k', () => setCommandOpen(true), { meta: true });

  const handleLogout = async () => {
    try {
      await authApi.logout();
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    } catch {
      toast.error('Failed to log out');
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const blob = await applicationsApi.exportCsv();
      downloadBlob(blob, `applications-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const userMenuItems = [
    {
      label: 'Profile',
      icon: <User size={13} />,
      onClick: () => router.push(ROUTES.PROFILE),
    },
    {
      label: 'Settings',
      icon: <Settings size={13} />,
      onClick: () => router.push(ROUTES.SETTINGS),
    },
    {
      label: 'Sign out',
      icon: <LogOut size={13} />,
      onClick: handleLogout,
      variant: 'danger' as const,
      separator: true,
    },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 z-20 h-14',
          'bg-[var(--bg)]/80 backdrop-blur-xl',
          'border-b border-[var(--border)]',
          'flex items-center justify-between gap-4 px-5',
          'transition-all duration-200',
          sidebarCollapsed ? 'left-16' : 'left-[220px]',
        )}
      >
        {/* Search trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className={cn(
            'flex items-center gap-2.5 h-8 px-3 rounded-lg',
            'bg-[var(--input)] border border-[var(--border)]',
            'text-sm text-[var(--text-secondary)]',
            'hover:border-[var(--primary)]/40 transition-colors cursor-pointer',
            'min-w-[200px] max-w-xs',
          )}
          aria-label="Open search"
        >
          <Search size={13} />
          <span className="flex-1 text-left text-xs">Search everything...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg)] border border-[var(--border)] rounded">
            ⌘K
          </kbd>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <Tooltip content="Export CSV">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg',
                'bg-[var(--input)] border border-[var(--border)]',
                'text-[var(--text-secondary)] hover:text-[var(--text)]',
                'transition-colors cursor-pointer disabled:opacity-50',
              )}
              aria-label="Export CSV"
            >
              {exportLoading ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
            </button>
          </Tooltip>

          <ThemeToggle />

          {/* User menu */}
          <ActionMenu
            trigger={
              <button
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer"
                aria-label="User menu"
              >
                <Avatar name={user?.name} size="sm" />
                <span className="hidden sm:block text-xs font-medium text-[var(--text)] max-w-[100px] truncate">
                  {user?.name}
                </span>
              </button>
            }
            items={userMenuItems}
            align="end"
          />
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(path) => router.push(path)}
      />
    </>
  );
}
