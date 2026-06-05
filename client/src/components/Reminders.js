'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FadeIn, InputField, Button } from '@/components/ui';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState({ title: '', remind_at: '' });

  useEffect(() => { load(); }, [showDone]);
  const load = () => api.getReminders(showDone).then(setReminders).catch(() => {});

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.remind_at) return;
    await api.createReminder(form);
    setForm({ title: '', remind_at: '' });
    load();
  };

  const overdue = reminders.filter(r => !r.is_done && new Date(r.remind_at) < new Date());
  const upcoming = reminders.filter(r => !r.is_done && new Date(r.remind_at) >= new Date());
  const done = reminders.filter(r => r.is_done);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">🔔 Reminders</h2>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="rounded" />
          Show completed
        </label>
      </div>

      {/* Add */}
      <form onSubmit={handleAdd} className="flex gap-2 items-end p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <InputField label="Reminder" placeholder="Follow up with..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        <InputField label="When" type="datetime-local" value={form.remind_at} onChange={e => setForm({...form, remind_at: e.target.value})} />
        <Button variant="primary" type="submit">Add</Button>
      </form>

      {/* Overdue */}
      {overdue.length > 0 && (
        <FadeIn>
          <div className="p-4 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20">
            <h3 className="text-xs font-semibold text-[var(--danger)] mb-2">⚠️ Overdue ({overdue.length})</h3>
            <div className="space-y-1.5">
              {overdue.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-[10px] text-[var(--danger)]">{r.company && `${r.company} • `}{new Date(r.remind_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={async () => { await api.doneReminder(r.id); load(); }} className="text-xs px-2 py-1 rounded-md bg-[var(--success)]/10 text-[var(--success)] cursor-pointer">Done</button>
                    <button onClick={async () => { await api.deleteReminder(r.id); load(); }} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Upcoming */}
      <FadeIn delay={0.1}>
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-xs font-semibold mb-2">Upcoming ({upcoming.length})</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No upcoming reminders</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-secondary)]">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{r.company && `${r.company} • `}{new Date(r.remind_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={async () => { await api.doneReminder(r.id); load(); }} className="text-xs px-2 py-1 rounded-md bg-[var(--success)]/10 text-[var(--success)] cursor-pointer">Done</button>
                    <button onClick={async () => { await api.deleteReminder(r.id); load(); }} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Done */}
      {showDone && done.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-xs font-semibold mb-2 text-[var(--success)]">✓ Completed ({done.length})</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {done.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] opacity-60">
                  <p className="text-xs line-through">{r.title}</p>
                  <button onClick={async () => { await api.deleteReminder(r.id); load(); }} className="text-[10px] text-[var(--danger)] cursor-pointer">✕</button>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
