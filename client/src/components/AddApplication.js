'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { InputField, SelectDropdown, Button } from '@/components/ui';

export default function AddApplication({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company: '', role: '', platform: '', job_url: '', location: '', work_mode: '', salary_expected: '', contact_person: '', contact_email: '', priority: 'medium', job_description: '', notes: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const body = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined };
      await api.createApp(body);
      setForm({ company: '', role: '', platform: '', job_url: '', location: '', work_mode: '', salary_expected: '', contact_person: '', contact_email: '', priority: 'medium', job_description: '', notes: '', tags: '' });
      setOpen(false);
      onAdded();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mb-5">
      <AnimatePresence>
        {!open ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button variant="primary" onClick={() => setOpen(true)}>+ Add Application</Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <h3 className="text-sm font-semibold mb-4">New Application</h3>
              {error && <p className="text-xs text-[var(--danger)] p-2 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-3">{error}</p>}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InputField label="Company *" placeholder="e.g. Google" value={form.company} onChange={e => set('company', e.target.value)} required />
                <InputField label="Role *" placeholder="e.g. SDE-1" value={form.role} onChange={e => set('role', e.target.value)} required />
                <SelectDropdown label="Platform" value={form.platform} onChange={e => set('platform', e.target.value)} placeholder="Select" options={['LinkedIn', 'Naukri', 'Glassdoor', 'Indeed', 'Company Website', 'Referral', 'Other']} />
                <SelectDropdown label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)} options={[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'}]} />
                <InputField label="Job URL" placeholder="https://..." value={form.job_url} onChange={e => set('job_url', e.target.value)} />
                <InputField label="Location" placeholder="City" value={form.location} onChange={e => set('location', e.target.value)} />
                <SelectDropdown label="Work Mode" value={form.work_mode} onChange={e => set('work_mode', e.target.value)} placeholder="Select" options={[{value:'remote',label:'Remote'},{value:'hybrid',label:'Hybrid'},{value:'onsite',label:'Onsite'}]} />
                <InputField label="Expected Salary" placeholder="e.g. 10-15 LPA" value={form.salary_expected} onChange={e => set('salary_expected', e.target.value)} />
                <InputField label="Contact Person" placeholder="Name" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
                <InputField label="Contact Email" placeholder="hr@company.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                <InputField label="Tags (comma-sep)" placeholder="dream, FAANG" value={form.tags} onChange={e => set('tags', e.target.value)} />
                <div /> {/* spacer */}
                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Job Description</label>
                  <textarea className="w-full min-h-[70px] px-3 py-2 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)] resize-y" placeholder="Paste JD for AI matching..." value={form.job_description} onChange={e => set('job_description', e.target.value)} />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Notes</label>
                  <textarea className="w-full min-h-[50px] px-3 py-2 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)] resize-y" rows="2" placeholder="Any notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <Button variant="primary" type="submit" loading={loading}>Save Application</Button>
                  <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
