'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Trash2, Eye, Zap, FileText, CheckCircle, XCircle } from 'lucide-react';
import { resumeApi } from '@/services/api/resume.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES, LIMITS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/FormElements';
import { Card, Skeleton, EmptyState } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDate, getErrorMessage } from '@/utils';
import type { ResumeAnalysis, ResumeMatch } from '@/types/api.types';

export default function ResumePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [match, setMatch] = useState<ResumeMatch | null>(null);

  const { data: resumes, isLoading } = useQuery({
    queryKey: queryKeys.resumes.list(),
    queryFn: resumeApi.list,
    staleTime: STALE_TIMES.MEDIUM,
  });

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file, setUploadProgress),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.list() });
      setAnalysis(data.analysis);
      setSelectedId(data.id);
      toast.success('Resume uploaded and analyzed');
      setUploadProgress(0);
    },
    onError: (err) => { toast.error(getErrorMessage(err)); setUploadProgress(0); },
  });

  const { mutate: deleteResume } = useMutation({
    mutationFn: resumeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.list() });
      toast.success('Resume deleted');
      setAnalysis(null);
      setSelectedId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: analyze, isPending: analyzing } = useMutation({
    mutationFn: (id: number) => resumeApi.analyze(id),
    onSuccess: (data) => { setAnalysis(data); toast.success('Analysis complete'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: matchResume, isPending: matching } = useMutation({
    mutationFn: () => resumeApi.match({ resume_id: selectedId!, job_description: jobDesc }),
    onSuccess: (data) => { setMatch(data); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > LIMITS.MAX_RESUME_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${LIMITS.MAX_RESUME_SIZE_MB}MB`);
      return;
    }
    upload(file);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Resume"
        description="Upload, analyze, and match your resume to job descriptions"
        actions={
          <>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <Button
              leftIcon={<Upload size={14} />}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
              disabled={(resumes?.length ?? 0) >= LIMITS.MAX_RESUMES}
            >
              Upload PDF
            </Button>
          </>
        }
      />

      {uploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Uploading…</span><span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Resume list */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Your Resumes</h3>
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : !resumes?.length ? (
            <EmptyState
              icon={<FileText size={24} />}
              title="No resumes yet"
              description="Upload a PDF to get started"
            />
          ) : (
            resumes.map((r) => (
              <div
                key={r.id}
                onClick={() => { setSelectedId(r.id); setAnalysis(null); setMatch(null); }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedId === r.id
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{r.filename}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(r.uploaded_at)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); analyze(r.id); }}
                      className="p-1.5 rounded-md hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                      title="Analyze"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete resume?')) deleteResume(r.id); }}
                      className="p-1.5 rounded-md hover:bg-[var(--input)] text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Analysis + Match */}
        <div className="col-span-2 space-y-5">
          {/* Analysis */}
          {analyzing ? (
            <Card><Skeleton className="h-40" /></Card>
          ) : analysis ? (
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                <Zap size={14} className="text-[var(--primary)]" /> Resume Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Word count</p>
                  <p className="font-medium text-[var(--text)]">{analysis.word_count}</p>
                </div>
                {analysis.experience_years !== undefined && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Experience</p>
                    <p className="font-medium text-[var(--text)]">{analysis.experience_years} years</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {analysis.has_projects ? <CheckCircle size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-[var(--text-secondary)]" />}
                  <span className="text-xs text-[var(--text-secondary)]">Projects section</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {analysis.has_certifications ? <CheckCircle size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-[var(--text-secondary)]" />}
                  <span className="text-xs text-[var(--text-secondary)]">Certifications</span>
                </div>
              </div>
              {analysis.skills.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">Detected skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skills.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          {/* JD Match */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Match Against Job Description</h3>
            <Textarea
              placeholder="Paste the job description here…"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={5}
            />
            <Button
              className="mt-3"
              leftIcon={<Zap size={14} />}
              loading={matching}
              disabled={!selectedId || !jobDesc.trim()}
              onClick={() => matchResume()}
            >
              Match resume
            </Button>

            {match && (
              <div className="mt-5 space-y-4">
                {/* Score */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={match.match_score >= 70 ? '#10b981' : match.match_score >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${match.match_score} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--text)]">
                      {match.match_score}%
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{match.summary}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {match.matching_skills.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 font-medium mb-1.5">✓ Matching skills</p>
                      <div className="flex flex-wrap gap-1">
                        {match.matching_skills.map((s) => (
                          <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {match.missing_skills.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 font-medium mb-1.5">✗ Missing skills</p>
                      <div className="flex flex-wrap gap-1">
                        {match.missing_skills.map((s) => (
                          <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {match.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mb-1.5">Suggestions</p>
                    <ul className="space-y-1">
                      {match.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
                          <span className="text-[var(--primary)] shrink-0">→</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
