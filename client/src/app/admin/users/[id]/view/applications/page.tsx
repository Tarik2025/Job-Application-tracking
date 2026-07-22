'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List, Search, Download, Trash2, Save, X } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { APPLICATION_STATUSES, STATUS_CONFIG, STALE_TIMES, LIMITS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Pagination } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { ApplicationsTable } from '@/components/applications/ApplicationsTable';
import { useDebounce } from '@/hooks';
import type { Application, ApplicationsQuery } from '@/types/api.types';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'table';

export default function AdminUserApplicationsPage() {
  const { userId } = useAdminUser();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('kanban');
  const [filters, setFilters] = useState<ApplicationsQuery>({ page: 1, limit: LIMITS.PAGINATION_DEFAULT });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, LIMITS.SEARCH_DEBOUNCE_MS);

  const queryParams = { ...filters, search: debouncedSearch || undefined };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-applications', userId, queryParams],
    queryFn: () => adminApi.getUserApplications(userId, queryParams as Record<string, unknown>),
    staleTime: STALE_TIMES.SHORT,
    enabled: !!userId,
  });

  const { mutate: deleteApp } = useMutation({
    mutationFn: (id: number) => adminApi.deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-applications', userId] });
      toast.success('Application deleted');
    },
  });

  const { mutate: updateApp } = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Application> }) =>
      adminApi.updateApplication(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-applications', userId] });
      toast.success('Application updated');
    },
  });

  const applications = data?.data ?? [];
  const pagination = data?.pagination;

  const setFilter = (key: keyof ApplicationsQuery, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));

  return (
    <PageContainer>
      <PageHeader
        title="Applications"
        description={pagination ? `${pagination.total} total` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[var(--input)] border border-[var(--border)] rounded-lg p-0.5">
              <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-[var(--card)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}><LayoutGrid size={15} /></button>
              <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-[var(--card)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}><List size={15} /></button>
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Search company or role…" leftElement={<Search size={14} />} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select
          placeholder="All statuses"
          options={APPLICATION_STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))}
          value={filters.status ?? ''}
          onChange={e => setFilter('status', e.target.value)}
          className="w-40"
        />
        <Select
          placeholder="All priorities"
          options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
          value={filters.priority ?? ''}
          onChange={e => setFilter('priority', e.target.value)}
          className="w-36"
        />
        {(filters.status || filters.priority || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ page: 1, limit: LIMITS.PAGINATION_DEFAULT }); setSearch(''); }}>Clear filters</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-[var(--text-secondary)] text-sm">Loading…</div>
      ) : view === 'kanban' ? (
        <KanbanBoard applications={applications} onViewDetail={() => {}} />
      ) : (
        <>
          <ApplicationsTable applications={applications} onViewDetail={() => {}} />
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4">
              <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={p => setFilters(prev => ({ ...prev, page: p }))} />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
