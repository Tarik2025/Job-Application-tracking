'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, InputField, SelectDropdown, Button, Modal } from '@/components/ui';

export default function InterviewCalendar({ apps }) {
  const [interviews, setInterviews] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ application_id: '', round_name: '', interview_date: '', interview_type: '', interviewer: '', meeting_link: '', notes: '' });

  useEffect(() => { load(); }, []);
  const load = () => api.getInterviews().then(setInterviews).catch(() => {});

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.application_id || !form.round_name || !form.interview_date) return;
    await api.createInterview(form);
    setForm({ application_id: '', round_name: '', interview_date: '', interview_type: '', interviewer: '', meeting_link: '', notes: '' });
    setShowAdd(false);
    load();
  };

  const handleOutcome = async (id, outcome) => {
    await api.updateInterview(id, { outcome });
    load();
  };

  const upcoming = interviews.filter(i => i.outcome === 'pending' && new Date(i.interview_date) >= new Date());
  const past = interviews.filter(i => i.outcome !== 'pending' || new Date(i.interview_date) < new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📅 Interview Calendar</h2>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Schedule Interview</Button>
      </div>

      {/* Upcoming */}
      <FadeIn>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-3">Upcoming ({upcoming.length})</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No upcoming interviews</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div>
                    <p className="text-sm font-medium">{i.company} — {i.role}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{i.round_name} • {i.interview_type || 'General'}</p>
                    <p className="text-xs text-[var(--primary)] mt-0.5">{new Date(i.interview_date).toLocaleString()}</p>
                    {i.interviewer && <p className="text-[10px] text-[var(--text-secondary)]">With: {i.interviewer}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {i.meeting_link && <a href={i.meeting_link} target="_blank" className="text-xs px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">Join</a>}
                    <button onClick={() => handleOutcome(i.id, 'passed')} className="text-xs px-2 py-1 rounded-md bg-[var(--success)]/10 text-[var(--success)] cursor-pointer">✓</button>
                    <button onClick={() => handleOutcome(i.id, 'failed')} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Past */}
      {past.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3">Past Interviews ({past.length})</h3>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {past.map(i => (
                <div key={i.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-secondary)]">
                  <div>
                    <p className="text-xs font-medium">{i.company} — {i.round_name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{new Date(i.interview_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    i.outcome === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                    i.outcome === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>{i.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule Interview">
        <form onSubmit={handleAdd} className="space-y-3">
          <SelectDropdown label="Application *" value={form.application_id} onChange={e => setForm({...form, application_id: e.target.value})} placeholder="Select" options={apps.map(a => ({ value: String(a.id), label: `${a.company} - ${a.role}` }))} />
          <InputField label="Round *" placeholder="e.g. Technical Round 1" value={form.round_name} onChange={e => setForm({...form, round_name: e.target.value})} required />
          <InputField label="Date & Time *" type="datetime-local" value={form.interview_date} onChange={e => setForm({...form, interview_date: e.target.value})} required />
          <SelectDropdown label="Type" value={form.interview_type} onChange={e => setForm({...form, interview_type: e.target.value})} placeholder="Select" options={['phone','video','onsite','coding','system_design','hr','managerial']} />
          <InputField label="Interviewer" placeholder="Name" value={form.interviewer} onChange={e => setForm({...form, interviewer: e.target.value})} />
          <InputField label="Meeting Link" placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm({...form, meeting_link: e.target.value})} />
          <Button variant="primary" type="submit" className="w-full">Schedule</Button>
        </form>
      </Modal>
    </div>
  );
}
