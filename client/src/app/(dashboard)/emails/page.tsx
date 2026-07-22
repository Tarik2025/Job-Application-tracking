'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Mail, Plus, Trash2, RefreshCw, Zap, CheckCircle,
  Server, Eye, EyeOff, Inbox,
} from 'lucide-react';
import { emailsApi } from '@/services/api/emails.api';
import { queryKeys } from '@/services/queryKeys';
import { STALE_TIMES, LIMITS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/FormElements';
import { Card, Skeleton, EmptyState, Pagination } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { formatDate, getErrorMessage } from '@/utils';
import type { ClassifyEmailResponse } from '@/types/api.types';

const accountSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  label: z.string().optional(),
});
type AccountForm = z.infer<typeof accountSchema>;

const CLASSIFICATION_COLORS: Record<string, string> = {
  interview_invitation: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  offer: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  rejection: 'text-red-400 bg-red-500/10 border-red-500/20',
  application_received: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  follow_up: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  other: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [classifyResult, setClassifyResult] = useState<ClassifyEmailResponse | null>(null);

  const { data: emailsData, isLoading } = useQuery({
    queryKey: queryKeys.emails.list({ page, limit: 20 }),
    queryFn: () => emailsApi.list({ page, limit: 20 }),
    staleTime: STALE_TIMES.SHORT,
  });

  const { data: accounts } = useQuery({
    queryKey: queryKeys.emails.accounts(),
    queryFn: emailsApi.listAccounts,
    staleTime: STALE_TIMES.LONG,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema) as import('react-hook-form').Resolver<AccountForm>,
    defaultValues: { host: 'imap.gmail.com', port: 993 },
  });

  const { mutate: addAccount, isPending: addingAccount } = useMutation({
    mutationFn: (data: AccountForm) => emailsApi.addAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.accounts() });
      toast.success('Email account connected');
      reset();
      setAddAccountOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: removeAccount } = useMutation({
    mutationFn: emailsApi.removeAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.accounts() });
      toast.success('Account removed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: fetchEmails, isPending: fetching } = useMutation({
    mutationFn: emailsApi.fetchEmails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.list({}) });
      const total = data.results.reduce((s, r) => s + (r.fetched ?? 0), 0);
      toast.success(`Fetched ${total} new emails`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: classify, isPending: classifying } = useMutation({
    mutationFn: () => emailsApi.classify({ subject: emailSubject, body: emailBody }),
    onSuccess: (data) => setClassifyResult(data),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: confirmClassification, isPending: confirming } = useMutation({
    mutationFn: () =>
      emailsApi.confirmClassification({
        company: classifyResult!.classification.company ?? '',
        role: classifyResult!.classification.role,
        status: classifyResult!.classification.suggested_status,
        email_id: classifyResult!.id,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
      toast.success(data.action === 'created' ? 'Application created!' : 'Application updated!');
      setClassifyResult(null);
      setEmailBody('');
      setEmailSubject('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const emails = emailsData?.data ?? [];
  const pagination = emailsData?.pagination;

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="Email AI"
        description="Classify emails and sync your inbox"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              loading={fetching}
              disabled={!accounts?.length}
              onClick={() => fetchEmails()}
            >
              Fetch inbox
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus size={14} />}
              disabled={(accounts?.length ?? 0) >= LIMITS.MAX_EMAIL_ACCOUNTS}
              onClick={() => setAddAccountOpen(true)}
            >
              Add account
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left — classify + accounts */}
        <div className="space-y-5">
          {/* Connected accounts */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
              <Server size={14} /> Connected Accounts
            </h3>
            {!accounts?.length ? (
              <p className="text-xs text-[var(--text-secondary)]">No accounts connected yet</p>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)]">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{acc.label ?? acc.email}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{acc.email}</p>
                    </div>
                    <button
                      onClick={() => { if (confirm('Remove account?')) removeAccount(acc.id); }}
                      className="p-1 rounded hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Manual classify */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
              <Zap size={14} className="text-[var(--primary)]" /> Classify Email
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="Subject line"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <Textarea
                placeholder="Paste email body here…"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
              />
              <Button
                fullWidth
                leftIcon={<Zap size={14} />}
                loading={classifying}
                disabled={!emailBody.trim()}
                onClick={() => classify()}
              >
                Classify
              </Button>
            </div>

            {/* Classification result */}
            {classifyResult && (
              <div className="mt-4 p-3.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CLASSIFICATION_COLORS[classifyResult.classification.classification] ?? CLASSIFICATION_COLORS.other}`}>
                    {classifyResult.classification.classification.replace(/_/g, ' ')}
                  </span>
                  {classifyResult.classification.confidence && (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {Math.round(classifyResult.classification.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                {classifyResult.classification.company && (
                  <p className="text-sm text-[var(--text)]">
                    <span className="text-[var(--text-secondary)] text-xs">Company: </span>
                    {classifyResult.classification.company}
                  </p>
                )}
                {classifyResult.classification.role && (
                  <p className="text-sm text-[var(--text)]">
                    <span className="text-[var(--text-secondary)] text-xs">Role: </span>
                    {classifyResult.classification.role}
                  </p>
                )}
                {classifyResult.classification.summary && (
                  <p className="text-xs text-[var(--text-secondary)]">{classifyResult.classification.summary}</p>
                )}
                {classifyResult.classification.suggested_status && (
                  <Button
                    size="sm"
                    fullWidth
                    leftIcon={<CheckCircle size={13} />}
                    loading={confirming}
                    onClick={() => confirmClassification()}
                  >
                    Save to applications
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right — email history */}
        <div className="col-span-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Email History</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !emails.length ? (
            <EmptyState
              icon={<Inbox size={28} />}
              title="No emails yet"
              description="Connect an IMAP account and fetch your inbox, or classify emails manually"
            />
          ) : (
            <>
              <div className="space-y-2">
                {emails.map((email) => (
                  <div key={email.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[var(--input)] flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--text)] truncate">
                          {email.subject ?? '(no subject)'}
                        </p>
                        {email.classification && (
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CLASSIFICATION_COLORS[email.classification] ?? CLASSIFICATION_COLORS.other}`}>
                            {email.classification.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        {email.from_address ?? '—'}
                      </p>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                      {formatDate(email.created_at)}
                    </span>
                  </div>
                ))}
              </div>
              {pagination && pagination.total_pages > 1 && (
                <div className="mt-4">
                  <Pagination page={page} totalPages={pagination.total_pages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add account modal */}
      <Modal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} title="Connect Email Account">
        <form onSubmit={handleSubmit((d) => addAccount(d))} className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Use an app-specific password for Gmail. Your password is encrypted with AES-256.
          </p>
          <Input label="Email address" type="email" placeholder="you@gmail.com" error={errors.email?.message} required {...register('email')} />
          <Input
            label="App password"
            type={showPassword ? 'text' : 'password'}
            placeholder="xxxx xxxx xxxx xxxx"
            error={errors.password?.message}
            required
            rightElement={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="hover:text-[var(--text)] transition-colors">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
            {...register('password')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="IMAP host" placeholder="imap.gmail.com" {...register('host')} />
            <Input label="Port" type="number" placeholder="993" {...register('port')} />
          </div>
          <Input label="Label (optional)" placeholder="Work email" {...register('label')} />
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddAccountOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addingAccount}>Connect account</Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
