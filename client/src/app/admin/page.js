'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FadeIn, InputField, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';
import AdminPanel from '@/components/AdminPanel';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', secret_key: '' });

  useEffect(() => {
    api.adminMe().then(() => setAuthed(true)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoginLoading(true);
    try {
      await api.adminLogin(form);
      setAuthed(true);
    } catch (err) { setError(err.message); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setAuthed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--bg)]">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <FadeIn className="w-full max-w-[380px]">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-7">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--danger)] flex items-center justify-center text-white font-bold text-xs">A</div>
              <h1 className="text-lg font-semibold">Admin Login</h1>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-6">Enter admin credentials to continue</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
              <InputField label="Email" type="email" placeholder="admin@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <InputField label="Password" type="password" placeholder="Admin password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              <InputField label="Secret Key" type="password" placeholder="Enter secret key" value={form.secret_key} onChange={e => setForm({...form, secret_key: e.target.value})} required />
              {error && <p className="text-xs text-[var(--danger)] p-2.5 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20">{error}</p>}
              <Button variant="primary" loading={loginLoading} type="submit" className="w-full mt-1">Access Admin Panel</Button>
            </form>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <FadeIn>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-sm text-[var(--text-secondary)]">Manage all users and applications</p>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary text-sm">Logout</button>
          </div>
          <AdminPanel />
        </div>
      </FadeIn>
    </div>
  );
}
