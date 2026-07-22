'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), { user: data.user });
      router.push(ROUTES.DASHBOARD);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to your account</p>
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

        <div className="flex justify-end">
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        Don&apos;t have an account?{' '}
        <Link href={ROUTES.SIGNUP} className="text-[var(--primary)] hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
