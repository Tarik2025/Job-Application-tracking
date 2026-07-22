'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, CheckCircle, Trash2, Plus, Clock, Filter } from 'lucide-react';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Card, EmptyState, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDateTime, getErrorMessage, timeAgo } from '@/utils';

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [showDone, setShowDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const { data: reminders, isLoading } = useQuery({
    queryKey: queryKeys.applications.reminders(showDone),
    queryFn: () => applicationsApi.listReminders(showDone),
    staleTime: STALE_TIMES.SHORT,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: applicationsApi.markReminderDone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.reminders() }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteReminder } = useMutation({
    mutationFn: applicationsApi.deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.reminders() });
      toast.success('Reminder deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: addReminder, isPending: adding } = useMutation({
    mutationFn: () => applicationsApi.createReminder({ title, remind_at: remindAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.reminders() });
      toast.success('Reminder set');
      setTitle('');
      setRemindAt('');
      setAddOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const pending = reminders?.filter((r) => !r.is_done) ?? [];
  const done = reminders?.filter((r) => r.is_done) ?? [];
  const overdue = pending.filter((r) => new Date(r.remind_at) < new Date());

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Reminders"
        description={pending.length ? `${pending.length} pending${overdue.length ? `, ${overdue.length} overdue` : ''}` : 'All caught up!'}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Filter size={14} />}
              onClick={() => setShowDone((v) => !v)}
            >
              {showDone ? 'Hide done' : 'Show done'}
            </Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add reminder
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !reminders?.length ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="No reminders"
          description="Add reminders to stay on top of follow-ups and deadlines"
          action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add reminder</Button>}
        />
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Overdue ({overdue.length})
              </h3>
              <div className="space-y-2">
                {overdue.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDone={() => markDone(r.id)} onDelete={() => deleteReminder(r.id)} overdue />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {pending.filter((r) => new Date(r.remind_at) >= new Date()).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Upcoming
              </h3>
              <div className="space-y-2">
                {pending.filter((r) => new Date(r.remind_at) >= new Date()).map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDone={() => markDone(r.id)} onDelete={() => deleteReminder(r.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {showDone && done.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Completed ({done.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {done.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDone={() => {}} onDelete={() => deleteReminder(r.id)} done />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Reminder">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Follow up with Google"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Remind at"
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button loading={adding} disabled={!title.trim() || !remindAt} onClick={() => addReminder()}>
              Set reminder
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

function ReminderRow({ reminder, onDone, onDelete, overdue, done }: {
  reminder: import('@/types/api.types').Reminder;
  onDone: () => void;
  onDelete: () => void;
  overdue?: boolean;
  done?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
      overdue ? 'border-red-500/30 bg-red-500/5' :
      done ? 'border-[var(--border)] bg-[var(--surface)]' :
      'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30'
    }`}>
      <button
        onClick={onDone}
        disabled={!!done}
        className={`mt-0.5 shrink-0 transition-colors ${done ? 'text-emerald-400 cursor-default' : overdue ? 'text-red-400 hover:text-emerald-400' : 'text-[var(--text-secondary)] hover:text-emerald-400'}`}
      >
        <CheckCircle size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text)]'}`}>
          {reminder.title}
        </p>
        {reminder.company && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{reminder.company} — {reminder.role}</p>
        )}
        <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
          <Clock size={10} />
          {formatDateTime(reminder.remind_at)}
          {overdue && <span className="font-medium">· {timeAgo(reminder.remind_at)}</span>}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-red-400 transition-colors shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
