'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Briefcase, Mail, FileText, Target, Star } from 'lucide-react';
import { advancedApi } from '@/services/api/advanced.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES } from '@/constants';
import { Skeleton, EmptyState, Pagination } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { timeAgo } from '@/utils';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  application: <Briefcase size={13} />,
  email: <Mail size={13} />,
  resume: <FileText size={13} />,
  goal: <Target size={13} />,
  interview: <Star size={13} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  application: 'bg-indigo-500/10 text-indigo-400',
  email: 'bg-blue-500/10 text-blue-400',
  resume: 'bg-amber-500/10 text-amber-400',
  goal: 'bg-emerald-500/10 text-emerald-400',
  interview: 'bg-purple-500/10 text-purple-400',
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.advanced.activity({ page, limit: 30 }),
    queryFn: () => advancedApi.activity({ page, limit: 30 }),
    staleTime: STALE_TIMES.SHORT,
  });

  const activities = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <PageContainer maxWidth="lg">
      <PageHeader title="Activity" description="Your recent actions across Career Copilot" />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !activities.length ? (
        <EmptyState
          icon={<Activity size={28} />}
          title="No activity yet"
          description="Your actions will appear here as you use Career Copilot"
        />
      ) : (
        <>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border)]" />

            <div className="space-y-1">
              {activities.map((entry, i) => {
                const entityType = entry.entity_type ?? 'application';
                const icon = ACTIVITY_ICONS[entityType] ?? <Activity size={13} />;
                const color = ACTIVITY_COLORS[entityType] ?? 'bg-gray-500/10 text-gray-400';

                return (
                  <div key={entry.id} className="flex gap-4 relative">
                    {/* Icon dot */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-[var(--bg)] ${color}`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-4 ${i < activities.length - 1 ? '' : ''}`}>
                      <div className="flex items-start justify-between gap-2 pt-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{entry.title}</p>
                          {entry.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                          {timeAgo(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={pagination.total_pages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
