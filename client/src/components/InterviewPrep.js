'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';

export default function InterviewPrep({ apps }) {
  const [selectedApp, setSelectedApp] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const body = selectedApp ? { application_id: selectedApp } : { role, company };
      setResult(await api.generatePrep(body));
    } catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <FadeIn>
        <div className="card max-w-2xl">
          <h2 className="font-semibold text-lg mb-4">🎓 AI Interview Prep Generator</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectDropdown label="From application" value={selectedApp} onChange={e => setSelectedApp(e.target.value)} placeholder="Select..." options={apps.map(a => ({ value: String(a.id), label: `${a.company} - ${a.role}` }))} />
            <InputField label="Or enter role" placeholder="e.g. SDE-2" value={role} onChange={e => setRole(e.target.value)} />
            <InputField label="Company" placeholder="e.g. Amazon" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <Button variant="primary" className="mt-4" onClick={handleGenerate} loading={loading}>🤖 Generate Prep Plan</Button>
        </div>
      </FadeIn>

      {/* Results */}
      {result && !result.error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions */}
          <FadeIn delay={0.1}>
            <div className="card lg:col-span-2 max-h-[500px] overflow-y-auto">
              <h3 className="font-semibold mb-4">📝 Interview Questions ({result.questions?.length})</h3>
              <div className="space-y-3">
                {result.questions?.map((q, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                      <span className={`badge shrink-0 ${q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="badge bg-[var(--border)] text-[var(--text-secondary)]">{q.type}</span>
                    </div>
                    <p className="text-xs text-[var(--primary)] mt-2">💡 {q.tip}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Topics */}
          <FadeIn delay={0.2}>
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-semibold mb-3">📚 Key Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {result.topics?.map((t, i) => (
                    <span key={i} className="badge bg-[var(--primary)]/10 text-[var(--primary-light)]">{t}</span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-3">📅 5-Day Plan</h3>
                <div className="space-y-2">
                  {result.preparation_plan?.map((day, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[var(--bg-secondary)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[var(--primary)]">Day {day.day}</span>
                        <span className="text-xs font-medium">{day.focus}</span>
                      </div>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {day.tasks?.map((t, j) => <li key={j}>• {t}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {result.company_insights && (
                <div className="card">
                  <h3 className="font-semibold mb-2">🏢 Company Insights</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{result.company_insights}</p>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      )}

      {result?.error && <div className="card"><p className="text-[var(--danger)]">{result.error}</p></div>}
    </div>
  );
}
