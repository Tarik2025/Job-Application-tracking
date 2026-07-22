'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api/auth.api';
import { queryKeys } from '@/services/queryKeys';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormElements';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), { user: data.user });
      router.push(ROUTES.DASHBOARD);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/12 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5 w-fit">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-[var(--text)]">Career Copilot</span>
          </Link>

          {/* Center content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium mb-6">
              <Zap size={11} className="fill-current" /> AI-Powered
            </div>
            <h2 className="text-3xl font-bold text-[var(--text)] mb-4 leading-tight">
              Track smarter.<br />Land faster.
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
              Your AI-powered job search companion. Manage applications, classify emails, match resumes, and prep for interviews — all in one place.
            </p>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                'Kanban board for your pipeline',
                'AI email classification',
                'Resume vs JD match scoring',
                'Interview question generator',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-[var(--text-tertiary)]">© {new Date().getFullYear()} Career Copilot</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile back link */}
        <div className="w-full max-w-sm mb-6 lg:hidden">
          <Link href={ROUTES.HOME} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Desktop back link */}
          <Link href={ROUTES.HOME} className="hidden lg:inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors mb-8">
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Welcome back</h1>
            <p className="text-sm text-[var(--text-secondary)]">Sign in to your Career Copilot account</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              leftElement={<Mail size={14} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                leftElement={<Lock size={14} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="hover:text-[var(--text)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end mt-1.5">
                <Link href={ROUTES.FORGOT_PASSWORD} className="text-xs text-[var(--primary)] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth loading={isPending} size="lg" className="mt-2">
              Sign in
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Don&apos;t have an account?{' '}
              <Link href={ROUTES.SIGNUP} className="text-[var(--primary)] hover:underline font-medium">
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
