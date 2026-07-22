'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { TrendingUp, Target, Award } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { STATUS_CONFIG, STALE_TIMES } from '@/constants';
import { Card, StatCard, Skeleton } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function AdminUserAnalyticsPage() {
  const { userId } = useAdminUser();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-analytics', userId],
    queryFn: () => adminApi.getUserAnalytics(userId),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!userId,
  });

  if (isLoading) return (
    <PageContainer>
      <PageHeader title="Analytics" />
      <div className="grid grid-cols-4 gap-4 mb-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid grid-cols-2 gap-6">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </PageContainer>
  );

  if (!data) return null;

  const statusData = data.statusBreakdown.map(s => ({
    name: STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG]?.label ?? s.status,
    value: s.count,
  }));

  const monthlyData = data.monthlyApps.map(m => ({ month: m.month, applications: m.count }));

  return (
    <PageContainer maxWidth="full">
      <PageHeader title="Analytics" description="Job search performance" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Applications" value={data.total} icon={<Target size={18} />} />
        <StatCard label="Response Rate" value={`${data.responseRate}%`} icon={<TrendingUp size={18} />} />
        <StatCard label="Offer Rate" value={`${data.offerRate}%`} icon={<Award size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Applications Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--input)' }} />
              <Bar dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Status Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[var(--text-secondary)]">{s.name}</span>
                  </div>
                  <span className="font-medium text-[var(--text)]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
