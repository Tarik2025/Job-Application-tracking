'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, FileText } from 'lucide-react';
import { adminApi } from '@/services/api/admin.api';
import { useAdminUser } from '../context';
import { Button } from '@/components/ui/Button';
import { Card, Skeleton, EmptyState } from '@/components/ui/Card';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDate } from '@/utils';

export default function AdminUserResumePage() {
  const { userId } = useAdminUser();
  const queryClient = useQueryClient();

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['admin-user-resumes', userId],
    queryFn: () => adminApi.getUserResumes(userId),
    enabled: !!userId,
  });

  const { mutate: deleteResume } = useMutation({
    mutationFn: (id: number) => adminApi.deleteUserResume(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-resumes', userId] });
      toast.success('Resume deleted');
    },
    onError: () => toast.error('Failed to delete resume'),
  });

  return (
    <PageContainer>
      <PageHeader title="Resume" description="Uploaded resumes" />

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !resumes?.length ? (
        <EmptyState icon={<FileText size={28} />} title="No resumes uploaded" description="This user hasn't uploaded any resumes yet" />
      ) : (
        <div className="space-y-3 max-w-xl">
          {resumes.map(r => (
            <Card key={r.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{r.filename}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(r.uploaded_at)}</p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={13} />}
                onClick={() => { if (confirm('Delete this resume?')) deleteResume(r.id); }}
              >
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
