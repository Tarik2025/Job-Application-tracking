'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

const DEGREES = ['B.Tech', 'M.Tech', 'B.E.', 'M.E.', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'MBA', 'BBA', 'B.Com', 'M.Com', 'BA', 'MA', 'PhD', 'Other'];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [showDel, setShowDel] = useState(false);

  useEffect(() => {
    api.me().then(d => { setUser(d.user); setForm(d.user); }).catch(() => router.push('/login'));
  }, []);

  const handleSave = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      await api.updateProfile(form);
      const d = await api.me();
      setUser(d.user); setForm(d.user);
      setEditing(false);
      setMessage('Profile updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.changePassword(pwForm);
      setPwForm({ current_password: '', new_password: '' });
      setShowPw(false);
      setMessage('Password changed');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async () => {
    if (!delPassword) { setError('Password required'); return; }
    try {
      await api.deleteAccount({ password: delPassword });
      router.push('/');
    } catch (err) { setError(err.message); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-5 flex items-start justify-center pt-12">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-2xl">
        <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-lg font-bold text-[var(--primary)]">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold">{user.name}</h1>
                <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
              </div>
            </div>
            <Button variant={editing ? 'secondary' : 'primary'} onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {message && <div className="p-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-xs text-[var(--success)] mb-4">{message}</div>}
          {error && <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-xs text-[var(--danger)] mb-4">{error}</div>}

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InputField label="Name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} disabled={!editing} />
            <InputField label="Phone" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} disabled={!editing} />
            <SelectDropdown label="Gender" value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value})} options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} />
            <SelectDropdown label="Type" value={form.user_type || ''} onChange={e => setForm({...form, user_type: e.target.value})} options={[{value: 'student', label: 'Student'}, {value: 'professional', label: 'Professional'}]} />

            {form.user_type === 'student' && (<>
              <InputField label="College" value={form.college || ''} onChange={e => setForm({...form, college: e.target.value})} disabled={!editing} />
              <SelectDropdown label="Degree" value={form.degree || ''} onChange={e => setForm({...form, degree: e.target.value})} options={DEGREES} />
              <InputField label="Branch" value={form.branch || ''} onChange={e => setForm({...form, branch: e.target.value})} disabled={!editing} />
              <InputField label="Year of Study" value={form.year_of_study || ''} onChange={e => setForm({...form, year_of_study: e.target.value})} disabled={!editing} />
            </>)}

            {form.user_type === 'professional' && (<>
              <InputField label="Company" value={form.company || ''} onChange={e => setForm({...form, company: e.target.value})} disabled={!editing} />
              <InputField label="Designation" value={form.designation || ''} onChange={e => setForm({...form, designation: e.target.value})} disabled={!editing} />
              <InputField label="Experience" value={form.experience || ''} onChange={e => setForm({...form, experience: e.target.value})} disabled={!editing} />
            </>)}

            <InputField label="City" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} disabled={!editing} />
            <InputField label="State" value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} disabled={!editing} />
            <InputField label="Country" value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} disabled={!editing} />
            <InputField label="Preferred Role" value={form.preferred_role || ''} onChange={e => setForm({...form, preferred_role: e.target.value})} disabled={!editing} />
            <InputField label="LinkedIn" value={form.linkedin || ''} onChange={e => setForm({...form, linkedin: e.target.value})} disabled={!editing} />
            <InputField label="GitHub" value={form.github || ''} onChange={e => setForm({...form, github: e.target.value})} disabled={!editing} />
            <InputField label="Portfolio" value={form.portfolio || ''} onChange={e => setForm({...form, portfolio: e.target.value})} disabled={!editing} />
            <InputField label="Skills" value={form.skills || ''} onChange={e => setForm({...form, skills: e.target.value})} disabled={!editing} placeholder="comma separated" />
          </div>

          {/* Stacks */}
          {user.stacks?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tech Stacks</p>
              <div className="flex flex-wrap gap-1.5">
                {user.stacks.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{s}</span>)}
              </div>
            </div>
          )}

          {editing && (
            <div className="flex gap-2 mt-5">
              <Button variant="primary" loading={loading} onClick={handleSave}>Save Changes</Button>
            </div>
          )}

          {/* Password & Delete */}
          <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-3">
            <button onClick={() => setShowPw(!showPw)} className="text-xs text-[var(--primary)] hover:underline cursor-pointer">🔒 Change Password</button>
            {showPw && (
              <form onSubmit={handleChangePassword} className="flex gap-2 items-end">
                <InputField label="Current" type="password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} required />
                <InputField label="New" type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} required />
                <Button variant="primary" type="submit">Change</Button>
              </form>
            )}

            <div>
              <button onClick={() => setShowDel(!showDel)} className="text-xs text-[var(--danger)] hover:underline cursor-pointer">🗑️ Delete Account</button>
              {showDel && (
                <div className="flex gap-2 items-end mt-2">
                  <InputField label="Confirm password" type="password" value={delPassword} onChange={e => setDelPassword(e.target.value)} />
                  <Button variant="danger" onClick={handleDelete}>Delete Forever</Button>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} className="text-xs text-[var(--primary)] hover:underline mt-5 block cursor-pointer">← Back to Dashboard</button>
        </div>
      </FadeIn>
    </div>
  );
}
