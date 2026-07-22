'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Clock, CheckCircle } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { Card, EmptyState, Skeleton } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDateTime } from '@/utils';
import type { Reminder } from '@/types/api.types';

export default function AdminUserRemindersPage() {
  const { userId } = useAdminUser();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['admin-user-reminders', userId],
    queryFn: () => adminApi.getUserReminders(userId),
    enabled: !!userId,
  });

  const pending = reminders?.filter(r => !r.is_done) ?? [];
  const done = reminders?.filter(r => r.is_done) ?? [];
  const overdue = pending.filter(r => new Date(r.remind_at) < new Date());

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Reminders"
        description={pending.length ? `${pending.length} pending${overdue.length ? `, ${overdue.length} overdue` : ''}` : 'All caught up!'}
      />

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !reminders?.length ? (
        <EmptyState icon={<Bell size={28} />} title="No reminders" description="This user has no reminders set" />
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Clock size={12} /> Overdue ({overdue.length})</h3>
              <div className="space-y-2">{overdue.map(r => <ReminderRow key={r.id} reminder={r} overdue />)}</div>
            </div>
          )}
          {pending.filter(r => new Date(r.remind_at) >= new Date()).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="space-y-2">{pending.filter(r => new Date(r.remind_at) >= new Date()).map(r => <ReminderRow key={r.id} reminder={r} />)}</div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Completed ({done.length})</h3>
              <div className="space-y-2 opacity-60">{done.map(r => <ReminderRow key={r.id} reminder={r} done />)}</div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function ReminderRow({ reminder, overdue, done }: { reminder: Reminder; overdue?: boolean; done?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${overdue ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)] bg-[var(--card)]'}`}>
      <CheckCircle size={16} className={`mt-0.5 shrink-0 ${done ? 'text-emerald-400' : overdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text)]'}`}>{reminder.title}</p>
        {reminder.company && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{reminder.company} — {reminder.role}</p>}
        <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
          <Clock size={10} />{formatDateTime(reminder.remind_at)}
        </p>
      </div>
    </div>
  );
}
