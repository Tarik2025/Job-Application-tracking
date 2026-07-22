'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, Mail, FileText, GraduationCap,
  BarChart3, Target, Bell, Activity, Settings, ChevronLeft,
  ChevronRight, Zap, ShieldAlert, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLocalStorage } from '@/hooks';
import { Avatar, Tooltip } from '@/components/ui';
import { adminApi } from '@/services/api/admin.api';
import type { AdminUser } from '@/types/api.types';
import { ROUTES } from '@/constants';
import { AdminUserContext } from './context';

const NAV_ITEMS = [
  { label: 'Dashboard',      href: 'dashboard',     icon: <LayoutDashboard size={16} /> },
  { label: 'Applications',   href: 'applications',  icon: <Briefcase size={16} /> },
  { label: 'Resume',         href: 'resume',        icon: <FileText size={16} /> },
  { label: 'Analytics',      href: 'analytics',     icon: <BarChart3 size={16} /> },
  { label: 'Goals',          href: 'goals',         icon: <Target size={16} /> },
  { label: 'Reminders',      href: 'reminders',     icon: <Bell size={16} /> },
  { label: 'Activity',       href: 'activity',      icon: <Activity size={16} /> },
  { label: 'Settings',       href: 'settings',      icon: <Settings size={16} /> },
];

export default function AdminUserViewLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const userId = Number(params?.id);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);

  const loadUser = useCallback(() => {
    if (userId) adminApi.getUser(userId).then(setUser).catch(() => {});
  }, [userId]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const base = `/admin/users/${userId}/view`;

  return (
    <AdminUserContext.Provider value={{ userId, user }}>
      <div className="min-h-screen bg-[var(--bg)]">

        {/* Admin impersonation banner */}
        <div className="fixed top-0 left-0 right-0 z-50 h-9 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <ShieldAlert size={13} />
            Viewing as admin — {user ? `${user.name} (${user.email})` : `User #${userId}`}
          </div>
          <button
            onClick={() => router.push(`${ROUTES.ADMIN_USERS}/${userId}`)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft size={12} /> Back to admin panel
          </button>
        </div>

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 64 : 220 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 top-9 h-[calc(100%-36px)] z-30 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)] overflow-hidden"
        >
          {/* Logo */}
          <div className={cn('flex items-center h-14 px-3 border-b border-[var(--border)] shrink-0', collapsed ? 'justify-center' : 'gap-2.5')}>
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
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
            {NAV_ITEMS.map(item => {
              const href = `${base}/${item.href}`;
              const active = item.href === 'dashboard'
                ? pathname === href
                : (pathname ?? '').startsWith(href);
              const content = (
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative',
                    active ? 'bg-[var(--primary)]/[0.12] text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)]',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--primary)] rounded-r-full" />}
                  <span className={cn('shrink-0', active && 'text-[var(--primary)]')}>{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return collapsed
                ? <Tooltip key={item.href} content={item.label} side="right">{content}</Tooltip>
                : <div key={item.href}>{content}</div>;
            })}
          </nav>

          {/* User section */}
          <div className="p-2 border-t border-[var(--border)] shrink-0">
            <div className={cn('flex items-center gap-2.5 p-2 rounded-lg', collapsed && 'justify-center')}>
              <Avatar name={user?.name} size="sm" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-xs font-medium text-[var(--text)] truncate">{user?.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Collapse toggle */}
          <div className={cn('px-2 pb-2 pt-1 shrink-0 border-t border-[var(--border)]', collapsed ? 'flex justify-center' : 'flex justify-end')}>
            <Tooltip content={collapsed ? 'Expand' : 'Collapse'} side="right">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors"
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </Tooltip>
          </div>
        </motion.aside>

        {/* Topbar */}
        <header className={cn(
          'fixed top-9 right-0 z-20 h-14 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]',
          'flex items-center justify-between gap-4 px-5 transition-all duration-200',
          collapsed ? 'left-16' : 'left-[220px]',
        )}>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text)]">{user?.name ?? `User #${userId}`}</span>
            <span>·</span>
            <span className="text-xs">{user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Admin View
            </span>
            <Avatar name={user?.name} size="sm" />
          </div>
        </header>

        {/* Main content */}
        <main className={cn('transition-all duration-200 pt-[92px]', collapsed ? 'ml-16' : 'ml-[220px]')}>
          {children}
        </main>
      </div>
    </AdminUserContext.Provider>
  );
}
