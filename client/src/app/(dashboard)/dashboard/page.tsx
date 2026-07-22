'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MessageSquare,
  TrendingUp,
  Award,
  Flame,
  AlertCircle,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { queryKeys } from '@/services/queryKeys';
import { applicationsApi } from '@/services/api/applications.api';
import { advancedApi } from '@/services/api/advanced.api';
import { useAuth } from '@/providers/AuthProvider';
import {
  StatCard,
  SkeletonStatCard,
  Card,
  StatusBadge,
  EmptyState,
  ErrorState,
  Button,
  Alert,
} from '@/components/ui';
import { PageContainer, PageHeader, SectionHeader } from '@/components/layout/PageContainer';
import { ROUTES, STALE_TIMES } from '@/constants';
import type { ApplicationStatus } from '@/types/api.types';

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: weekly, isLoading: weeklyLoading, error: weeklyError } = useQuery({
    queryKey: queryKeys.applications.weekly(),
    queryFn: applicationsApi.weeklyReport,
    staleTime: STALE_TIMES.SHORT,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: queryKeys.applications.list({ limit: 8, sort_by: 'applied_date', sort_dir: 'DESC' }),
    queryFn: () => applicationsApi.list({ limit: 8, sort_by: 'applied_date', sort_dir: 'DESC' }),
    staleTime: STALE_TIMES.SHORT,
  });

  const { data: streak } = useQuery({
    queryKey: queryKeys.advanced.streak(),
    queryFn: advancedApi.streak,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { data: reminders } = useQuery({
    queryKey: queryKeys.applications.reminders(false),
    queryFn: () => applicationsApi.listReminders(false),
    staleTime: STALE_TIMES.SHORT,
  });

  const overdueReminders = reminders?.filter((r) => new Date(r.remind_at) < new Date()) ?? [];
  const recentApps = recentData?.data ?? [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'} 👋`}
        description="Here's your job search overview"
        actions={
          <Link href={ROUTES.APPLICATIONS}>
            <Button size="sm" leftIcon={<Plus size={13} />}>New Application</Button>
          </Link>
        }
      />

      {overdueReminders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <Alert variant="warning" title={`${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? 's' : ''}`}>
            <span>
              You have follow-ups that need attention.{' '}
              <Link href={ROUTES.REMINDERS} className="underline font-medium">View reminders →</Link>
            </span>
          </Alert>
        </motion.div>
      )}

      {streak && streak.current_streak > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <Card className="flex items-center gap-3 py-3 px-4 bg-amber-500/5 border-amber-500/20">
            <Flame size={18} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-amber-400">{streak.current_streak} day streak!</span>
              <span className="text-sm text-[var(--text-secondary)] ml-2">Keep applying to maintain your momentum.</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">Best: {streak.longest_streak} days</span>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {weeklyLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={stagger.item}><SkeletonStatCard /></motion.div>
          ))
        ) : weeklyError ? (
          <div className="col-span-4"><ErrorState description="Failed to load weekly stats." /></div>
        ) : (
          <>
            <motion.div variants={stagger.item}>
              <StatCard label="Applied this week" value={weekly?.applied ?? 0} icon={<Briefcase size={16} />} color="primary" />
            </motion.div>
            <motion.div variants={stagger.item}>
              <StatCard label="Responses" value={weekly?.responses ?? 0} icon={<MessageSquare size={16} />} color="info" />
            </motion.div>
            <motion.div variants={stagger.item}>
              <StatCard label="Interviews" value={weekly?.interviews ?? 0} icon={<TrendingUp size={16} />} color="success" />
            </motion.div>
            <motion.div variants={stagger.item}>
              <StatCard label="Active pipeline" value={weekly?.totalActive ?? 0} icon={<Award size={16} />} color="warning" />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent applications */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Recent Applications"
            actions={
              <Link href={ROUTES.APPLICATIONS} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            }
          />
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Briefcase size={20} />}
                title="No applications yet"
                description="Start tracking your job applications to see them here."
                action={
                  <Link href={ROUTES.APPLICATIONS}>
                    <Button size="sm" leftIcon={<Plus size={13} />}>Add your first application</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-2">
              {recentApps.map((app) => (
                <motion.div key={app.id} variants={stagger.item}>
                  <Link href={ROUTES.APPLICATION_DETAIL(app.id)}>
                    <Card hover className="flex items-center gap-3 py-3 px-4">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                        {app.company[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{app.company}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {app.role}{app.platform && ` · ${app.platform}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {app.days_since != null && (
                          <span className="text-[11px] text-[var(--text-secondary)]">{app.days_since}d ago</span>
                        )}
                        <StatusBadge status={app.status as ApplicationStatus} size="sm" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div>
            <SectionHeader title="This Week" />
            <Card padding="none">
              {[
                { label: 'Applied', value: weekly?.applied ?? 0, icon: <Briefcase size={13} /> },
                { label: 'Interviews', value: weekly?.interviews ?? 0, icon: <TrendingUp size={13} /> },
                { label: 'Offers', value: weekly?.offers ?? 0, icon: <Award size={13} /> },
                { label: 'Overdue', value: weekly?.overdueReminders ?? 0, icon: <AlertCircle size={13} />, danger: (weekly?.overdueReminders ?? 0) > 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${item.danger ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </Card>
          </div>

          {streak && (
            <div>
              <SectionHeader title="Streak" />
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-[var(--text)]">{streak.current_streak} days</span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">Best: {streak.longest_streak}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 rounded-lg bg-[var(--input)]">
                    <p className="text-base font-bold text-[var(--text)] tabular-nums">{streak.this_week}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">This week</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--input)]">
                    <p className="text-base font-bold text-[var(--text)] tabular-nums">{streak.this_month}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">This month</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div>
            <SectionHeader title="Quick Actions" />
            <div className="space-y-1.5">
              {[
                { label: 'Classify an email', href: ROUTES.EMAILS, icon: '📧' },
                { label: 'Match resume to JD', href: ROUTES.RESUME, icon: '📄' },
                { label: 'Generate interview prep', href: ROUTES.INTERVIEW, icon: '🎓' },
                { label: 'View analytics', href: ROUTES.ANALYTICS, icon: '📈' },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-sm text-[var(--text)]">{item.label}</span>
                    <ChevronRight size={12} className="ml-auto text-[var(--text-secondary)]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
