'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit2, Trash2, ExternalLink, Brain, Mail,
  Clock, Plus, CheckCircle, Bell, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { STATUS_CONFIG, PRIORITY_CONFIG, ROUTES, STALE_TIMES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Card, Skeleton } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/FormElements';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApplicationForm } from '@/components/applications/ApplicationForm';
import { formatDate, formatDateTime, getErrorMessage } from '@/utils';

export default function ApplicationDetailPage() {
  const params = useParams();
  const appId = Number(params?.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [showAI, setShowAI] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: queryKeys.applications.detail(appId),
    queryFn: () => applicationsApi.get(appId),
    staleTime: STALE_TIMES.SHORT,
  });

  const { data: prediction, isFetching: predicting } = useQuery({
    queryKey: queryKeys.applications.predict(appId),
    queryFn: () => applicationsApi.predict(appId),
    enabled: showAI,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { mutate: deleteApp, isPending: deleting } = useMutation({
    mutationFn: () => applicationsApi.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success('Application deleted');
      router.push(ROUTES.APPLICATIONS);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: addNote, isPending: addingNote } = useMutation({
    mutationFn: () => applicationsApi.addNote(appId, noteText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(appId) });
      toast.success('Note added');
      setNoteText('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: addReminder, isPending: addingReminder } = useMutation({
    mutationFn: () => applicationsApi.createReminder({ application_id: appId, title: reminderTitle, remind_at: reminderDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(appId) });
      toast.success('Reminder set');
      setReminderTitle('');
      setReminderDate('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: doneReminder } = useMutation({
    mutationFn: applicationsApi.markReminderDone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(appId) }),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!app) return null;

  const statusCfg = STATUS_CONFIG[app.status];
  const priorityCfg = PRIORITY_CONFIG[app.priority];

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(ROUTES.APPLICATIONS)}
            className="mt-1 p-1.5 rounded-lg hover:bg-[var(--input)] text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">{app.company}</h1>
            <p className="text-[var(--text-secondary)] mt-0.5">{app.role}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={app.status} />
              <PriorityBadge priority={app.priority} />
              {app.work_mode && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--input)] text-[var(--text-secondary)] border border-[var(--border)]">
                  {app.work_mode}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Brain size={14} />}
            onClick={() => setShowAI(true)}
            loading={predicting}
          >
            AI Predict
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Edit2 size={14} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            loading={deleting}
            onClick={() => { if (confirm('Delete this application?')) deleteApp(); }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="col-span-2 space-y-5">
          {/* AI Prediction */}
          {prediction && (
            <Card className="border-[var(--primary)]/30 bg-[var(--primary)]/5">
              <div className="flex items-start gap-3">
                <Brain size={18} className="text-[var(--primary)] mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--text)]">AI Prediction</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      prediction.prediction === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                      prediction.prediction === 'cold' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {prediction.prediction.replace('_', ' ')} · {Math.round(prediction.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{prediction.reasoning}</p>
                  <p className="text-xs text-[var(--primary)] mt-1.5 font-medium">{prediction.suggested_action}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Details */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ['Platform', app.platform],
                ['Location', app.location],
                ['Applied', formatDate(app.applied_date)],
                ['Last updated', formatDate(app.last_updated)],
                ['Expected salary', app.salary_expected],
                ['Offered salary', app.salary_offered],
                ['Contact', app.contact_person],
                ['Contact email', app.contact_email],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <span className="text-[var(--text-secondary)] text-xs">{label}</span>
                    <p className="text-[var(--text)] mt-0.5">{value}</p>
                  </div>
                ) : null
              )}
              {app.job_url && (
                <div>
                  <span className="text-[var(--text-secondary)] text-xs">Job URL</span>
                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--primary)] hover:underline mt-0.5 text-sm"
                  >
                    Open link <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
            {app.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--text-secondary)] text-xs">Notes</span>
                <p className="text-sm text-[var(--text)] mt-1 whitespace-pre-wrap">{app.notes}</p>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Notes</h3>
            <div className="space-y-3 mb-4">
              {app.notesList?.map((note) => (
                <div key={note.id} className="text-sm bg-[var(--input)] rounded-lg p-3">
                  <p className="text-[var(--text)]">{note.content}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">{formatDateTime(note.created_at)}</p>
                </div>
              ))}
              {!app.notesList?.length && (
                <p className="text-xs text-[var(--text-secondary)]">No notes yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                size="sm"
                leftIcon={<Plus size={14} />}
                loading={addingNote}
                disabled={!noteText.trim()}
                onClick={() => addNote()}
                className="self-end"
              >
                Add
              </Button>
            </div>
          </Card>

          {/* Status history */}
          {app.history?.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Status History</h3>
              <div className="space-y-2">
                {app.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <ChevronRight size={12} className="shrink-0" />
                    {h.from_status && (
                      <>
                        <span className={STATUS_CONFIG[h.from_status as keyof typeof STATUS_CONFIG]?.color ?? ''}>{h.from_status}</span>
                        <span>→</span>
                      </>
                    )}
                    <span className={STATUS_CONFIG[h.to_status as keyof typeof STATUS_CONFIG]?.color ?? 'text-[var(--text)]'}>{h.to_status}</span>
                    <span className="ml-auto">{formatDate(h.created_at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right — reminders */}
        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Bell size={14} /> Reminders
            </h3>
            <div className="space-y-2 mb-4">
              {app.reminders?.map((r) => (
                <div key={r.id} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${r.is_done ? 'opacity-50 border-[var(--border)]' : 'border-amber-500/20 bg-amber-500/5'}`}>
                  <button
                    onClick={() => !r.is_done && doneReminder(r.id)}
                    className={`mt-0.5 shrink-0 ${r.is_done ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-emerald-400'} transition-colors`}
                  >
                    <CheckCircle size={13} />
                  </button>
                  <div className="min-w-0">
                    <p className={`font-medium ${r.is_done ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text)]'}`}>{r.title}</p>
                    <p className="text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {formatDateTime(r.remind_at)}
                    </p>
                  </div>
                </div>
              ))}
              {!app.reminders?.length && (
                <p className="text-xs text-[var(--text-secondary)]">No reminders</p>
              )}
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Reminder title"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
              <Button
                size="sm"
                fullWidth
                leftIcon={<Plus size={14} />}
                loading={addingReminder}
                disabled={!reminderTitle.trim() || !reminderDate}
                onClick={() => addReminder()}
              >
                Set reminder
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ApplicationForm open={editOpen} onClose={() => setEditOpen(false)} editApp={app as import('@/types/api.types').Application} />
    </PageContainer>
  );
}
