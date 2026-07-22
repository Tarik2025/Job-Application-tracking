'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Card } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { ROUTES } from '@/constants';
import type { AdminUser } from '@/types/api.types';

export default function AdminUserSettingsPage() {
  const { userId } = useAdminUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUser(userId),
    enabled: !!userId,
  });

  const [form, setForm] = useState<Partial<AdminUser>>({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name, email: user.email, phone: user.phone ?? '',
      user_type: user.user_type, preferred_role: user.preferred_role ?? '',
      city: user.city ?? '', state: user.state ?? '', country: user.country ?? '',
      college: user.college ?? '', company: user.company ?? '',
      designation: user.designation ?? '', skills: user.skills ?? '',
      linkedin: user.linkedin ?? '', github: user.github ?? '', portfolio: user.portfolio ?? '',
    });
  }, [user]);

  const set = (k: keyof AdminUser, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => adminApi.updateUser(userId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const { mutate: toggle, isPending: toggling } = useMutation({
    mutationFn: () => adminApi.toggleUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast.success('Status updated');
    },
  });

  const { mutate: deleteUser, isPending: deleting } = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted');
      router.replace(ROUTES.ADMIN_USERS);
    },
  });

  const field = (label: string, key: keyof AdminUser, type = 'text') => (
    <Input label={label} type={type} value={(form[key] as string) ?? ''} onChange={e => set(key, e.target.value)} />
  );

  if (isLoading) return <PageContainer><div className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-pulse" /></PageContainer>;

  return (
    <PageContainer maxWidth="md">
      <PageHeader title="Settings" description="Admin editing this user's profile" />

      <div className="space-y-5">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-5 flex items-center gap-2"><User size={14} /> Profile Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {field('Full name', 'name')}
              {field('Email', 'email', 'email')}
              {field('Phone', 'phone')}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">User type</label>
                <select value={(form.user_type as string) ?? ''} onChange={e => set('user_type', e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)]">
                  <option value="">—</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {field('City', 'city')}
              {field('State', 'state')}
              {field('Country', 'country')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field('College', 'college')}
              {field('Company', 'company')}
              {field('Designation', 'designation')}
              {field('Preferred role', 'preferred_role')}
            </div>
            {field('Skills (comma separated)', 'skills')}
            <div className="grid grid-cols-3 gap-4">
              {field('LinkedIn', 'linkedin')}
              {field('GitHub', 'github')}
              {field('Portfolio', 'portfolio')}
            </div>
            <div className="flex justify-end pt-2">
              <Button loading={saving} onClick={() => save()}>Save changes</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Account Status</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Status: <span className={user?.is_active ? 'text-emerald-400' : 'text-[var(--danger)]'}>{user?.is_active ? 'Active' : 'Inactive'}</span>
          </p>
          <Button
            variant="secondary"
            loading={toggling}
            leftIcon={user?.is_active ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} />}
            onClick={() => toggle()}
          >
            {user?.is_active ? 'Deactivate account' : 'Activate account'}
          </Button>
        </Card>

        <Card className="border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Permanently delete this user and all their data. This cannot be undone.</p>
          <Button
            variant="danger-solid"
            leftIcon={<Trash2 size={14} />}
            loading={deleting}
            onClick={() => { if (confirm(`Delete user "${user?.name}"? This cannot be undone.`)) deleteUser(); }}
          >
            Delete user
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
