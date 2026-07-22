'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Briefcase, Mail, FileText, LogOut, ShieldCheck } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import type { AdminStats } from '@/types/api.types';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/Button';

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await adminApi.logout().catch(() => {});
    router.replace(ROUTES.ADMIN_LOGIN);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-semibold text-[var(--text)]">Admin Panel</span>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { label: 'Dashboard', href: ROUTES.ADMIN },
            { label: 'Users', href: ROUTES.ADMIN_USERS },
            { label: 'Applications', href: ROUTES.ADMIN_APPLICATIONS },
            { label: 'Audit Log', href: ROUTES.ADMIN_AUDIT },
          ].map(({ label, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)] transition-colors"
            >
              {label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="w-3.5 h-3.5" />}>
            Logout
          </Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-lg font-semibold text-[var(--text)]">Overview</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.totalUsers} />
              <StatCard icon={<Users className="w-5 h-5" />} label="Active Users" value={stats.activeUsers} />
              <StatCard icon={<Briefcase className="w-5 h-5" />} label="Applications" value={stats.totalApps} />
              <StatCard icon={<Mail className="w-5 h-5" />} label="Emails" value={stats.totalEmails} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Status breakdown */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <h2 className="text-sm font-medium text-[var(--text)] mb-4">Application Status Breakdown</h2>
                <div className="space-y-2">
                  {stats.statusBreakdown.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)] capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-medium text-[var(--text)]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent signups */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <h2 className="text-sm font-medium text-[var(--text)] mb-4">Recent Signups</h2>
                <div className="space-y-3">
                  {stats.recentSignups.map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text)]">{user.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(user.created_at!).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
