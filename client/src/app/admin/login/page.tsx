'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { ROUTES } from '@/constants';
import { Input } from '@/components/ui/FormElements';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', secret_key: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.login(form);
      router.replace(ROUTES.ADMIN);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[var(--text)]">Admin Access</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Restricted area</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="admin@example.com"
            required
            autoFocus
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            required
            rightElement={
              <button type="button" onClick={() => setShowPassword(v => !v)} className="pointer-events-auto">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Input
            label="Secret Key"
            type={showSecret ? 'text' : 'password'}
            value={form.secret_key}
            onChange={e => setForm(f => ({ ...f, secret_key: e.target.value }))}
            placeholder="••••••••"
            required
            rightElement={
              <button type="button" onClick={() => setShowSecret(v => !v)} className="pointer-events-auto">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
