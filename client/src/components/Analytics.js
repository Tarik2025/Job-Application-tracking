'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn } from '@/components/ui';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [salary, setSalary] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.getAnalytics().then(setData).catch(() => {});
    api.getCompanyAnalytics().then(setCompanies).catch(() => {});
    api.getSalaryInsights().then(setSalary).catch(() => {});
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">📊 Analytics</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your job search performance insights</p>
      </div>

      <div className="flex gap-2">
        {[{ id: 'overview', l: '📊 Overview' }, { id: 'companies', l: '🏢 Companies' }, { id: 'salary', l: '💰 Salary' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn text-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: data.total, color: 'var(--primary)', icon: '📊' },
              { label: 'Response Rate', value: `${data.responseRate}%`, color: 'var(--success)', icon: '💬' },
              { label: 'Interview Rate', value: `${data.interviewRate}%`, color: '#8b5cf6', icon: '🎯' },
              { label: 'Offer Rate', value: `${data.offerRate}%`, color: 'var(--warning)', icon: '🏆' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
                  <span className="text-lg block mb-1">{s.icon}</span>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Response time */}
          {data.avgResponseDays && (
            <FadeIn delay={0.15}>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-2">⏱️ Response Time</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-lg font-bold text-[var(--primary)]">{data.avgResponseDays} days</p><p className="text-[10px] text-[var(--text-secondary)]">Average</p></div>
                  <div><p className="text-lg font-bold text-[var(--success)]">{data.fastestResponse} days</p><p className="text-[10px] text-[var(--text-secondary)]">Fastest</p></div>
                </div>
              </div>
            </FadeIn>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status */}
            <FadeIn delay={0.2}>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-3">Status Breakdown</h3>
                <div className="space-y-2.5">
                  {data.statusBreakdown.map((s, i) => {
                    const pct = data.total > 0 ? (s.count / data.total) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs w-20 capitalize text-[var(--text-secondary)]">{s.status?.replace('_', ' ')}</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} className="h-full rounded-full bg-[var(--primary)]" />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeIn>

            {/* Platform */}
            <FadeIn delay={0.25}>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-3">Platform Performance</h3>
                {data.platformBreakdown.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.platformBreakdown.map((p, i) => {
                      const pct = data.total > 0 ? (p.count / data.total) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs w-20 text-[var(--text-secondary)]">{p.platform}</span>
                          <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} className="h-full rounded-full bg-[var(--accent)]" />
                          </div>
                          <span className="text-xs font-medium w-6 text-right">{p.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-[var(--text-secondary)]">No platform data</p>}
              </div>
            </FadeIn>

            {/* Priority */}
            {data.priorityBreakdown?.length > 0 && (
              <FadeIn delay={0.3}>
                <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <h3 className="text-sm font-semibold mb-3">Priority Distribution</h3>
                  <div className="flex gap-3">
                    {data.priorityBreakdown.map((p, i) => (
                      <div key={i} className="flex-1 text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                        <p className="text-lg font-bold">{p.count}</p>
                        <p className="text-[10px] capitalize text-[var(--text-secondary)]">{p.priority}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Work Mode */}
            {data.workModeBreakdown?.length > 0 && (
              <FadeIn delay={0.35}>
                <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <h3 className="text-sm font-semibold mb-3">Work Mode</h3>
                  <div className="flex gap-3">
                    {data.workModeBreakdown.map((w, i) => (
                      <div key={i} className="flex-1 text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                        <p className="text-lg font-bold">{w.count}</p>
                        <p className="text-[10px] capitalize text-[var(--text-secondary)]">{w.work_mode}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>

          {/* Monthly */}
          <FadeIn delay={0.4}>
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <h3 className="text-sm font-semibold mb-4">Monthly Applications</h3>
              <div className="flex items-end gap-2 h-32 px-2">
                {[...data.monthlyApps].reverse().map((m, i) => {
                  const max = Math.max(...data.monthlyApps.map(x => x.count), 1);
                  const height = (m.count / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium">{m.count}</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full rounded-t-md bg-gradient-to-t from-[var(--primary)] to-[var(--primary-light)] min-h-[2px]" />
                      <span className="text-[9px] text-[var(--text-secondary)]">{m.month?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* Insights */}
          {data.insights?.length > 0 && (
            <FadeIn delay={0.45}>
              <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                <h3 className="text-sm font-semibold text-[var(--primary)] mb-2">💡 Insights</h3>
                <ul className="space-y-1">
                  {data.insights.map((insight, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2"><span>•</span>{insight}</li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          )}
        </>
      )}

      {tab === 'companies' && (
        <FadeIn>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3">Company Performance</h3>
            {companies.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">No data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Positive</th>
                      <th className="pb-2 font-medium">Rejected</th>
                      <th className="pb-2 font-medium">Offers</th>
                      <th className="pb-2 font-medium">Resp. Rate</th>
                      <th className="pb-2 font-medium">Avg Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c, i) => (
                      <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-2 font-medium">{c.company}</td>
                        <td className="py-2">{c.total}</td>
                        <td className="py-2 text-[var(--success)]">{c.positive}</td>
                        <td className="py-2 text-[var(--danger)]">{c.rejected}</td>
                        <td className="py-2 text-[var(--warning)]">{c.offers}</td>
                        <td className="py-2">{c.response_rate}%</td>
                        <td className="py-2">{c.avg_days || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {tab === 'salary' && salary && (
        <FadeIn>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-3">Expected Salary</h3>
                {salary.expected.count > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-bold text-[var(--success)]">{salary.expected.min}</p><p className="text-[10px] text-[var(--text-secondary)]">Min</p></div>
                    <div><p className="text-sm font-bold text-[var(--primary)]">{salary.expected.avg}</p><p className="text-[10px] text-[var(--text-secondary)]">Avg</p></div>
                    <div><p className="text-sm font-bold text-[var(--warning)]">{salary.expected.max}</p><p className="text-[10px] text-[var(--text-secondary)]">Max</p></div>
                  </div>
                ) : <p className="text-sm text-[var(--text-secondary)]">No data</p>}
              </div>

              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-3">Offered Salary</h3>
                {salary.offered.count > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-bold text-[var(--success)]">{salary.offered.min}</p><p className="text-[10px] text-[var(--text-secondary)]">Min</p></div>
                    <div><p className="text-sm font-bold text-[var(--primary)]">{salary.offered.avg}</p><p className="text-[10px] text-[var(--text-secondary)]">Avg</p></div>
                    <div><p className="text-sm font-bold text-[var(--warning)]">{salary.offered.max}</p><p className="text-[10px] text-[var(--text-secondary)]">Max</p></div>
                  </div>
                ) : <p className="text-sm text-[var(--text-secondary)]">No offers with salary yet</p>}
              </div>
            </div>

            {salary.offers?.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold mb-3">🏆 Offers</h3>
                <div className="space-y-1.5">
                  {salary.offers.map((o, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-secondary)]">
                      <div>
                        <p className="text-sm font-medium">{o.company}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{o.role}</p>
                      </div>
                      <span className="text-sm font-bold text-[var(--success)]">{o.salary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
