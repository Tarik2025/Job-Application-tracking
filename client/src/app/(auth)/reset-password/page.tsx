'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, Suspense } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/services/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormElements';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[0-9]/, 'Needs a number')
      .regex(/[^A-Za-z0-9]/, 'Needs a special character'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (data: FormData) =>
      authApi.resetPassword({ token: token!, password: data.password }),
    onSuccess: () => {
      toast.success('Password reset! Please sign in.');
      setTimeout(() => router.push(ROUTES.LOGIN), 1500);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!token) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">Invalid link</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          This reset link is missing or invalid. Please request a new one.
        </p>
        <Link href={ROUTES.FORGOT_PASSWORD}>
          <Button fullWidth>Request new link</Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">Password reset!</h2>
        <p className="text-sm text-[var(--text-secondary)]">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text)]">Set new password</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min 8 chars, uppercase, number, symbol"
          autoComplete="new-password"
          leftElement={<Lock size={14} />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="hover:text-[var(--text)] transition-colors"
              aria-label={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          leftElement={<Lock size={14} />}
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
