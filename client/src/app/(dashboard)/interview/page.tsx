'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Brain, ChevronDown, ChevronUp, BookOpen, Calendar } from 'lucide-react';
import { interviewApi } from '@/services/api/interview.api';
import { applicationsApi } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Card, Skeleton, EmptyState } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDate, getErrorMessage } from '@/utils';
import type { InterviewPrepResult } from '@/types/api.types';

export default function InterviewPage() {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [appId, setAppId] = useState('');
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const { data: preps, isLoading } = useQuery({
    queryKey: queryKeys.interview.preps(),
    queryFn: interviewApi.listPreps,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { data: appsData } = useQuery({
    queryKey: queryKeys.applications.list({ limit: 100 }),
    queryFn: () => applicationsApi.list({ limit: 100 }),
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: () => interviewApi.generate({
      role: role || undefined,
      company: company || undefined,
      application_id: appId ? Number(appId) : undefined,
    }),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Interview prep generated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const appOptions = appsData?.data?.map((a) => ({
    value: String(a.id),
    label: `${a.company} — ${a.role}`,
  })) ?? [];

  return (
    <PageContainer maxWidth="full">
      <PageHeader title="Interview Prep" description="AI-powered interview preparation" />

      <div className="grid grid-cols-3 gap-6">
        {/* Generator */}
        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Brain size={14} className="text-[var(--primary)]" /> Generate Prep
            </h3>
            <div className="space-y-3">
              <Select
                label="From application (optional)"
                placeholder="Select application"
                options={appOptions}
                value={appId}
                onChange={(e) => {
                  setAppId(e.target.value);
                  const app = appsData?.data?.find((a) => String(a.id) === e.target.value);
                  if (app) { setRole(app.role); setCompany(app.company); }
                }}
              />
              <Input label="Role" placeholder="Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
              <Input label="Company" placeholder="Google" value={company} onChange={(e) => setCompany(e.target.value)} />
              <Button
                fullWidth
                leftIcon={<Brain size={14} />}
                loading={generating}
                disabled={!role && !appId}
                onClick={() => generate()}
              >
                Generate prep
              </Button>
              <p className="text-xs text-[var(--text-secondary)] text-center">Rate limited to 10/hour</p>
            </div>
          </Card>

          {/* History */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">History</h3>
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 mb-2" />)
            ) : !preps?.length ? (
              <EmptyState icon={<BookOpen size={20} />} title="No prep sessions yet" />
            ) : (
              <div className="space-y-2">
                {preps.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text)] capitalize">{p.difficulty}</span>
                      <span className="text-[var(--text-secondary)]">{formatDate(p.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="col-span-2 space-y-5">
          {generating && (
            <Card>
              <div className="flex items-center gap-3 py-8 justify-center">
                <Brain size={20} className="text-[var(--primary)] animate-pulse" />
                <p className="text-sm text-[var(--text-secondary)]">Generating your personalized prep…</p>
              </div>
            </Card>
          )}

          {result && !generating && (
            <>
              {/* Company insights */}
              {result.company_insights && (
                <Card>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Company Insights</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{result.company_insights}</p>
                </Card>
              )}

              {/* Questions */}
              <Card>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">
                  Interview Questions <span className="text-[var(--text-secondary)] font-normal">({result.questions.length})</span>
                </h3>
                <div className="space-y-2">
                  {result.questions.map((q, i) => (
                    <div key={i} className="border border-[var(--border)] rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-start justify-between gap-3 p-3.5 text-left hover:bg-[var(--input)] transition-colors"
                        onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                            q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                            q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-sm text-[var(--text)]">{q.question}</span>
                        </div>
                        {expandedQ === i ? <ChevronUp size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" /> : <ChevronDown size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" />}
                      </button>
                      {expandedQ === i && (
                        <div className="px-3.5 pb-3.5 border-t border-[var(--border)] pt-3">
                          <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Type: {q.type}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{q.tip}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Study plan */}
              {result.preparation_plan?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Calendar size={14} /> Study Plan
                  </h3>
                  <div className="space-y-3">
                    {result.preparation_plan.map((day) => (
                      <div key={day.day} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                          {day.day}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{day.focus}</p>
                          <ul className="mt-1 space-y-0.5">
                            {day.tasks.map((t, i) => (
                              <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
                                <span className="text-[var(--primary)]">·</span>{t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Topics */}
              {result.topics?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Key Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.topics.map((t) => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-[var(--input)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {!result && !generating && (
            <EmptyState
              icon={<Brain size={28} />}
              title="No prep generated yet"
              description="Fill in the role and company on the left, then click Generate"
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
