'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FadeIn } from '@/components/ui';

const TYPE_ICONS = {
  interview_scheduled: '📅',
  blacklist: '🚫',
  goal: '🎯',
  document: '📄',
  default: '📋',
};

export default function ActivityFeed() {
  const [activity, setActivity] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => { load(); }, [page]);
  const load = () => api.getActivity(`page=${page}&limit=20`).then(setActivity).catch(() => {});

  const totalPages = Math.ceil(activity.total / 20);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">📜 Activity Feed</h2>

      <FadeIn>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          {activity.data?.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-1.5">
              {activity.data?.map((item, i) => (
                <div key={item.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                  <span className="text-sm mt-0.5">{TYPE_ICONS[item.type] || TYPE_ICONS.default}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.description}</p>}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1 rounded-md bg-[var(--input)] border border-[var(--border)] disabled:opacity-40 cursor-pointer">←</button>
              <span className="text-xs text-[var(--text-secondary)]">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1 rounded-md bg-[var(--input)] border border-[var(--border)] disabled:opacity-40 cursor-pointer">→</button>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
