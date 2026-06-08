'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SidebarItem, FadeIn } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import KanbanBoard from '@/components/KanbanBoard';
import EmailClassifier from '@/components/EmailClassifier';
import ResumeMatch from '@/components/ResumeMatch';
import InterviewPrep from '@/components/InterviewPrep';
import Analytics from '@/components/Analytics';
import AdminPanel from '@/components/AdminPanel';
import AddApplication from '@/components/AddApplication';
import StreakGoals from '@/components/StreakGoals';
import InterviewCalendar from '@/components/InterviewCalendar';
import Reminders from '@/components/Reminders';
import ActivityFeed from '@/components/ActivityFeed';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'board', icon: '📋', label: 'Applications' },
  { id: 'email', icon: '📧', label: 'Email AI' },
  { id: 'resume', icon: '📄', label: 'Resume Match' },
  { id: 'interview', icon: '🎓', label: 'Interview Prep' },
  { id: 'calendar', icon: '📅', label: 'Interviews' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
  { id: 'goals', icon: '🎯', label: 'Goals & Streak' },
  { id: 'reminders', icon: '🔔', label: 'Reminders' },
  { id: 'activity', icon: '📜', label: 'Activity' },
  { id: 'admin', icon: '⚙️', label: 'Admin' },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apps, setApps] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [streak, setStreak] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);

  useEffect(() => {
    api.me().then(d => { setUser(d.user); loadApps(); loadDashData(); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  const loadApps = (params = '') => {
    const searchParam = search ? `search=${search}` : '';
    const fullParams = [searchParam, params].filter(Boolean).join('&');
    api.getApps(fullParams).then(d => {
      setApps(Array.isArray(d) ? d : d.data || []);
    }).catch(() => {});
  };

  const loadDashData = () => {
    api.getStreak().then(setStreak).catch(() => {});
    api.weeklyReport().then(setWeeklyReport).catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    loadApps();
    if (search.length >= 1) {
      api.search(search).then(setSearchResults).catch(() => setSearchResults(null));
    } else {
      setSearchResults(null);
    }
  }, [search]);

  const handleLogout = async () => { await api.logout(); router.push('/login'); };

  const handleExport = async () => {
    const res = await api.exportCsv();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'applications.csv'; a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = {
    total: apps.length,
    interviews: apps.filter(a => a.status === 'interview').length,
    offers: apps.filter(a => a.status === 'offer').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 64 }}
        className="fixed left-0 top-0 h-full bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col z-30 overflow-hidden"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs shrink-0">C</div>
          {sidebarOpen && <span className="font-bold text-sm truncate">Career Copilot</span>}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <SidebarItem key={item.id} icon={item.icon} label={sidebarOpen ? item.label : ''} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--primary)] shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user?.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => router.push('/profile')} className="flex-1 text-[10px] py-1.5 rounded-md bg-[var(--input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer">Profile</button>
              <button onClick={handleLogout} className="flex-1 text-[10px] py-1.5 rounded-md bg-[var(--input)] border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer">Logout</button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'ml-[240px]' : 'ml-[64px]'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)] px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--input)] text-base cursor-pointer transition-colors">☰</button>
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">🔍</span>
              <input
                className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)] transition-colors"
                placeholder="Search everything..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              {searchFocused && searchResults && (searchResults.applications?.length > 0 || searchResults.emails?.length > 0 || searchResults.resumes?.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-50 max-h-[320px] overflow-y-auto p-2">
                  {searchResults.applications?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-[var(--text-secondary)] px-2 py-1 uppercase">Applications ({searchResults.applications.length})</p>
                      {searchResults.applications.map(a => (
                        <button key={a.id} onClick={() => { setSearch(''); setActiveTab('board'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                          <p className="text-sm font-medium">{a.company}</p>
                          <p className="text-[11px] text-[var(--text-secondary)]">{a.role} • {a.status}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.emails?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-[var(--text-secondary)] px-2 py-1 uppercase">Emails ({searchResults.emails.length})</p>
                      {searchResults.emails.map(e => (
                        <button key={e.id} onClick={() => { setSearch(''); setActiveTab('email'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                          <p className="text-sm font-medium">{e.subject || 'No subject'}</p>
                          <p className="text-[11px] text-[var(--text-secondary)]">{e.classification}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.resumes?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-secondary)] px-2 py-1 uppercase">Resumes ({searchResults.resumes.length})</p>
                      {searchResults.resumes.map(r => (
                        <button key={r.id} onClick={() => { setSearch(''); setActiveTab('resume'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                          <p className="text-sm font-medium">{r.filename}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {streak && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] font-medium">
                🔥 {streak.current_streak} day streak
              </span>
            )}
            <ThemeToggle />
            <button onClick={handleExport} className="h-9 px-4 text-xs rounded-xl bg-[var(--input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors cursor-pointer font-medium">📥 Export</button>
            <button onClick={() => setActiveTab('board')} className="h-9 px-5 text-xs rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--accent-h)] transition-colors cursor-pointer shadow-sm shadow-[var(--primary)]/20">+ New App</button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FadeIn>
                  <h1 className="text-xl font-bold mb-1">Hi, {user?.name} 👋</h1>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">Your job search overview</p>
                </FadeIn>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Applied', value: stats.total, icon: '📊', color: 'var(--primary)' },
                    { label: 'Interviews', value: stats.interviews, icon: '🎯', color: 'var(--success)' },
                    { label: 'Offers', value: stats.offers, icon: '🏆', color: 'var(--warning)' },
                    { label: 'Rejected', value: stats.rejected, icon: '❌', color: 'var(--danger)' },
                  ].map((stat, i) => (
                    <FadeIn key={i} delay={i * 0.05}>
                      <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{stat.icon}</span>
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `color-mix(in srgb, ${stat.color} 10%, transparent)`, color: stat.color }}>{stat.label}</span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>

                {/* Weekly Report */}
                {weeklyReport && (
                  <FadeIn delay={0.2}>
                    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] mb-6">
                      <h3 className="text-sm font-semibold mb-4">📊 This Week</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        {[
                          { l: 'Applied', v: weeklyReport.applied },
                          { l: 'Responses', v: weeklyReport.responses },
                          { l: 'Interviews', v: weeklyReport.interviews },
                          { l: 'Offers', v: weeklyReport.offers },
                          { l: 'Active', v: weeklyReport.totalActive },
                          { l: 'Overdue', v: weeklyReport.overdueReminders, danger: true },
                        ].map((s, i) => (
                          <div key={i} className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                            <p className={`text-xl font-bold ${s.danger && s.v > 0 ? 'text-[var(--danger)]' : ''}`}>{s.v}</p>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{s.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                )}

                {/* Recent applications */}
                <FadeIn delay={0.3}>
                  <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Recent Applications</h3>
                      <button onClick={() => setActiveTab('board')} className="text-xs text-[var(--primary)] hover:underline cursor-pointer">View all →</button>
                    </div>
                    {apps.length === 0 ? (
                      <p className="text-[var(--text-secondary)] text-sm py-8 text-center">No applications yet. Start tracking!</p>
                    ) : (
                      <div className="space-y-2">
                        {apps.slice(0, 8).map(app => (
                          <div key={app.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--primary)]/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                                {app.company?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{app.company}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{app.role} {app.platform && `• ${app.platform}`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              {app.priority === 'high' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] font-medium">High</span>}
                              {app.days_since != null && <span className="text-[11px] text-[var(--text-secondary)]">{app.days_since}d</span>}
                              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                                app.status === 'offer' ? 'bg-emerald-500/10 text-emerald-400' :
                                app.status === 'interview' ? 'bg-purple-500/10 text-purple-400' :
                                app.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                app.status === 'withdrawn' ? 'bg-gray-500/10 text-gray-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>{app.status?.replace('_', ' ')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FadeIn>
              </motion.div>
            )}

            {activeTab === 'board' && (
              <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AddApplication onAdded={loadApps} />
                <KanbanBoard apps={apps} onUpdate={loadApps} />
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <EmailClassifier onClassified={loadApps} />
              </motion.div>
            )}

            {activeTab === 'resume' && (
              <motion.div key="resume" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ResumeMatch apps={apps} />
              </motion.div>
            )}

            {activeTab === 'interview' && (
              <motion.div key="interview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <InterviewPrep apps={apps} />
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <InterviewCalendar apps={apps} />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Analytics />
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div key="goals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <StreakGoals />
              </motion.div>
            )}

            {activeTab === 'reminders' && (
              <motion.div key="reminders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Reminders />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ActivityFeed />
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AdminPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
