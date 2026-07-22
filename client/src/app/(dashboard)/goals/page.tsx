'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Flame, Target, Trophy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { advancedApi } from '@/services/api/advanced.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES, GOAL_TYPES, GOAL_PERIODS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Card, Skeleton, EmptyState } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { getErrorMessage } from '@/utils';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  goal_type: z.enum(['applications', 'interviews', 'follow_ups', 'custom']),
  target_count: z.coerce.number().min(1, 'Must be at least 1'),
  period: z.enum(['daily', 'weekly', 'monthly']),
});
type FormData = z.infer<typeof schema>;

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: queryKeys.advanced.streak(),
    queryFn: advancedApi.streak,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: queryKeys.advanced.goals(),
    queryFn: advancedApi.listGoals,
    staleTime: STALE_TIMES.SHORT,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { goal_type: 'applications', period: 'weekly', target_count: 10 },
  });

  const { mutate: createGoal, isPending: creating } = useMutation({
    mutationFn: (data: FormData) => advancedApi.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.advanced.goals() });
      toast.success('Goal created');
      reset();
      setAddOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteGoal } = useMutation({
    mutationFn: advancedApi.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.advanced.goals() });
      toast.success('Goal deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Goals & Streak"
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            New goal
          </Button>
        }
      />

      {/* Streak cards */}
      {streakLoading ? (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : streak && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Current Streak', value: `${streak.current_streak}d`, icon: <Flame size={18} className="text-orange-400" />, highlight: true },
            { label: 'Longest Streak', value: `${streak.longest_streak}d`, icon: <Trophy size={18} className="text-amber-400" /> },
            { label: 'Total Days', value: streak.total_days_applied, icon: <Target size={18} /> },
            { label: 'This Week', value: streak.this_week, icon: <Target size={18} /> },
            { label: 'This Month', value: streak.this_month, icon: <Target size={18} /> },
          ].map(({ label, value, icon, highlight }) => (
            <div key={label} className={`p-4 rounded-xl border ${highlight ? 'border-orange-500/30 bg-orange-500/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-[var(--text-secondary)]">{label}</span></div>
              <p className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-[var(--text)]'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Goals */}
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Active Goals</h3>
      {goalsLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !goals?.length ? (
        <EmptyState
          icon={<Target size={28} />}
          title="No goals yet"
          description="Set a goal to stay motivated"
          action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Create goal</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round(((g.progress ?? g.current_count) / g.target_count) * 100));
            return (
              <Card key={g.id} className={g.is_completed ? 'border-emerald-500/30 bg-emerald-500/5' : ''}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-[var(--text)] text-sm">{g.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">{g.goal_type} · {g.period}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {g.is_completed && <span className="text-xs text-emerald-400 font-medium">✓ Done</span>}
                    <button
                      onClick={() => { if (confirm('Delete goal?')) deleteGoal(g.id); }}
                      className="p-1 rounded hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                  <span>{g.current_count} / {g.target_count}</span>
                  <span className="font-medium text-[var(--text)]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${g.is_completed ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Goal">
        <form onSubmit={handleSubmit((d) => createGoal(d))} className="space-y-4">
          <Input label="Title" placeholder="Apply to 10 companies this week" error={errors.title?.message} required {...register('title')} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={GOAL_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
              {...register('goal_type')}
            />
            <Select
              label="Period"
              options={GOAL_PERIODS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
              {...register('period')}
            />
          </div>
          <Input label="Target count" type="number" min={1} error={errors.target_count?.message} required {...register('target_count')} />
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create goal</Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
