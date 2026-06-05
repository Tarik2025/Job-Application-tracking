'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FadeIn, InputField, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--bg)]">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-[380px]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-7">
          {!sent ? (<>
            <Link href="/login" className="text-xs text-[var(--text-secondary)] no-underline hover:text-[var(--primary)] transition-colors block mb-5">← Back</Link>
            <h1 className="text-lg font-semibold mb-1">Reset password</h1>
            <p className="text-xs text-[var(--text-secondary)] mb-5">Enter your email to receive a reset link.</p>
            {error && <p className="text-xs text-[var(--danger)] p-2 rounded-lg bg-[var(--danger)]/5 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <InputField label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <Button variant="primary" loading={loading} type="submit" className="w-full">Send reset link</Button>
            </form>
          </>) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--success)] flex items-center justify-center text-[var(--success)] font-bold mx-auto mb-3">✓</div>
              <h2 className="text-base font-semibold mb-1">Check your email</h2>
              <p className="text-xs text-[var(--text-secondary)]">If an account exists for {email}, a reset link has been sent.</p>
              <Link href="/login" className="inline-block mt-4 text-xs text-[var(--primary)] no-underline">Back to sign in</Link>
            </motion.div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
