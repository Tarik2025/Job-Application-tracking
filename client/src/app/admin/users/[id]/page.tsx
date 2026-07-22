'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, ShieldCheck, LogOut, User, Briefcase, FileText, Activity,
  Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Save, X, ExternalLink,
} from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import type { AdminUser, Application, PaginatedResponse, AuditEntry } from '@/types/api.types';
import { ROUTES, APPLICATION_STATUSES, STATUS_CONFIG } from '@/constants';
import { Input, Select } from '@/components/ui/FormElements';
import { Button } from '@/components/ui/Button';

type Tab = 'profile' | 'applications' | 'resumes' | 'activity';

type Resume = { id: number; filename: string; skills?: string; uploaded_at: string };
type AdminApp = Application & { user_name: string; user_email: string };

const NAV = [
  { label: 'Dashboard', href: ROUTES.ADMIN },
  { label: 'Users', href: ROUTES.ADMIN_USERS },
  { label: 'Applications', href: ROUTES.ADMIN_APPLICATIONS },
  { label: 'Audit Log', href: ROUTES.ADMIN_AUDIT },
];

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
  { id: 'applications', label: 'Applications', icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 'resumes', label: 'Resumes', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-3.5 h-3.5" /> },
];

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, userId, onSaved }: { user: AdminUser; userId: number; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<AdminUser>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setForm({
      name: user.name, email: user.email, phone: user.phone ?? '',
      user_type: user.user_type, preferred_role: user.preferred_role ?? '',
      city: user.city ?? '', state: user.state ?? '', country: user.country ?? '',
      college: user.college ?? '', company: user.company ?? '',
      designation: user.designation ?? '', skills: user.skills ?? '',
      linkedin: user.linkedin ?? '', github: user.github ?? '', portfolio: user.portfolio ?? '',
    });
  }, [user]);

  const set = (k: keyof AdminUser, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true); setMsg('');
    try {
      await adminApi.updateUser(userId, form);
      setMsg('Saved');
      onSaved();
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  }

  const field = (label: string, key: keyof AdminUser, type = 'text') => (
    <Input
      label={label}
      type={type}
      value={(form[key] as string) ?? ''}
      onChange={e => set(key, e.target.value)}
    />
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Profile Information</h2>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs ${msg === 'Saved' ? 'text-emerald-400' : 'text-[var(--danger)]'}`}>{msg}</span>}
          <Button size="sm" loading={saving} onClick={save} leftIcon={<Save className="w-3.5 h-3.5" />}>Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field('Full name', 'name')}
        {field('Email', 'email', 'email')}
        {field('Phone', 'phone')}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">User type</label>
          <select
            value={(form.user_type as string) ?? ''}
            onChange={e => set('user_type', e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            <option value="">—</option>
            <option value="student">Student</option>
            <option value="professional">Professional</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {field('City', 'city')}
        {field('State', 'state')}
        {field('Country', 'country')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field('College', 'college')}
        {field('Company', 'company')}
        {field('Designation', 'designation')}
        {field('Preferred role', 'preferred_role')}
      </div>

      {field('Skills (comma separated)', 'skills')}

      <div className="grid grid-cols-3 gap-4">
        {field('LinkedIn', 'linkedin')}
        {field('GitHub', 'github')}
        {field('Portfolio', 'portfolio')}
      </div>

      <div className="pt-2 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-secondary)]">
          Account status: <span className={user.is_active ? 'text-emerald-400' : 'text-[var(--danger)]'}>{user.is_active ? 'Active' : 'Inactive'}</span>
          {' · '} Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          {' · '} Applications: {user.app_count}
        </p>
      </div>
    </div>
  );
}

// ─── Applications Tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ userId }: { userId: number }) {
  const [data, setData] = useState<PaginatedResponse<AdminApp> | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listApplications({ user_id: userId, page, limit: 15, status: status || undefined })
      .then(d => setData(d as PaginatedResponse<AdminApp>))
      .finally(() => setLoading(false));
  }, [userId, page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function saveStatus(id: number) {
    await adminApi.updateApplication(id, { status: editStatus as Application['status'] });
    setEditId(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this application?')) return;
    setDeletingId(id);
    try { await adminApi.deleteApplication(id); load(); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)]"
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {data && <span className="text-sm text-[var(--text-secondary)]">{data.pagination.total} total</span>}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
              <th className="text-left px-4 py-3 font-medium">Company</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Applied</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--input)] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-secondary)]">No applications</td></tr>
            ) : (
              data?.data.map(app => {
                const cfg = STATUS_CONFIG[app.status];
                return (
                  <tr key={app.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--input)]/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{app.company}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{app.role}</td>
                    <td className="px-4 py-3">
                      {editId === app.id ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                            className="h-7 px-2 text-xs rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none"
                          >
                            {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                          </select>
                          <button onClick={() => saveStatus(app.id)} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-[var(--input)] text-[var(--text-secondary)]"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditId(app.id); setEditStatus(app.status); }}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(app.applied_date).toLocaleDateString()}</td>
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
    </div>
  );
}

// ─── Resumes Tab ──────────────────────────────────────────────────────────────

function ResumesTab({ userId }: { userId: number }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getUserResumes(userId).then(setResumes).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this resume?')) return;
    setDeletingId(id);
    try { await adminApi.deleteUserResume(userId, id); load(); }
    finally { setDeletingId(null); }
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>;
  if (!resumes.length) return <p className="text-sm text-[var(--text-secondary)] py-8 text-center">No resumes uploaded</p>;

  return (
    <div className="space-y-3">
      {resumes.map(r => (
        <div key={r.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{r.filename}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{new Date(r.uploaded_at).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => handleDelete(r.id)}
            disabled={deletingId === r.id}
            className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ userId }: { userId: number }) {
  const [data, setData] = useState<PaginatedResponse<AuditEntry> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getUserActivity(userId, { page, limit: 20 }).then(setData).finally(() => setLoading(false));
  }, [userId, page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />)}</div>;
  if (!data?.data.length) return <p className="text-sm text-[var(--text-secondary)] py-8 text-center">No activity yet</p>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border)]" />
        <div className="space-y-1">
          {data.data.map(entry => (
            <div key={entry.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 z-10 border-2 border-[var(--bg)] text-xs font-bold">
                {(entry.action?.[0] ?? 'A').toUpperCase()}
              </div>
              <div className="flex-1 pb-4 pt-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{(entry as unknown as { title?: string }).title ?? entry.action}</p>
                    {(entry as unknown as { description?: string }).description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{(entry as unknown as { description?: string }).description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>Page {data.pagination.page} of {data.pagination.total_pages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!data.pagination.has_prev} onClick={() => setPage(p => p - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage(p => p + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params?.id);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [actionId, setActionId] = useState<number | null>(null);

  const loadUser = useCallback(() => {
    adminApi.getUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleToggle() {
    if (!user) return;
    setActionId(userId);
    try {
      const res = await adminApi.toggleUser(userId);
      setUser(u => u ? { ...u, is_active: res.is_active } : u);
    } finally { setActionId(null); }
  }

  async function handleDelete() {
    if (!user || !confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    await adminApi.deleteUser(userId);
    router.replace(ROUTES.ADMIN_USERS);
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Back + user header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(ROUTES.ADMIN_USERS)} className="p-1.5 rounded-lg hover:bg-[var(--input)] text-[var(--text-secondary)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {loading ? (
              <div className="h-6 w-48 bg-[var(--input)] rounded animate-pulse" />
            ) : user ? (
              <div>
                <h1 className="text-lg font-semibold text-[var(--text)]">{user.name}</h1>
                <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
              </div>
            ) : null}
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/admin/users/${userId}/view/dashboard`)}
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                View as user
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={actionId === userId}
                onClick={handleToggle}
                leftIcon={user.is_active ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
              >
                {user.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                Delete user
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--input)] border border-[var(--border)] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" />
        ) : user ? (
          <>
            {tab === 'profile' && <ProfileTab user={user} userId={userId} onSaved={loadUser} />}
            {tab === 'applications' && <ApplicationsTab userId={userId} />}
            {tab === 'resumes' && <ResumesTab userId={userId} />}
            {tab === 'activity' && <ActivityTab userId={userId} />}
          </>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">User not found</p>
        )}
      </main>
    </div>
  );
}
