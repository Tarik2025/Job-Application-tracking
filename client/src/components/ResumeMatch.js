'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, Button, SelectDropdown } from '@/components/ui';

export default function ResumeMatch({ apps }) {
  const [resumes, setResumes] = useState([]);
  const [jd, setJd] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { api.getResumes().then(setResumes).catch(() => {}); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('resume', file);
    try { await api.uploadResume(fd); setResumes(await api.getResumes()); } catch {}
    finally { setUploading(false); }
  };

  const handleMatch = async () => {
    setLoading(true);
    try {
      const data = await api.matchResume({ job_description: jd || undefined, application_id: selectedApp || undefined });
      setResult(data);
    } catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <FadeIn>
        <div className="card space-y-5">
          <h2 className="font-semibold text-lg">📄 Resume vs Job Match</h2>

          {/* Upload */}
          <div className="p-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors text-center">
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" id="resume-upload" />
            <label htmlFor="resume-upload" className="cursor-pointer">
              {uploading ? <span className="text-[var(--primary)]">Uploading...</span> : (
                <>
                  <span className="text-2xl block mb-2">📎</span>
                  <p className="text-sm text-[var(--text-secondary)]">Upload Resume (PDF)</p>
                </>
              )}
            </label>
            {resumes.length > 0 && <p className="text-xs text-[var(--success)] mt-2">✓ {resumes[0].filename}</p>}
          </div>

          <SelectDropdown label="Or select application with JD" value={selectedApp} onChange={e => setSelectedApp(e.target.value)} placeholder="Choose..." options={apps.filter(a => a.job_description).map(a => ({ value: String(a.id), label: `${a.company} - ${a.role}` }))} />

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1 block mb-1.5">Or paste Job Description</label>
            <textarea className="input-field min-h-[120px]" placeholder="Paste job description here..." value={jd} onChange={e => setJd(e.target.value)} />
          </div>

          <Button variant="primary" className="w-full py-3" onClick={handleMatch} loading={loading} disabled={resumes.length === 0}>
            🎯 Analyze Match
          </Button>
        </div>
      </FadeIn>

      {/* Result panel */}
      <FadeIn delay={0.1}>
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Match Results</h2>
          {result ? (
            result.error ? <p className="text-[var(--danger)]">{result.error}</p> : (
              <div className="space-y-5">
                {/* Score ring */}
                <div className="flex justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <motion.circle initial={{ strokeDashoffset: 251 }} animate={{ strokeDashoffset: 251 - (251 * result.match_score / 100) }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        cx="50" cy="50" r="40" fill="none"
                        stroke={result.match_score >= 70 ? 'var(--success)' : result.match_score >= 40 ? 'var(--warning)' : 'var(--danger)'}
                        strokeWidth="8" strokeLinecap="round" strokeDasharray="251" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{result.match_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--success)] mb-2">✓ Matching Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matching_skills?.map((s, i) => <span key={i} className="badge bg-green-500/10 text-green-400">{s}</span>)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[var(--danger)] mb-2">✕ Missing Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_skills?.map((s, i) => <span key={i} className="badge bg-red-500/10 text-red-400">{s}</span>)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2">💡 Suggestions</h4>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    {result.suggestions?.map((s, i) => <li key={i} className="flex gap-2"><span>•</span>{s}</li>)}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">{result.summary}</div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--text-secondary)]">
              <span className="text-4xl mb-3">🎯</span>
              <p className="text-sm">Upload resume & provide JD to get analysis</p>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
