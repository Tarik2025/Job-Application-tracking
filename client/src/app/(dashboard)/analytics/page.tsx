'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { TrendingUp, Target, Clock, Award } from 'lucide-react';
import { analyticsApi } from '@/services/api/analytics.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES, STATUS_CONFIG } from '@/constants';
import { Card, StatCard, Skeleton } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: analyticsApi.dashboard,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { data: companies } = useQuery({
    queryKey: queryKeys.analytics.companies(),
    queryFn: analyticsApi.companies,
    staleTime: STALE_TIMES.MEDIUM,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </PageContainer>
    );
  }

  if (!data) return null;

  const statusData = data.statusBreakdown.map((s) => ({
    name: STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG]?.label ?? s.status,
    value: s.count,
  }));

  const platformData = data.platformBreakdown
    .filter((p) => p.platform)
    .slice(0, 8)
    .map((p) => ({ name: p.platform, value: p.count }));

  const monthlyData = data.monthlyApps.map((m) => ({
    month: m.month,
    applications: m.count,
  }));

  return (
    <PageContainer maxWidth="full">
      <PageHeader title="Analytics" description="Track your job search performance" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Applications"
          value={data.total}
          icon={<Target size={18} />}
        />
        <StatCard
          label="Response Rate"
          value={`${data.responseRate.toFixed(1)}%`}
          icon={<TrendingUp size={18} />}
          trend={data.responseRate > 20 ? { value: 1 } : { value: -1 }}
        />
        <StatCard
          label="Interview Rate"
          value={`${data.interviewRate.toFixed(1)}%`}
          icon={<Award size={18} />}
        />
        <StatCard
          label="Avg Response"
          value={data.avgResponseDays ? `${data.avgResponseDays}d` : '—'}
          icon={<Clock size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly applications */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Applications Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'var(--input)' }}
              />
              <Bar dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status breakdown */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Status Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
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

        {/* Platform breakdown */}
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Top Platforms</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platformData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'var(--input)' }}
              />
              <Bar dataKey="value" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Company performance */}
        {companies && companies.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Company Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Company', 'Apps', 'Interviews', 'Offers', 'Response %'].map((h) => (
                      <th key={h} className="text-left py-2 pr-4 text-[var(--text-secondary)] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {companies.slice(0, 8).map((c) => (
                    <tr key={c.company}>
                      <td className="py-2 pr-4 font-medium text-[var(--text)]">{c.company}</td>
                      <td className="py-2 pr-4 text-[var(--text-secondary)]">{c.total}</td>
                      <td className="py-2 pr-4 text-[var(--text-secondary)]">{c.positive}</td>
                      <td className="py-2 pr-4 text-emerald-400">{c.offers}</td>
                      <td className="py-2 pr-4">
                        <span className={`font-medium ${c.response_rate > 30 ? 'text-emerald-400' : c.response_rate > 10 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                          {c.response_rate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Insights */}
      {data.insights && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Insights</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {data.insights.topPlatform && (
              <div>
                <p className="text-[var(--text-secondary)] text-xs">Best platform</p>
                <p className="font-medium text-[var(--text)] mt-0.5">{data.insights.topPlatform}</p>
              </div>
            )}
            {data.insights.bestDay && (
              <div>
                <p className="text-[var(--text-secondary)] text-xs">Best day to apply</p>
                <p className="font-medium text-[var(--text)] mt-0.5">{data.insights.bestDay}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--text-secondary)] text-xs">Avg response time</p>
              <p className="font-medium text-[var(--text)] mt-0.5">{data.insights.avgResponseDays} days</p>
            </div>
            <div>
              <p className="text-[var(--text-secondary)] text-xs">Offer rate</p>
              <p className="font-medium text-emerald-400 mt-0.5">{data.offerRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
