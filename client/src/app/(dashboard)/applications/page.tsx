'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List, Search, Filter, Download } from 'lucide-react';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { APPLICATION_STATUSES, STATUS_CONFIG, ROUTES, STALE_TIMES, LIMITS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Pagination } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { ApplicationsTable } from '@/components/applications/ApplicationsTable';
import { ApplicationForm } from '@/components/applications/ApplicationForm';
import { useDebounce } from '@/hooks';
import type { ApplicationsQuery } from '@/types/api.types';

type ViewMode = 'kanban' | 'table';

export default function ApplicationsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('kanban');
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<ApplicationsQuery>({ page: 1, limit: LIMITS.PAGINATION_DEFAULT });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, LIMITS.SEARCH_DEBOUNCE_MS);

  const queryParams: ApplicationsQuery = {
    ...filters,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.applications.list(queryParams as Record<string, unknown>),
    queryFn: () => applicationsApi.list(queryParams),
    staleTime: STALE_TIMES.SHORT,
  });

  const applications = data?.data ?? [];
  const pagination = data?.pagination;

  const setFilter = (key: keyof ApplicationsQuery, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Applications"
        description={pagination ? `${pagination.total} total` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-[var(--input)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}
                aria-label="Kanban view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView('table')}
                className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}`}
                aria-label="Table view"
              >
                <List size={15} />
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={async () => {
                const blob = await applicationsApi.exportCsv();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'applications.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </Button>

            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add application
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search company or role…"
            leftElement={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          placeholder="All statuses"
          options={APPLICATION_STATUSES.map((s) => ({
            value: s,
            label: STATUS_CONFIG[s].label,
          }))}
          value={filters.status ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className="w-40"
        />

        <Select
          placeholder="All priorities"
          options={[
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
          value={filters.priority ?? ''}
          onChange={(e) => setFilter('priority', e.target.value)}
          className="w-36"
        />

        <Select
          placeholder="Work mode"
          options={[
            { value: 'remote', label: 'Remote' },
            { value: 'hybrid', label: 'Hybrid' },
            { value: 'onsite', label: 'Onsite' },
          ]}
          value={filters.work_mode ?? ''}
          onChange={(e) => setFilter('work_mode', e.target.value)}
          className="w-36"
        />

        {(filters.status || filters.priority || filters.work_mode || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({ page: 1, limit: LIMITS.PAGINATION_DEFAULT });
              setSearch('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-[var(--text-secondary)] text-sm">
          Loading applications…
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          applications={applications}
          onViewDetail={(id) => router.push(ROUTES.APPLICATION_DETAIL(id))}
        />
      ) : (
        <>
          <ApplicationsTable
            applications={applications}
            onViewDetail={(id) => router.push(ROUTES.APPLICATION_DETAIL(id))}
          />
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.total_pages}
                onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
              />
            </div>
          )}
        </>
      )}

      <ApplicationForm open={addOpen} onClose={() => setAddOpen(false)} />
    </PageContainer>
  );
}
