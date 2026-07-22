'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, MessageSquare, TrendingUp, Award, Flame, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { StatCard, SkeletonStatCard, Card, StatusBadge, EmptyState } from '@/components/ui';
import { PageContainer, PageHeader, SectionHeader } from '@/components/layout/PageContainer';
import type { ApplicationStatus } from '@/types/api.types';

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export default function AdminUserDashboardPage() {
  const { userId, user } = useAdminUser();
  const base = `/admin/users/${userId}/view`;

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-user-analytics', userId],
    queryFn: () => adminApi.getUserAnalytics(userId),
    enabled: !!userId,
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-user-applications', userId, 'recent'],
    queryFn: () => adminApi.getUserApplications(userId, { limit: 8, sort_by: 'applied_date', sort_dir: 'DESC' }),
    enabled: !!userId,
  });

  const { data: streak } = useQuery({
    queryKey: ['admin-user-streak', userId],
    queryFn: () => adminApi.getUserStreak(userId),
    enabled: !!userId,
  });

  const recentApps = appsData?.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={`${user?.name ?? 'User'}'s Dashboard`}
        description="Viewing as admin"
      />

      {streak && streak.current_streak > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <Card className="flex items-center gap-3 py-3 px-4 bg-amber-500/5 border-amber-500/20">
            <Flame size={18} className="text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-amber-400">{streak.current_streak} day streak!</span>
            <span className="text-sm text-[var(--text-secondary)] ml-1">Best: {streak.longest_streak} days</span>
          </Card>
        </motion.div>
      )}

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <motion.div key={i} variants={stagger.item}><SkeletonStatCard /></motion.div>)
        ) : (
          <>
            <motion.div variants={stagger.item}><StatCard label="Total Applications" value={analytics?.total ?? 0} icon={<Briefcase size={16} />} color="primary" /></motion.div>
            <motion.div variants={stagger.item}><StatCard label="Response Rate" value={`${analytics?.responseRate ?? 0}%`} icon={<MessageSquare size={16} />} color="info" /></motion.div>
            <motion.div variants={stagger.item}><StatCard label="Interview Rate" value={`${analytics?.interviewRate ?? 0}%`} icon={<TrendingUp size={16} />} color="success" /></motion.div>
            <motion.div variants={stagger.item}><StatCard label="Offer Rate" value={`${analytics?.offerRate ?? 0}%`} icon={<Award size={16} />} color="warning" /></motion.div>
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SectionHeader
            title="Recent Applications"
            actions={<Link href={`${base}/applications`} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></Link>}
          />
          {appsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}</div>
          ) : recentApps.length === 0 ? (
            <Card><EmptyState icon={<Briefcase size={20} />} title="No applications yet" /></Card>
          ) : (
            <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-2">
              {recentApps.map(app => (
                <motion.div key={app.id} variants={stagger.item}>
                  <Card hover className="flex items-center gap-3 py-3 px-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                      {app.company[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{app.company}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{app.role}{app.platform && ` · ${app.platform}`}</p>
                    </div>
                    <StatusBadge status={app.status as ApplicationStatus} size="sm" />
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <SectionHeader title="Stats" />
            <Card padding="none">
              {[
                { label: 'Total', value: analytics?.total ?? 0, icon: <Briefcase size={13} /> },
                { label: 'This week', value: streak?.this_week ?? 0, icon: <TrendingUp size={13} /> },
                { label: 'This month', value: streak?.this_month ?? 0, icon: <Award size={13} /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">{item.icon}<span className="text-xs">{item.label}</span></div>
                  <span className="text-sm font-semibold tabular-nums text-[var(--text)]">{item.value}</span>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <SectionHeader title="Quick Links" />
            <div className="space-y-1.5">
              {[
                { label: 'Applications', href: `${base}/applications` },
                { label: 'Analytics', href: `${base}/analytics` },
                { label: 'Goals', href: `${base}/goals` },
                { label: 'Activity', href: `${base}/activity` },
              ].map(item => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--input)] transition-colors cursor-pointer">
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
