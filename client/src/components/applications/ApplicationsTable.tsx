'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, ExternalLink, Trash2, Edit2, Eye } from 'lucide-react';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { STATUS_CONFIG } from '@/constants';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/Tooltip';
import { ApplicationForm } from './ApplicationForm';
import { formatDate, getErrorMessage } from '@/utils';
import type { Application, ApplicationStatus } from '@/types/api.types';

interface Props {
  applications: Application[];
  onViewDetail: (id: number) => void;
}

export function ApplicationsTable({ applications, onViewDetail }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editApp, setEditApp] = useState<Application | null>(null);

  const { mutate: deleteApp } = useMutation({
    mutationFn: applicationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success('Deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: bulkDelete, isPending: bulkDeleting } = useMutation({
    mutationFn: () => applicationsApi.bulkDelete({ ids: [...selected] }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success(`Deleted ${data.deleted} applications`);
      setSelected(new Set());
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggleAll = () => {
    if (selected.size === applications.length) setSelected(new Set());
    else setSelected(new Set(applications.map((a) => a.id)));
  };

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="text-xs text-[var(--text-secondary)]">{selected.size} selected</span>
          <Button
            size="xs"
            variant="danger"
            leftIcon={<Trash2 size={12} />}
            loading={bulkDeleting}
            onClick={() => {
              if (confirm(`Delete ${selected.size} applications?`)) bulkDelete();
            }}
          >
            Delete selected
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === applications.length && applications.length > 0}
                  onChange={toggleAll}
                  className="accent-[var(--primary)] cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Platform</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Applied</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {applications.map((app) => (
              <tr
                key={app.id}
                className="hover:bg-[var(--surface)] transition-colors cursor-pointer"
                onClick={() => onViewDetail(app.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(app.id)}
                    onChange={() => toggle(app.id)}
                    className="accent-[var(--primary)] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text)]">{app.company}</span>
                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{app.role}</td>
                <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={app.priority} /></td>
                <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{app.platform ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{formatDate(app.applied_date)}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    trigger={
                      <button className="p-1.5 rounded-md hover:bg-[var(--input)] text-[var(--text-secondary)] transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    }
                    items={[
                      { label: 'View details', icon: <Eye size={13} />, onClick: () => onViewDetail(app.id) },
                      { label: 'Edit', icon: <Edit2 size={13} />, onClick: () => setEditApp(app) },
                      { label: 'Delete', icon: <Trash2 size={13} />, onClick: () => {
                        if (confirm(`Delete ${app.company}?`)) deleteApp(app.id);
                      }, variant: 'danger' },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {applications.length === 0 && (
          <div className="py-16 text-center text-[var(--text-secondary)] text-sm">
            No applications found
          </div>
        )}
      </div>

      {editApp && (
        <ApplicationForm open onClose={() => setEditApp(null)} editApp={editApp} />
      )}
    </>
  );
}
