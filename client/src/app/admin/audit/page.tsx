'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShieldCheck, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import type { AuditEntry, PaginatedResponse } from '@/types/api.types';
import { ROUTES } from '@/constants';
import { Input } from '@/components/ui/FormElements';
import { Button } from '@/components/ui/Button';

const NAV = [
  { label: 'Dashboard', href: ROUTES.ADMIN },
  { label: 'Users', href: ROUTES.ADMIN_USERS },
  { label: 'Applications', href: ROUTES.ADMIN_APPLICATIONS },
  { label: 'Audit Log', href: ROUTES.ADMIN_AUDIT },
];

export default function AdminAuditPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<AuditEntry> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.auditLog({ page, limit: 25, search: search || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  async function handleLogout() {
    await adminApi.logout().catch(() => {});
    router.replace(ROUTES.ADMIN_LOGIN);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-semibold text-[var(--text)]">Admin Panel</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ label, href }) => (
            <button key={href} onClick={() => router.push(href)}
              className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors">
              {label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="w-3.5 h-3.5" />}>Logout</Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text)]">Audit Log</h1>
          {data && <span className="text-sm text-[var(--text-secondary)]">{data.pagination.total} entries</span>}
        </div>

        <Input
          placeholder="Search action, details, user…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftElement={<Search className="w-4 h-4" />}
          containerClassName="max-w-sm"
        />

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">IP</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--input)] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-secondary)]">No entries found</td></tr>
              ) : (
                data?.data.map(entry => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--input)]/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">{entry.action}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {entry.entity}{entry.entity_id ? ` #${entry.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {entry.user_name ? (
                        <>
                          <p className="text-[var(--text)]">{entry.user_name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{entry.user_email}</p>
                        </>
                      ) : (
                        <span className="text-[var(--text-secondary)]">Admin</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] font-mono">{entry.ip ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>Page {data.pagination.page} of {data.pagination.total_pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!data.pagination.has_prev} onClick={() => setPage(p => p - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
              <Button variant="secondary" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage(p => p + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
