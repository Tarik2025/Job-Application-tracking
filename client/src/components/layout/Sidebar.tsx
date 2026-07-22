'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  Mail,
  FileText,
  GraduationCap,
  BarChart3,
  Target,
  Bell,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, Tooltip } from '@/components/ui';
import { useLocalStorage } from '@/hooks';
import { ROUTES } from '@/constants';

// ─── Nav item config ──────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: 'Applications',
    href: ROUTES.APPLICATIONS,
    icon: <Briefcase size={16} />,
  },
  {
    label: 'Email AI',
    href: ROUTES.EMAILS,
    icon: <Mail size={16} />,
  },
  {
    label: 'Resume',
    href: ROUTES.RESUME,
    icon: <FileText size={16} />,
  },
  {
    label: 'Interview Prep',
    href: ROUTES.INTERVIEW,
    icon: <GraduationCap size={16} />,
  },
  {
    label: 'Analytics',
    href: ROUTES.ANALYTICS,
    icon: <BarChart3 size={16} />,
  },
  {
    label: 'Goals',
    href: ROUTES.GOALS,
    icon: <Target size={16} />,
  },
  {
    label: 'Reminders',
    href: ROUTES.REMINDERS,
    icon: <Bell size={16} />,
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: <Activity size={16} />,
  },
  {
    label: 'Settings',
    href: ROUTES.SETTINGS,
    icon: <Settings size={16} />,
  },
];

// ─── Single nav item ──────────────────────────────────────────────────────────

function NavItemRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium',
        'transition-all duration-150 group relative',
        active
          ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)]',
        collapsed && 'justify-center px-2',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {/* Active indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--primary)] rounded-r-full" />
      )}

      <span className={cn('shrink-0', active && 'text-[var(--primary)]')}>
        {item.icon}
      </span>

      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}

      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed left-0 top-0 h-full z-30 flex flex-col',
        'bg-[var(--sidebar-bg)] border-r border-[var(--border)]',
        'overflow-hidden',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-14 px-3 border-b border-[var(--border)] shrink-0',
          collapsed ? 'justify-center' : 'gap-2.5',
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="font-semibold text-sm text-[var(--text)] whitespace-nowrap overflow-hidden"
            >
              Career Copilot
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <NavItemRow
            key={item.href}
            item={item}
            active={
              item.href === ROUTES.DASHBOARD
                ? pathname === item.href
                : (pathname ?? '').startsWith(item.href)
            }
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-[var(--border)] shrink-0">
        <Link
          href={ROUTES.PROFILE}
          className={cn(
            'flex items-center gap-2.5 p-2 rounded-lg',
            'hover:bg-[var(--input)] transition-colors',
            collapsed && 'justify-center',
          )}
        >
          <Avatar name={user?.name} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-medium text-[var(--text)] truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">
                  {user?.email}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-[72px] w-6 h-6 rounded-full',
          'bg-[var(--card)] border border-[var(--border)] shadow-sm',
          'flex items-center justify-center',
          'text-[var(--text-secondary)] hover:text-[var(--text)]',
          'transition-colors cursor-pointer z-10',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
