'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
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

const STEPS = ['Account', 'Profile'] as const;

export default function SignupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              i === step ? 'text-[var(--primary)]' : i < step ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                i === step
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                  : i < step
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-[var(--input)] border-[var(--border)]'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 transition-colors ${i < step ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text)]">
          {step === 0 ? 'Create your account' : 'Tell us about yourself'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {step === 0 ? 'Start tracking your job applications' : 'Optional — helps personalize your experience'}
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        {step === 0 ? (
          <>
            <Input
              label="Full name"
              placeholder="Alex Johnson"
              autoComplete="name"
              leftElement={<User size={14} />}
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email"
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
            <Button type="button" fullWidth size="lg" rightIcon={<ChevronRight size={16} />} onClick={nextStep}>
              Continue
            </Button>
          </>
        ) : (
          <>
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
              <Button
                type="button"
                variant="secondary"
                size="lg"
                leftIcon={<ChevronLeft size={16} />}
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button type="submit" fullWidth size="lg" loading={isPending}>
                Create account
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="text-[var(--primary)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
