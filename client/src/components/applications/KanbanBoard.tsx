'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, ExternalLink, Calendar } from 'lucide-react';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { STATUS_CONFIG, PRIORITY_CONFIG, APPLICATION_STATUSES } from '@/constants';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { ActionMenu } from '@/components/ui/Tooltip';
import { ApplicationForm } from './ApplicationForm';
import { getErrorMessage, timeAgo } from '@/utils';
import type { Application, ApplicationStatus } from '@/types/api.types';

interface Props {
  applications: Application[];
  onViewDetail: (id: number) => void;
}

function KanbanCard({ app, onEdit, onDelete, onView }: {
  app: Application;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <div
      className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3.5 cursor-pointer hover:border-[var(--primary)]/40 transition-colors group"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate">{app.company}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{app.role}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            trigger={
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--input)] transition-all text-[var(--text-secondary)]">
                <MoreHorizontal size={14} />
              </button>
            }
            items={[
              { label: 'View details', onClick: onView },
              { label: 'Edit', onClick: onEdit },
              { label: 'Delete', onClick: onDelete, variant: 'danger' },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={app.priority} />
        {app.location && (
          <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--input)] px-1.5 py-0.5 rounded-md truncate max-w-[80px]">
            {app.location}
          </span>
        )}
        {app.job_url && (
          <a
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2.5 text-[10px] text-[var(--text-secondary)]">
        <Calendar size={10} />
        <span>{timeAgo(app.applied_date)}</span>
      </div>
    </div>
  );
}

export function KanbanBoard({ applications, onViewDetail }: Props) {
  const queryClient = useQueryClient();
  const [addStatus, setAddStatus] = useState<ApplicationStatus | null>(null);
  const [editApp, setEditApp] = useState<Application | null>(null);

  const { mutate: deleteApp } = useMutation({
    mutationFn: applicationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success('Application deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const columns = APPLICATION_STATUSES.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    apps: applications.filter((a) => a.status === status),
  }));

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
        {columns.map(({ status, config, apps }) => (
          <div key={status} className="flex-shrink-0 w-72 flex flex-col">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                <span className="text-xs font-semibold text-[var(--text)]">{config.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                  {apps.length}
                </span>
              </div>
              <button
                onClick={() => setAddStatus(status)}
                className="p-1 rounded-md hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                aria-label={`Add to ${config.label}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 flex-1">
              {apps.map((app) => (
                <KanbanCard
                  key={app.id}
                  app={app}
                  onView={() => onViewDetail(app.id)}
                  onEdit={() => setEditApp(app)}
                  onDelete={() => {
                    if (confirm(`Delete ${app.company} — ${app.role}?`)) deleteApp(app.id);
                  }}
                />
              ))}
              {apps.length === 0 && (
                <div
                  className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--primary)]/30 transition-colors"
                  onClick={() => setAddStatus(status)}
                >
                  <p className="text-xs text-[var(--text-secondary)]">Drop here or click to add</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ApplicationForm
        open={!!addStatus}
        onClose={() => setAddStatus(null)}
        defaultStatus={addStatus ?? undefined}
      />
      {editApp && (
        <ApplicationForm
          open
          onClose={() => setEditApp(null)}
          editApp={editApp}
        />
      )}
    </>
  );
}
