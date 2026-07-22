'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { User, Lock, LogOut, Trash2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/services/api/auth.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES, ROUTES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Card } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { getErrorMessage } from '@/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  phone: z.string().optional(),
  user_type: z.enum(['student', 'professional']).optional(),
  preferred_role: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  linkedin: z.string().url('Invalid URL').optional().or(z.literal('')),
  github: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolio: z.string().url('Invalid URL').optional().or(z.literal('')),
  skills: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[0-9]/, 'Needs number')
    .regex(/[^A-Za-z0-9]/, 'Needs special character'),
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;
type Tab = 'profile' | 'security';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const { data } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.me,
    staleTime: STALE_TIMES.LONG,
  });
  const user = data?.user;

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: user ? {
      name: user.name ?? '',
      phone: user.phone ?? '',
      user_type: user.user_type,
      preferred_role: user.preferred_role ?? '',
      city: user.city ?? '',
      country: user.country ?? '',
      linkedin: user.linkedin ?? '',
      github: user.github ?? '',
      portfolio: user.portfolio ?? '',
      skills: user.skills ?? '',
    } : undefined,
  });

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed');
      passwordForm.reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: logout } = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => authApi.deleteAccount({ password: deletePassword }),
    onSuccess: () => {
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={14} /> },
    { id: 'security', label: 'Security', icon: <Lock size={14} /> },
  ];

  return (
    <PageContainer maxWidth="md">
      <PageHeader title="Settings" />

      {/* Tab nav */}
      <div className="flex gap-1 bg-[var(--input)] border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-5">Profile Information</h3>
          <form onSubmit={profileForm.handleSubmit((d) => updateProfile(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full name"
                error={profileForm.formState.errors.name?.message}
                required
                {...profileForm.register('name')}
              />
              <Input label="Phone" {...profileForm.register('phone')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="I am a"
                placeholder="Select type"
                options={[
                  { value: 'student', label: 'Student' },
                  { value: 'professional', label: 'Professional' },
                ]}
                {...profileForm.register('user_type')}
              />
              <Input label="Preferred role" {...profileForm.register('preferred_role')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" {...profileForm.register('city')} />
              <Input label="Country" {...profileForm.register('country')} />
            </div>
            <Input
              label="Skills (comma separated)"
              placeholder="React, Node.js, Python…"
              {...profileForm.register('skills')}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="LinkedIn"
                placeholder="https://linkedin.com/in/…"
                error={profileForm.formState.errors.linkedin?.message}
                {...profileForm.register('linkedin')}
              />
              <Input
                label="GitHub"
                placeholder="https://github.com/…"
                error={profileForm.formState.errors.github?.message}
                {...profileForm.register('github')}
              />
              <Input
                label="Portfolio"
                placeholder="https://…"
                error={profileForm.formState.errors.portfolio?.message}
                {...profileForm.register('portfolio')}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={savingProfile}>Save changes</Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'security' && (
        <div className="space-y-5">
          {/* Change password */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-5">Change Password</h3>
            <form onSubmit={passwordForm.handleSubmit((d) => changePassword(d))} className="space-y-4">
              <Input
                label="Current password"
                type={showCurrent ? 'text' : 'password'}
                rightElement={
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="hover:text-[var(--text)] transition-colors">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                error={passwordForm.formState.errors.current_password?.message}
                {...passwordForm.register('current_password')}
              />
              <Input
                label="New password"
                type={showNew ? 'text' : 'password'}
                rightElement={
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="hover:text-[var(--text)] transition-colors">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                error={passwordForm.formState.errors.new_password?.message}
                {...passwordForm.register('new_password')}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={changingPw}>Update password</Button>
              </div>
            </form>
          </Card>

          {/* Logout */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Session</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Signed in as <span className="text-[var(--text)] font-medium">{user?.email}</span>
            </p>
            <Button variant="secondary" leftIcon={<LogOut size={14} />} onClick={() => logout()}>
              Sign out
            </Button>
          </Card>

          {/* Delete account */}
          <Card className="border-red-500/20">
            <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Permanently delete your account and all data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Input
                type="password"
                placeholder="Enter password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="danger-solid"
                leftIcon={<Trash2 size={14} />}
                loading={deleting}
                disabled={!deletePassword}
                onClick={() => {
                  if (confirm('This will permanently delete your account. Are you sure?')) deleteAccount();
                }}
              >
                Delete account
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
