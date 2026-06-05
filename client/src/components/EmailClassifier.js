'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';

export default function EmailClassifier({ onClassified }) {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', host: 'imap.gmail.com', label: '' });
  const [fetchResult, setFetchResult] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [emails, setEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifyEmailId, setClassifyEmailId] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');

  useEffect(() => { loadAccounts(); loadEmails(); }, []);

  const loadAccounts = () => api.getEmailAccounts().then(setAccounts).catch(() => {});
  const loadEmails = () => api.getEmails().then(setEmails).catch(() => {});

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try { await api.addEmailAccount(newAccount); setNewAccount({ email: '', password: '', host: 'imap.gmail.com', label: '' }); loadAccounts(); }
    catch (err) { alert(err.message); }
  };

  const handleRemoveAccount = async (id) => {
    if (!confirm('Remove?')) return;
    await api.removeEmailAccount(id);
    loadAccounts();
  };

  const handleFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    try { const data = await api.fetchEmails(); setFetchResult(data); loadEmails(); onClassified(); }
    catch (err) { setFetchResult({ error: err.message }); }
    finally { setFetching(false); }
  };

  const handleConfirmAdd = async () => {
    if (!classifyResult?.company) return;
    setConfirming(true);
    try {
      const res = await api.confirmClassification({
        company: classifyResult.company,
        role: classifyResult.role || 'Unknown Role',
        status: classifyResult.suggested_status || 'applied',
        received_date: receivedDate || undefined,
        email_id: classifyEmailId
      });
      if (res.action === 'created') setConfirmMsg(`✓ Added "${classifyResult.company}" to applications`);
      else if (res.action === 'updated') setConfirmMsg(`✓ Updated "${classifyResult.company}" status to ${classifyResult.suggested_status}`);
      else if (res.action === 'exists') setConfirmMsg(`ℹ "${classifyResult.company}" already exists with same status`);
      onClassified();
    } catch (err) { setConfirmMsg(`✕ ${err.message}`); }
    finally { setConfirming(false); }
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setClassifying(true);
    try {
      const data = await api.classifyEmail({ subject, body, received_date: receivedDate || undefined });
      setClassifyResult(data.classification);
      setClassifyEmailId(data.id);
      setConfirmMsg('');
      loadEmails();
    }
    catch (err) { setClassifyResult({ error: err.message }); }
    finally { setClassifying(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">📧 Email AI Classifier</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Connect accounts or paste emails for AI classification</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'accounts', icon: '🔗', label: 'Accounts' },
          { id: 'fetch', icon: '🤖', label: 'Auto-Fetch' },
          { id: 'manual', icon: '📋', label: 'Manual Paste' },
          { id: 'history', icon: '📜', label: 'History' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn text-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ACCOUNTS */}
      {tab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn>
            <div className="card">
              <h2 className="font-semibold text-lg mb-2">📬 Connect Email</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-5">
                For Gmail: Enable 2FA → <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-[var(--primary)] underline">Get App Password</a> → Use it below
              </p>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <InputField label="Email" type="email" placeholder="you@gmail.com" value={newAccount.email} onChange={e => setNewAccount({...newAccount, email: e.target.value})} icon="✉️" required />
                <InputField label="App Password" type="password" placeholder="16-char app password" value={newAccount.password} onChange={e => setNewAccount({...newAccount, password: e.target.value})} icon="🔒" required />
                <SelectDropdown label="Provider" value={newAccount.host} onChange={e => setNewAccount({...newAccount, host: e.target.value})} options={[
                  { value: 'imap.gmail.com', label: 'Gmail' },
                  { value: 'imap-mail.outlook.com', label: 'Outlook' },
                  { value: 'imap.yahoo.com', label: 'Yahoo' },
                ]} />
                <InputField label="Label (optional)" placeholder="e.g. Work Email" value={newAccount.label} onChange={e => setNewAccount({...newAccount, label: e.target.value})} />
                <Button variant="primary" className="w-full" type="submit">Connect Account</Button>
              </form>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="card">
              <h2 className="font-semibold text-lg mb-4">🔗 Connected ({accounts.length})</h2>
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm">No accounts connected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                      <div>
                        <p className="font-medium text-sm">{acc.email}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {acc.label && `${acc.label} • `}
                          {acc.last_fetched ? `Last: ${new Date(acc.last_fetched).toLocaleString()}` : 'Never fetched'}
                        </p>
                      </div>
                      <button onClick={() => handleRemoveAccount(acc.id)} className="btn btn-danger text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      )}

      {/* AUTO-FETCH */}
      {tab === 'fetch' && (
        <FadeIn>
          <div className="card max-w-2xl">
            <h2 className="font-semibold text-lg mb-2">🤖 Auto-Fetch & Classify</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Pulls job-related emails from all accounts, classifies with AI, and updates your board. Runs every 30 min automatically.
            </p>

            <Button variant="primary" className="w-full py-3" onClick={handleFetch} loading={fetching} disabled={accounts.length === 0}>
              {fetching ? 'Fetching...' : `🔄 Fetch Now (${accounts.length} account${accounts.length !== 1 ? 's' : ''})`}
            </Button>

            {accounts.length === 0 && <p className="text-xs text-[var(--warning)] mt-2 text-center">Connect an account first</p>}

            <div className="mt-4 p-3 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
              <p className="text-xs font-medium text-[var(--warning)] mb-1">⚠️ Connection Issues?</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                If you get "ECONNRESET" errors, your network (college/office/ISP) may be blocking IMAP port 993.
                Try: VPN, mobile hotspot, or use the <strong>Manual Paste</strong> tab instead.
              </p>
            </div>

            {fetchResult && (
              <div className="mt-5 p-4 rounded-xl bg-[var(--bg-secondary)]">
                {fetchResult.error ? (
                  <p className="text-[var(--danger)] text-sm">{fetchResult.error}</p>
                ) : (
                  <div>
                    <p className="text-[var(--success)] font-medium text-sm">✓ Complete</p>
                    {fetchResult.results?.map((r, i) => (
                      <div key={i} className="mt-2 text-sm">
                        <p>{r.email}: {r.error ? <span className="text-[var(--danger)]">{r.error}</span> : <span className="text-[var(--success)]">{r.fetched} emails classified</span>}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* MANUAL */}
      {tab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn>
            <div className="card">
              <h2 className="font-semibold text-lg mb-4">📋 Paste Email</h2>
              <form onSubmit={handleClassify} className="space-y-4">
                <InputField label="Subject" placeholder="Email subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
                <InputField label="Email Received Date" type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] ml-1 block mb-1.5">Email Body</label>
                  <textarea className="input-field min-h-[180px]" placeholder="Paste email content..." value={body} onChange={e => setBody(e.target.value)} required />
                </div>
                <Button variant="primary" className="w-full py-3" loading={classifying} type="submit">🤖 Classify</Button>
              </form>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="card">
              <h2 className="font-semibold text-lg mb-4">📊 Result</h2>
              {classifyResult ? (
                classifyResult.error ? <p className="text-[var(--danger)]">{classifyResult.error}</p> : (
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Type</span><span className="badge bg-[var(--primary)]/10 text-[var(--primary)]">{classifyResult.classification}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Company</span><span className="font-medium text-sm">{classifyResult.company || '—'}{classifyResult.company_domain && <span className="text-xs text-[var(--text-secondary)] ml-1">({classifyResult.company_domain})</span>}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Role</span><span className="font-medium text-sm">{classifyResult.role || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Status</span><span className="font-medium text-sm capitalize">{classifyResult.suggested_status || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Date</span><span className="font-medium text-sm">{receivedDate || new Date().toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-secondary)] text-sm">Confidence</span><span className="font-medium text-sm">{Math.round((classifyResult.confidence || 0) * 100)}%</span></div>
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-sm">{classifyResult.summary}</div>

                    {/* Confirm Add Button */}
                    {classifyResult.company && (
                      <div className="pt-3 border-t border-[var(--border)]">
                        {confirmMsg ? (
                          <p className={`text-sm font-medium ${confirmMsg.startsWith('✕') ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>{confirmMsg}</p>
                        ) : (
                          <Button variant="primary" className="w-full" onClick={handleConfirmAdd} loading={confirming}>
                            ✓ Add to Applications
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-secondary)]">
                  <span className="text-3xl mb-2">🤖</span>
                  <p className="text-sm">Paste an email to classify</p>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <FadeIn>
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">📜 Email History ({emails.length})</h2>
            {emails.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">No emails classified yet</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {emails.map(email => {
                  const data = email.extracted_data ? JSON.parse(email.extracted_data) : {};
                  return (
                    <div key={email.id} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/20 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{email.subject || 'No subject'}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {data.company && `${data.company}`}{data.role && ` • ${data.role}`} • {new Date(email.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="badge bg-[var(--primary)]/10 text-[var(--primary)]">{email.classification}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
