'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api/auth.api';
import { queryKeys } from '@/services/queryKeys';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[0-9]/, 'Needs a number')
    .regex(/[^A-Za-z0-9]/, 'Needs a special character'),
  user_type: z.enum(['student', 'professional']).optional(),
  preferred_role: z.string().optional(),
  experience: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const perks = [
  'Free forever — no credit card needed',
  'AI-powered email classification',
  'Resume vs JD match scoring',
  'Chrome extension for 1-click saves',
  'Interview question generator',
  'Daily streak & goal tracking',
];

export default function SignupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const userType = watch('user_type');

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), { user: data.user });
      toast.success('Account created! Welcome aboard 🎉');
      router.push(ROUTES.DASHBOARD);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const nextStep = async () => {
    const valid = await trigger(['name', 'email', 'password']);
    if (valid) setStep(1);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/12 blur-[100px]" />
          <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] rounded-full bg-emerald-600/8 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5 w-fit">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-[var(--text)]">Career Copilot</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
              <Zap size={11} className="fill-current" /> Free forever
            </div>
            <h2 className="text-3xl font-bold text-[var(--text)] mb-4 leading-tight">
              Everything you need<br />to land the job.
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
              Join thousands of job seekers who use Career Copilot to organize their search and get hired faster.
            </p>

            <div className="space-y-3">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-[var(--text-tertiary)]">© {new Date().getFullYear()} Career Copilot</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
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
          <Link href={ROUTES.HOME} className="hidden lg:inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors mb-8">
            <ArrowLeft size={14} /> Back to home
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {['Account', 'Profile'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i === step ? 'text-[var(--primary)]' : i < step ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    i === step
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : i < step
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-[var(--input)] border-[var(--border)] text-[var(--text-secondary)]'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  {label}
                </div>
                {i < 1 && <div className={`h-px w-8 transition-colors ${i < step ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
              {step === 0 ? 'Create your account' : 'Tell us about yourself'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {step === 0 ? 'Start tracking your job applications for free' : 'Optional — helps personalize your experience'}
            </p>
          </div>

          <form onSubmit={handleSubmit((d) => mutate(d))}>
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <Input
                    label="Full name"
                    placeholder="Alex Johnson"
                    autoComplete="name"
                    leftElement={<User size={14} />}
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    leftElement={<Mail size={14} />}
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                    autoComplete="new-password"
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
                  <Button type="button" fullWidth size="lg" rightIcon={<ArrowRight size={15} />} onClick={nextStep} className="mt-2">
                    Continue
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <Select
                    label="I am a"
                    placeholder="Select type"
                    options={[
                      { value: 'student', label: 'Student' },
                      { value: 'professional', label: 'Working Professional' },
                    ]}
                    {...register('user_type')}
                  />
                  <Input
                    label="Preferred role"
                    placeholder={userType === 'student' ? 'e.g. Software Engineer Intern' : 'e.g. Senior Frontend Engineer'}
                    {...register('preferred_role')}
                  />
                  {userType === 'professional' && (
                    <Select
                      label="Experience"
                      placeholder="Years of experience"
                      options={[
                        { value: '0-1', label: '0–1 years' },
                        { value: '1-3', label: '1–3 years' },
                        { value: '3-5', label: '3–5 years' },
                        { value: '5-10', label: '5–10 years' },
                        { value: '10+', label: '10+ years' },
                      ]}
                      {...register('experience')}
                    />
                  )}
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="secondary" size="lg" leftIcon={<ArrowLeft size={15} />} onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button type="submit" fullWidth size="lg" loading={isPending}>
                      Create account
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
              <Link href={ROUTES.LOGIN} className="text-[var(--primary)] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
