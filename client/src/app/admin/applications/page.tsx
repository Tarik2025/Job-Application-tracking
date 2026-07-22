'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, ShieldCheck, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import type { Application, PaginatedResponse } from '@/types/api.types';
import { ROUTES, APPLICATION_STATUSES, STATUS_CONFIG } from '@/constants';
import { Input } from '@/components/ui/FormElements';
import { Button } from '@/components/ui/Button';

type AdminApp = Application & { user_name: string; user_email: string };

const NAV = [
  { label: 'Dashboard', href: ROUTES.ADMIN },
  { label: 'Users', href: ROUTES.ADMIN_USERS },
  { label: 'Applications', href: ROUTES.ADMIN_APPLICATIONS },
  { label: 'Audit Log', href: ROUTES.ADMIN_AUDIT },
];

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<AdminApp> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listApplications({ page, limit: 20, search: search || undefined, status: status || undefined })
      .then(d => setData(d as PaginatedResponse<AdminApp>))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    setDeletingId(id);
    try { await adminApi.deleteApplication(id); load(); }
    finally { setDeletingId(null); }
  }

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
          <h1 className="text-lg font-semibold text-[var(--text)]">Applications</h1>
          {data && <span className="text-sm text-[var(--text-secondary)]">{data.pagination.total} total</span>}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Search company, role, user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
            containerClassName="max-w-xs"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--input)] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">No applications found</td></tr>
              ) : (
                data?.data.map(app => {
                  const cfg = STATUS_CONFIG[app.status];
                  return (
                    <tr key={app.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--input)]/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text)]">{app.company}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{app.role}</td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--text)]">{app.user_name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{app.user_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {new Date(app.applied_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(app.id)}
                          disabled={deletingId === app.id}
                          className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
