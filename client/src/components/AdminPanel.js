'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { FadeIn, InputField, Button } from '@/components/ui';

export default function AdminPanel() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', user_type: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', secret_key: '' });
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    api.adminMe().then(() => { setIsAdmin(true); setAdminLoading(false); })
      .catch(() => { setIsAdmin(false); setAdminLoading(false); });
  }, []);

  useEffect(() => { if (isAdmin) loadData(); }, [tab, isAdmin]);

  const handleAdminLogin = async (e) => {
    e.preventDefault(); setError('');
    try { await api.adminLogin(adminForm); setIsAdmin(true); }
    catch (err) { setError(err.message); }
  };

  const loadData = async () => {
    try {
      setError('');
      if (tab === 'stats') setStats(await api.adminStats());
      if (tab === 'users') {
        const res = await api.adminUsers();
        // Filter out admin from user list
        const filtered = (res.data || res).filter(u => u.email !== 'smdtarik1244@gmail.com');
        setUsers(filtered);
      }
      if (tab === 'apps') {
        const res = await api.adminApps();
        setAllApps(res.data || res);
      }
    } catch (err) { setError(err.message); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try { await api.adminCreateUser(newUser); setNewUser({ name: '', email: '', password: '', user_type: '' }); setShowAdd(false); loadData(); }
    catch (err) { setError(err.message); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const body = {};
    if (editUser.name) body.name = editUser.name;
    if (editUser.email) body.email = editUser.email;
    if (editUser.password) body.password = editUser.password;
    if (editUser.user_type) body.user_type = editUser.user_type;
    if (editUser.is_active !== undefined) body.is_active = editUser.is_active;
    try { await api.adminUpdateUser(editUser.id, body); setEditUser(null); loadData(); }
    catch (err) { setError(err.message); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user and ALL their data? This cannot be undone.')) return;
    try { await api.adminDeleteUser(id); loadData(); } catch (err) { setError(err.message); }
  };

  const handleToggleUser = async (id) => {
    try { await api.adminToggleUser(id); loadData(); } catch (err) { setError(err.message); }
  };

  const handleDeleteApp = async (id) => {
    if (!confirm('Delete this application?')) return;
    try { await api.adminDeleteApp(id); loadData(); } catch (err) { setError(err.message); }
  };

  const handleUpdateAppStatus = async (id, status) => {
    try { await api.adminUpdateApp(id, { status }); loadData(); } catch {}
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredApps = allApps.filter(a =>
    a.company?.toLowerCase().includes(search.toLowerCase()) ||
    a.role?.toLowerCase().includes(search.toLowerCase()) ||
    a.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {adminLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !isAdmin ? (
        <FadeIn>
          <div className="max-w-sm mx-auto card">
            <h2 className="text-lg font-semibold mb-1">⚙️ Admin Login</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-5">Enter admin credentials to access the panel</p>
            {error && <p className="text-xs text-[var(--danger)] p-2.5 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-3">{error}</p>}
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <InputField label="Email" type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
              <InputField label="Password" type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required />
              <InputField label="Secret Key" type="password" value={adminForm.secret_key} onChange={e => setAdminForm({...adminForm, secret_key: e.target.value})} required />
              <Button variant="primary" type="submit" className="w-full">Login as Admin</Button>
            </form>
          </div>
        </FadeIn>
      ) : (
      <>
      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1.5 w-fit">
        {[{k:'stats',l:'📊 Overview'},{k:'users',l:'👥 Users'},{k:'apps',l:'📋 Applications'}].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${tab === t.k ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--input)]'}`}>{t.l}</button>
        ))}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-[var(--danger)]/10 text-sm text-[var(--danger)] border border-[var(--danger)]/20">{error}
          <button onClick={() => setError('')} className="ml-2 font-bold">✕</button>
        </motion.div>
      )}

      {/* Stats */}
      {tab === 'stats' && stats && (
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} color="var(--primary)" />
            <StatCard label="Active Users" value={stats.activeUsers} color="var(--success)" />
            <StatCard label="Applications" value={stats.totalApps} color="var(--accent)" />
            <StatCard label="Emails" value={stats.totalEmails} color="var(--warning, #fbbf24)" />
            <StatCard label="Resumes" value={stats.totalResumes} color="var(--info, #38bdf8)" />
          </div>

          {stats.statusBreakdown?.length > 0 && (
            <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-sm">Application Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.statusBreakdown.map((s, i) => (
                  <div key={i} className="bg-[var(--input)] rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{s.count}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] capitalize">{s.status?.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.recentSignups?.length > 0 && (
            <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-sm">Recent Signups</h3>
              <div className="space-y-2">
                {stats.recentSignups.filter(u => u.email !== 'smdtarik1244@gmail.com').map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--input)]">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FadeIn>
      )}

      {/* Users */}
      {tab === 'users' && (
        <FadeIn>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-sm">👥 All Users ({filteredUsers.length})</h3>
              <div className="flex gap-2 items-center">
                <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-[36px] px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] w-[200px] placeholder:text-[var(--text-secondary)]" />
                <Button variant="primary" className="text-xs h-[36px]" onClick={() => setShowAdd(!showAdd)}>+ Add User</Button>
              </div>
            </div>

            {showAdd && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 rounded-xl bg-[var(--input)] border border-[var(--border)]">
                <InputField placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                <InputField placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                <InputField type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                <select value={newUser.user_type} onChange={e => setNewUser({...newUser, user_type: e.target.value})}
                  className="h-[42px] px-3 text-sm rounded-[10px] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none">
                  <option value="">Type</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                </select>
                <div className="flex gap-2">
                  <Button variant="primary" type="submit" className="flex-1">Create</Button>
                  <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>✕</Button>
                </div>
              </motion.form>
            )}

            {editUser && (
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5">
                <InputField placeholder="Name" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} />
                <InputField placeholder="Email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} />
                <InputField type="password" placeholder="New password (optional)" value={editUser.password || ''} onChange={e => setEditUser({...editUser, password: e.target.value})} />
                <select value={editUser.user_type || ''} onChange={e => setEditUser({...editUser, user_type: e.target.value})}
                  className="h-[42px] px-3 text-sm rounded-[10px] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none">
                  <option value="">Type</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                </select>
                <div className="flex gap-2 self-end">
                  <Button variant="primary" type="submit">Save</Button>
                  <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
                </div>
              </motion.form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Apps</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Joined</th><th className="pb-3 font-medium text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--input)] transition-colors">
                      <td className="py-3 font-medium">{u.name}</td>
                      <td className="py-3 text-[var(--text-secondary)] text-xs">{u.email}</td>
                      <td className="py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] capitalize">{u.user_type || '-'}</span></td>
                      <td className="py-3"><span className="text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full">{u.app_count}</span></td>
                      <td className="py-3">
                        <button onClick={() => handleToggleUser(u.id)}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${u.is_active ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditUser({ id: u.id, name: u.name, email: u.email, user_type: u.user_type || '', password: '' })} className="text-xs px-2 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 cursor-pointer transition-colors">Edit</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 cursor-pointer transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan="7" className="py-8 text-center text-[var(--text-secondary)] text-sm">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Applications */}
      {tab === 'apps' && (
        <FadeIn>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-sm">📋 All Applications ({filteredApps.length})</h3>
              <input type="text" placeholder="Search company, role, user..." value={search} onChange={e => setSearch(e.target.value)}
                className="h-[36px] px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] w-[250px] placeholder:text-[var(--text-secondary)]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="pb-3 font-medium">User</th><th className="pb-3 font-medium">Company</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Platform</th><th className="pb-3 font-medium text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr key={app.id} className="border-b border-[var(--border)] hover:bg-[var(--input)] transition-colors">
                      <td className="py-3 text-xs">{app.user_name}</td>
                      <td className="py-3 font-medium">{app.company}</td>
                      <td className="py-3 text-[var(--text-secondary)]">{app.role}</td>
                      <td className="py-3">
                        <select value={app.status} onChange={e => handleUpdateAppStatus(app.id, e.target.value)}
                          className="text-xs py-1 px-2 rounded-md bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none cursor-pointer">
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] text-xs">{app.platform || '-'}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDeleteApp(app.id)} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 cursor-pointer transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredApps.length === 0 && (
                    <tr><td colSpan="6" className="py-8 text-center text-[var(--text-secondary)] text-sm">No applications found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}
      </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-1">{label}</p>
    </div>
  );
}
