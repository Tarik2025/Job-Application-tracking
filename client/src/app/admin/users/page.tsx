'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, ToggleLeft, ToggleRight, ShieldCheck, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import type { AdminUser, PaginatedResponse } from '@/types/api.types';
import { ROUTES } from '@/constants';
import { Input } from '@/components/ui/FormElements';
import { Button } from '@/components/ui/Button';

const NAV = [
  { label: 'Dashboard', href: ROUTES.ADMIN },
  { label: 'Users', href: ROUTES.ADMIN_USERS },
  { label: 'Applications', href: ROUTES.ADMIN_APPLICATIONS },
  { label: 'Audit Log', href: ROUTES.ADMIN_AUDIT },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listUsers({ page, limit: 20, search: search || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 on search change
  useEffect(() => { setPage(1); }, [search]);

  async function handleToggle(id: number) {
    setActionId(id);
    try {
      const res = await adminApi.toggleUser(id);
      setData(prev => prev ? {
        ...prev,
        data: prev.data.map(u => u.id === id ? { ...u, is_active: res.is_active } : u),
      } : prev);
    } finally { setActionId(null); }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await adminApi.deleteUser(id);
      load();
    } finally { setActionId(null); }
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
          <h1 className="text-lg font-semibold text-[var(--text)]">Users</h1>
          {data && <span className="text-sm text-[var(--text-secondary)]">{data.pagination.total} total</span>}
        </div>

        <Input
          placeholder="Search by name, email, college, company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftElement={<Search className="w-4 h-4" />}
          containerClassName="max-w-sm"
        />

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Apps</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[var(--input)] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">No users found</td></tr>
              ) : (
                data?.data.map(user => (
                  <tr key={user.id} onClick={() => router.push(`${ROUTES.ADMIN_USERS}/${user.id}`)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--input)]/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{user.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{user.user_type ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.app_count}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={e => { e.stopPropagation(); handleToggle(user.id); }}
                          disabled={actionId === user.id}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
                        >
                          {user.is_active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(user.id, user.name); }}
                          disabled={actionId === user.id}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
