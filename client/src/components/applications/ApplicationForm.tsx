'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { applicationsApi, type CreateApplicationPayload } from '@/services/api/applications.api';
import { queryKeys } from '@/services/queryKeys';
import { APPLICATION_STATUSES, PRIORITY_LEVELS, WORK_MODES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/FormElements';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/utils';
import type { Application } from '@/types/api.types';

const schema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn']),
  priority: z.enum(['low', 'medium', 'high']),
  platform: z.string().optional(),
  job_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  location: z.string().optional(),
  work_mode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  salary_expected: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
  editApp?: Application;
}

export function ApplicationForm({ open, onClose, defaultStatus, editApp }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!editApp;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editApp
      ? {
          company: editApp.company,
          role: editApp.role,
          status: editApp.status,
          priority: editApp.priority,
          platform: editApp.platform ?? '',
          job_url: editApp.job_url ?? '',
          location: editApp.location ?? '',
          work_mode: editApp.work_mode,
          salary_expected: editApp.salary_expected ?? '',
          notes: editApp.notes ?? '',
        }
      : { status: (defaultStatus as FormData['status']) ?? 'applied', priority: 'medium' as const },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => {
      const payload: CreateApplicationPayload = {
        ...data,
        job_url: data.job_url || undefined,
        platform: data.platform || undefined,
        location: data.location || undefined,
        salary_expected: data.salary_expected || undefined,
        notes: data.notes || undefined,
      };
      return isEdit
        ? applicationsApi.update(editApp!.id, payload)
        : applicationsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success(isEdit ? 'Application updated' : 'Application added');
      reset();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Application' : 'Add Application'} size="lg">
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Company" placeholder="Google" error={errors.company?.message} required {...register('company')} />
          <Input label="Role" placeholder="Software Engineer" error={errors.role?.message} required {...register('role')} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Status"
            options={APPLICATION_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
            {...register('status')}
          />
          <Select
            label="Priority"
            options={PRIORITY_LEVELS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            {...register('priority')}
          />
          <Select
            label="Work mode"
            placeholder="Any"
            options={WORK_MODES.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
            {...register('work_mode')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Platform" placeholder="LinkedIn, Naukri…" {...register('platform')} />
          <Input label="Location" placeholder="Bangalore, Remote…" {...register('location')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Job URL" placeholder="https://…" error={errors.job_url?.message} {...register('job_url')} />
          <Input label="Expected salary" placeholder="₹12 LPA" {...register('salary_expected')} />
        </div>
        <Textarea label="Notes" placeholder="Any notes about this application…" rows={3} {...register('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending}>{isEdit ? 'Save changes' : 'Add application'}</Button>
        </div>
      </form>
    </Modal>
  );
}
