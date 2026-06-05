'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FadeIn, InputField, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.login(form); router.push('/dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--bg)]">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-[380px]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-7">
          <Link href="/" className="text-xs text-[var(--text-secondary)] no-underline hover:text-[var(--primary)] transition-colors block mb-5">← Back</Link>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">C</div>
            <h1 className="text-lg font-semibold">Sign in</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-6">Welcome back to Career Copilot</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <InputField label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <InputField label="Password" type="password" placeholder="Your password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            {error && <p className="text-xs text-[var(--danger)] p-2.5 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20">{error}</p>}
            <Button variant="primary" loading={loading} type="submit" className="w-full mt-1">Sign in</Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-between text-xs">
            <Link href="/forgot-password" className="text-[var(--text-secondary)] no-underline hover:text-[var(--primary)] transition-colors">Forgot password?</Link>
            <Link href="/signup" className="text-[var(--primary)] no-underline font-medium">Create account</Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
