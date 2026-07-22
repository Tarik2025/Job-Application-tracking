'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Target, Trophy } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { Card, Skeleton, EmptyState } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

export default function AdminUserGoalsPage() {
  const { userId } = useAdminUser();

  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ['admin-user-streak', userId],
    queryFn: () => adminApi.getUserStreak(userId),
    enabled: !!userId,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['admin-user-goals', userId],
    queryFn: () => adminApi.getUserGoals(userId),
    enabled: !!userId,
  });

  return (
    <PageContainer>
      <PageHeader title="Goals & Streak" />

      {streakLoading ? (
        <div className="grid grid-cols-5 gap-4 mb-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : streak && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Current Streak', value: `${streak.current_streak}d`, icon: <Flame size={18} className="text-orange-400" />, highlight: true },
            { label: 'Longest Streak', value: `${streak.longest_streak}d`, icon: <Trophy size={18} className="text-amber-400" /> },
            { label: 'Total Days', value: streak.total_days_applied, icon: <Target size={18} /> },
            { label: 'This Week', value: streak.this_week, icon: <Target size={18} /> },
            { label: 'This Month', value: streak.this_month, icon: <Target size={18} /> },
          ].map(({ label, value, icon, highlight }) => (
            <div key={label} className={`p-4 rounded-xl border ${highlight ? 'border-orange-500/30 bg-orange-500/5' : 'border-[var(--border)] bg-[var(--card)]'}`}>
              <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-[var(--text-secondary)]">{label}</span></div>
              <p className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-[var(--text)]'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Goals</h3>
      {goalsLoading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !goals?.length ? (
        <EmptyState icon={<Target size={28} />} title="No goals set" description="This user hasn't created any goals yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = Math.min(100, Math.round(((g.progress ?? g.current_count) / g.target_count) * 100));
            return (
              <Card key={g.id} className={g.is_completed ? 'border-emerald-500/30 bg-emerald-500/5' : ''}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-[var(--text)] text-sm">{g.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">{g.goal_type} · {g.period}</p>
                  </div>
                  {g.is_completed && <span className="text-xs text-emerald-400 font-medium">✓ Done</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                  <span>{g.current_count} / {g.target_count}</span>
                  <span className="font-medium text-[var(--text)]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${g.is_completed ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`} style={{ width: `${pct}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
