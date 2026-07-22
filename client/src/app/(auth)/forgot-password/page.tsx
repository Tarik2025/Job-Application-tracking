'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '@/services/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormElements';
import { ROUTES } from '@/constants';
import { getErrorMessage } from '@/utils';
import { toast } from 'sonner';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isSuccess) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">Check your email</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          If an account exists for that email, we&apos;ve sent a password reset link.
        </p>
        <Link href={ROUTES.LOGIN}>
          <Button variant="secondary" fullWidth leftIcon={<ArrowLeft size={14} />}>
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text)]">Reset your password</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftElement={<Mail size={14} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Send reset link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
