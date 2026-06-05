'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';

export default function StreakGoals() {
  const [streak, setStreak] = useState(null);
  const [goals, setGoals] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [skillsGap, setSkillsGap] = useState(null);
  const [tab, setTab] = useState('streak');
  const [newGoal, setNewGoal] = useState({ title: '', target_count: '', period: 'weekly' });
  const [newBl, setNewBl] = useState({ company: '', reason: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    api.getStreak().then(setStreak).catch(() => {});
    api.getGoals().then(setGoals).catch(() => {});
    api.getBlacklist().then(setBlacklist).catch(() => {});
    api.suggestBlacklist().then(setSuggestions).catch(() => {});
    api.getSkillsGap().then(setSkillsGap).catch(() => {});
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.target_count) return;
    await api.createGoal({ ...newGoal, target_count: Number(newGoal.target_count) });
    setNewGoal({ title: '', target_count: '', period: 'weekly' });
    setGoals(await api.getGoals());
  };

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!newBl.company) return;
    await api.addBlacklist(newBl);
    setNewBl({ company: '', reason: '' });
    setBlacklist(await api.getBlacklist());
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">🎯 Goals & Streak</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Track your consistency and set targets</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ id: 'streak', l: '🔥 Streak' }, { id: 'goals', l: '🎯 Goals' }, { id: 'blacklist', l: '🚫 Blacklist' }, { id: 'skills', l: '📊 Skills Gap' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn text-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'streak' && streak && (
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: 'Current Streak', v: `${streak.current_streak} days`, icon: '🔥' },
              { l: 'Longest Streak', v: `${streak.longest_streak} days`, icon: '🏆' },
              { l: 'Total Days', v: streak.total_days_applied, icon: '📅' },
              { l: 'This Week', v: streak.this_week, icon: '📋' },
              { l: 'This Month', v: streak.this_month, icon: '📈' },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
                <span className="text-xl block mb-1">{s.icon}</span>
                <p className="text-lg font-bold">{s.v}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{s.l}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {tab === 'goals' && (
        <FadeIn>
          <div className="space-y-4">
            <form onSubmit={handleAddGoal} className="flex gap-2 items-end flex-wrap p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <InputField label="Goal" placeholder="e.g. Apply to 10 jobs" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} />
              <InputField label="Target" type="number" placeholder="10" value={newGoal.target_count} onChange={e => setNewGoal({...newGoal, target_count: e.target.value})} />
              <SelectDropdown label="Period" value={newGoal.period} onChange={e => setNewGoal({...newGoal, period: e.target.value})} options={['daily','weekly','monthly']} />
              <Button variant="primary" type="submit">Add</Button>
            </form>

            <div className="space-y-2">
              {goals.map(g => (
                <div key={g.id} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{g.title}</p>
                      {g.is_completed ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">✓ Done</span> : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }} className="h-full rounded-full bg-[var(--primary)]" />
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)]">{g.current_count}/{g.target_count} ({g.progress}%)</span>
                    </div>
                  </div>
                  <button onClick={async () => { await api.deleteGoal(g.id); setGoals(await api.getGoals()); }} className="text-xs text-[var(--danger)] hover:underline cursor-pointer">✕</button>
                </div>
              ))}
              {goals.length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-6">No goals set. Create one above!</p>}
            </div>
          </div>
        </FadeIn>
      )}

      {tab === 'blacklist' && (
        <FadeIn>
          <div className="space-y-4">
            {suggestions.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
                <p className="text-xs font-medium text-[var(--warning)] mb-2">⚠️ Ghosted Companies (30+ days, no response)</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={async () => { await api.addBlacklist({ company: s.company, reason: 'Ghosted - no response after 30+ days' }); loadAll(); }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--danger)] cursor-pointer transition-colors">
                      {s.company} ({s.times_ghosted}x)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddBlacklist} className="flex gap-2 items-end p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <InputField label="Company" placeholder="Company name" value={newBl.company} onChange={e => setNewBl({...newBl, company: e.target.value})} />
              <InputField label="Reason" placeholder="Why?" value={newBl.reason} onChange={e => setNewBl({...newBl, reason: e.target.value})} />
              <Button variant="danger" type="submit">Block</Button>
            </form>

            <div className="space-y-1.5">
              {blacklist.map(b => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  <div>
                    <p className="text-sm font-medium">{b.company}</p>
                    {b.reason && <p className="text-[10px] text-[var(--text-secondary)]">{b.reason}</p>}
                  </div>
                  <button onClick={async () => { await api.deleteBlacklist(b.id); setBlacklist(await api.getBlacklist()); }} className="text-xs text-[var(--danger)] cursor-pointer">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {tab === 'skills' && skillsGap && (
        <FadeIn>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-1">Skills Demand (from {skillsGap.total_jds_analyzed} JDs)</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Based on job descriptions in your applications</p>
            <div className="space-y-2">
              {skillsGap.skills?.map((s, i) => {
                const maxDemand = skillsGap.skills[0]?.demand || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-24 font-medium">{s.skill}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(s.demand / maxDemand) * 100}%` }} className="h-full rounded-full bg-[var(--primary)]" />
                    </div>
                    <span className="text-[10px] w-6 text-right">{s.demand}</span>
                    {s.in_rejections > 0 && <span className="text-[10px] text-[var(--danger)]">⚠{s.in_rejections}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
