'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button, Modal } from '@/components/ui';

const STATUSES = ['applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn'];
const STATUS_META = {
  applied: { label: 'Applied', color: '#6366f1', icon: '📤' },
  under_review: { label: 'Under Review', color: '#f59e0b', icon: '👀' },
  interview: { label: 'Interview', color: '#8b5cf6', icon: '🎯' },
  offer: { label: 'Offer', color: '#10b981', icon: '🏆' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: '❌' },
  withdrawn: { label: 'Withdrawn', color: '#6b7280', icon: '🚫' },
};

export default function KanbanBoard({ apps, onUpdate }) {
  const [dragging, setDragging] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState('applied_date');
  const [sortDir, setSortDir] = useState('desc');
  const [tablePage, setTablePage] = useState(1);
  const [editingApp, setEditingApp] = useState(null);
  const tablePageSize = 10;

  const handleDrop = async (status) => {
    if (!dragging) return;
    await api.updateApp(dragging, { status });
    setDragging(null);
    onUpdate();
  };

  const handlePredict = async (id) => {
    setLoadingId(id);
    try { setPrediction(await api.predictApp(id)); } catch {}
    setLoadingId(null);
  };

  const handleFollowUp = async (id) => {
    setLoadingId(id);
    try { setFollowUp(await api.followUp(id)); } catch {}
    setLoadingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return;
    await api.deleteApp(id);
    onUpdate();
  };

  const handleViewDetail = async (id) => {
    try { setDetail(await api.getApp(id)); } catch {}
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;
    await api.bulkUpdateStatus({ ids: selectedIds, status });
    setSelectedIds([]);
    setBulkMode(false);
    onUpdate();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} applications?`)) return;
    await api.bulkDelete({ ids: selectedIds });
    setSelectedIds([]);
    setBulkMode(false);
    onUpdate();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleInlineEdit = async (id, field, value) => {
    await api.updateApp(id, { [field]: value });
    onUpdate();
    setEditingApp(null);
  };

  // Table view data
  const filteredApps = apps.filter(a =>
    a.company?.toLowerCase().includes(tableSearch.toLowerCase()) ||
    a.role?.toLowerCase().includes(tableSearch.toLowerCase()) ||
    a.platform?.toLowerCase().includes(tableSearch.toLowerCase()) ||
    a.status?.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const sortedApps = [...filteredApps].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    if (sortField === 'days_since') { aVal = a.days_since || 0; bVal = b.days_since || 0; }
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedApps.length / tablePageSize);
  const pagedApps = sortedApps.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-[10px]">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
  );

  return (
    <>
      {/* View Toggle + Bulk actions */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex bg-[var(--input)] border border-[var(--border)] rounded-lg p-0.5">
          <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer transition-colors ${viewMode === 'kanban' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>📋 Kanban</button>
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>📊 Table</button>
        </div>

        {viewMode === 'kanban' && (
          <>
            <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds([]); }}
              className={`btn text-sm ${bulkMode ? 'btn-primary' : 'btn-secondary'}`}>
              {bulkMode ? `✓ ${selectedIds.length} selected` : '☑ Bulk Select'}
            </button>
            {bulkMode && selectedIds.length > 0 && (
              <>
                <select onChange={e => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = ''; }}
                  className="text-xs h-9 px-3 rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] cursor-pointer">
                  <option value="">Move to...</option>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
                <button onClick={handleBulkDelete} className="btn btn-danger text-sm">Delete Selected</button>
              </>
            )}
          </>
        )}

        {viewMode === 'table' && (
          <input
            type="text" placeholder="Search company, role, status..."
            value={tableSearch} onChange={e => { setTableSearch(e.target.value); setTablePage(1); }}
            className="h-9 px-3 text-sm rounded-lg bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] w-64 placeholder:text-[var(--text-secondary)]"
          />
        )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('company')}>Company<SortIcon field="company" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('role')}>Role<SortIcon field="role" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('status')}>Status<SortIcon field="status" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('platform')}>Platform<SortIcon field="platform" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('priority')}>Priority<SortIcon field="priority" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('applied_date')}>Applied<SortIcon field="applied_date" /></th>
                <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('days_since')}>Days<SortIcon field="days_since" /></th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedApps.map(app => (
                <tr key={app.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="py-3 font-medium">{app.company}</td>
                  <td className="py-3 text-[var(--text-secondary)]">{app.role}</td>
                  <td className="py-3">
                    <select value={app.status} onChange={e => handleInlineEdit(app.id, 'status', e.target.value)}
                      className={`text-xs py-1 px-2 rounded-full border-none outline-none cursor-pointer font-medium ${
                        app.status === 'offer' ? 'bg-emerald-500/10 text-emerald-400' :
                        app.status === 'interview' ? 'bg-purple-500/10 text-purple-400' :
                        app.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        app.status === 'withdrawn' ? 'bg-gray-500/10 text-gray-400' :
                        app.status === 'under_review' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                  </td>
                  <td className="py-3 text-xs text-[var(--text-secondary)]">{app.platform || '—'}</td>
                  <td className="py-3">
                    <select value={app.priority} onChange={e => handleInlineEdit(app.id, 'priority', e.target.value)}
                      className={`text-xs py-1 px-2 rounded-full border-none outline-none cursor-pointer font-medium ${
                        app.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                        app.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                  <td className="py-3 text-xs text-[var(--text-secondary)]">{app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '—'}</td>
                  <td className="py-3"><span className={`text-xs font-medium ${app.days_since > 30 ? 'text-[var(--danger)]' : app.days_since > 14 ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]'}`}>{app.days_since}d</span></td>
                  <td className="py-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => handleViewDetail(app.id)} className="text-xs px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] cursor-pointer">View</button>
                      <button onClick={() => handlePredict(app.id)} className="text-xs px-2 py-1 rounded-md bg-[var(--info)]/10 text-[var(--info)] cursor-pointer">{loadingId === app.id ? '...' : '🔮'}</button>
                      <button onClick={() => handleDelete(app.id)} className="text-xs px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] cursor-pointer">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedApps.length === 0 && (
                <tr><td colSpan="8" className="py-8 text-center text-[var(--text-secondary)]">No applications found</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)]">{sortedApps.length} total • Page {tablePage} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={tablePage <= 1} onClick={() => setTablePage(p => p - 1)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border)] disabled:opacity-40 cursor-pointer">← Prev</button>
                <button disabled={tablePage >= totalPages} onClick={() => setTablePage(p => p + 1)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border)] disabled:opacity-40 cursor-pointer">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
      <>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATUSES.map(status => {
          const meta = STATUS_META[status];
          const items = apps.filter(a => a.status === status);
          return (
            <div key={status}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(status)}
              className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 min-h-[350px]"
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-base">{meta.icon}</span>
                <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                <span className="ml-auto text-[10px] bg-[var(--border)] rounded-full px-2 py-0.5 font-medium">{items.length}</span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {items.map(app => (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable={!bulkMode}
                      onDragStart={() => setDragging(app.id)}
                      onClick={() => bulkMode ? toggleSelect(app.id) : handleViewDetail(app.id)}
                      className={`p-3 rounded-xl bg-[var(--card)] border cursor-pointer hover:border-[var(--primary)]/40 transition-all group ${
                        bulkMode && selectedIds.includes(app.id) ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)]'
                      }`}
                    >
                      <p className="font-medium text-[13px] truncate">{app.company}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{app.role}</p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {app.priority === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] font-medium">High</span>}
                        {app.work_mode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--info)]/10 text-[var(--info)]">{app.work_mode}</span>}
                        {app.tags?.map((t, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{t.name}</span>)}
                      </div>

                      {app.days_since != null && (
                        <p className={`text-[10px] mt-1.5 ${app.days_since > 30 ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>
                          {app.days_since}d ago
                        </p>
                      )}

                      {!bulkMode && (
                        <div className="flex gap-2 mt-2.5 pt-2 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); handlePredict(app.id); }} className="text-[10px] text-[var(--primary)] hover:underline">
                            {loadingId === app.id ? '...' : '🔮 Predict'}
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleFollowUp(app.id); }} className="text-[10px] text-[var(--warning)] hover:underline">📧 Follow-up</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(app.id); }} className="text-[10px] text-[var(--danger)] hover:underline ml-auto">✕</button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.company} — ${detail.role}` : ''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[var(--text-secondary)] text-xs">Status</span><p className="font-medium capitalize">{detail.status?.replace('_', ' ')}</p></div>
              <div><span className="text-[var(--text-secondary)] text-xs">Platform</span><p className="font-medium">{detail.platform || '—'}</p></div>
              <div><span className="text-[var(--text-secondary)] text-xs">Priority</span><p className="font-medium capitalize">{detail.priority}</p></div>
              <div><span className="text-[var(--text-secondary)] text-xs">Work Mode</span><p className="font-medium capitalize">{detail.work_mode || '—'}</p></div>
              <div><span className="text-[var(--text-secondary)] text-xs">Location</span><p className="font-medium">{detail.location || '—'}</p></div>
              <div><span className="text-[var(--text-secondary)] text-xs">Days Since</span><p className="font-medium">{detail.days_since}d</p></div>
              {detail.salary_expected && <div><span className="text-[var(--text-secondary)] text-xs">Expected</span><p className="font-medium">{detail.salary_expected}</p></div>}
              {detail.salary_offered && <div><span className="text-[var(--text-secondary)] text-xs">Offered</span><p className="font-medium">{detail.salary_offered}</p></div>}
              {detail.contact_person && <div><span className="text-[var(--text-secondary)] text-xs">Contact</span><p className="font-medium">{detail.contact_person}</p></div>}
              {detail.contact_email && <div><span className="text-[var(--text-secondary)] text-xs">Email</span><p className="font-medium">{detail.contact_email}</p></div>}
            </div>

            {detail.job_url && <a href={detail.job_url} target="_blank" className="text-xs text-[var(--primary)] hover:underline block">🔗 Job URL</a>}

            {detail.tags?.length > 0 && (
              <div><span className="text-[var(--text-secondary)] text-xs block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1">{detail.tags.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${t.color}20`, color: t.color }}>{t.name}</span>)}</div>
              </div>
            )}

            {detail.notes && <div><span className="text-[var(--text-secondary)] text-xs block mb-1">Notes</span><p className="text-sm p-2.5 rounded-lg bg-[var(--bg-secondary)]">{detail.notes}</p></div>}

            {detail.history?.length > 0 && (
              <div><span className="text-[var(--text-secondary)] text-xs block mb-1">Status History</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {detail.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-[var(--bg-secondary)]">
                      <span className="text-[var(--text-secondary)]">{h.from_status || '—'}</span>
                      <span>→</span>
                      <span className="font-medium">{h.to_status}</span>
                      <span className="ml-auto text-[var(--text-secondary)]">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.reminders?.length > 0 && (
              <div><span className="text-[var(--text-secondary)] text-xs block mb-1">Reminders</span>
                <div className="space-y-1">
                  {detail.reminders.map((r, i) => (
                    <div key={i} className={`text-xs p-1.5 rounded ${r.is_done ? 'bg-[var(--success)]/5 line-through' : 'bg-[var(--warning)]/5'}`}>
                      {r.title} — {new Date(r.remind_at).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Prediction Modal */}
      <Modal open={!!prediction} onClose={() => setPrediction(null)} title="🔮 AI Status Prediction">
        {prediction && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${prediction.prediction === 'active' ? 'bg-emerald-500/10 text-emerald-400' : prediction.prediction === 'cold' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                {prediction.prediction}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">Confidence: {Math.round(prediction.confidence * 100)}%</span>
            </div>
            <p className="text-sm">{prediction.reasoning}</p>
            <div className="p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
              <p className="text-xs text-[var(--primary)] font-medium">💡 Suggested Action</p>
              <p className="text-sm mt-1">{prediction.suggested_action}</p>
            </div>
            {prediction.follow_up_template && (
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] text-xs font-mono whitespace-pre-wrap">{prediction.follow_up_template}</div>
            )}
          </div>
        )}
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={!!followUp} onClose={() => setFollowUp(null)} title="📧 Follow-up Email">
        {followUp && (
          <div className="space-y-3">
            <div><p className="text-xs text-[var(--text-secondary)]">Subject</p><p className="font-medium text-sm">{followUp.subject}</p></div>
            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] text-sm whitespace-pre-wrap leading-relaxed">{followUp.body}</div>
            <Button variant="primary" className="w-full" onClick={() => { navigator.clipboard.writeText(`Subject: ${followUp.subject}\n\n${followUp.body}`); setFollowUp(null); }}>
              📋 Copy to Clipboard
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
