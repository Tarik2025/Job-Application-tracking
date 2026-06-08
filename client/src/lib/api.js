const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (res.headers.get('content-type')?.includes('text/csv')) return res;
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !path.includes('/auth/login') && !path.includes('/admin/')) {
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccount: (body) => request('/auth/me', { method: 'DELETE', body: JSON.stringify(body) }),
  checkEmail: (email) => request('/auth/check-email', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Applications (paginated)
  getApps: (params = '') => request(`/applications${params ? '?' + params : ''}`),
  getApp: (id) => request(`/applications/${id}`),
  createApp: (body) => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  updateApp: (id, body) => request(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteApp: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
  bulkUpdateStatus: (body) => request('/applications/bulk/status', { method: 'PATCH', body: JSON.stringify(body) }),
  bulkDelete: (body) => request('/applications/bulk/delete', { method: 'POST', body: JSON.stringify(body) }),
  addNote: (id, body) => request(`/applications/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  predictApp: (id) => request(`/applications/${id}/predict`),
  followUp: (id) => request(`/applications/${id}/follow-up`),
  exportCsv: () => fetch(`${BASE}/applications/export`, { credentials: 'include' }),
  weeklyReport: () => request('/applications/report/weekly'),
  companyStats: () => request('/applications/companies/stats'),

  // Tags
  getTags: () => request('/applications/tags/list'),
  createTag: (body) => request('/applications/tags', { method: 'POST', body: JSON.stringify(body) }),
  deleteTag: (id) => request(`/applications/tags/${id}`, { method: 'DELETE' }),

  // Reminders
  getReminders: (showDone) => request(`/applications/reminders/list${showDone ? '?show_done=1' : ''}`),
  createReminder: (body) => request('/applications/reminders', { method: 'POST', body: JSON.stringify(body) }),
  doneReminder: (id) => request(`/applications/reminders/${id}/done`, { method: 'PATCH' }),
  deleteReminder: (id) => request(`/applications/reminders/${id}`, { method: 'DELETE' }),

  // Emails
  getEmailAccounts: () => request('/emails/accounts'),
  addEmailAccount: (body) => request('/emails/accounts', { method: 'POST', body: JSON.stringify(body) }),
  removeEmailAccount: (id) => request(`/emails/accounts/${id}`, { method: 'DELETE' }),
  fetchEmails: () => request('/emails/fetch', { method: 'POST' }),
  classifyEmail: (body) => request('/emails/classify', { method: 'POST', body: JSON.stringify(body) }),
  confirmClassification: (body) => request('/emails/classify/confirm', { method: 'POST', body: JSON.stringify(body) }),
  getEmails: () => request('/emails'),

  // Colleges & Stacks
  searchColleges: (q = '') => request(`/colleges?q=${q}`),
  addCollege: (name) => request('/colleges', { method: 'POST', body: JSON.stringify({ name }) }),
  getStacks: () => request('/stacks'),
  addStack: (name) => request('/stacks', { method: 'POST', body: JSON.stringify({ name }) }),

  // Resume
  uploadResume: (formData) => fetch(`${BASE}/resumes/upload`, { method: 'POST', body: formData, credentials: 'include' }).then(r => r.json()),
  matchResume: (body) => request('/resumes/match', { method: 'POST', body: JSON.stringify(body) }),
  getResumes: () => request('/resumes'),
  analyzeResume: (id) => request(`/resumes/${id}/analyze`),

  // Interview
  generatePrep: (body) => request('/interview/generate', { method: 'POST', body: JSON.stringify(body) }),
  getInterviewPreps: () => request('/interview'),

  // Analytics
  getAnalytics: () => request('/analytics'),
  getCompanyAnalytics: () => request('/analytics/companies'),
  getTimeline: () => request('/analytics/timeline'),

  // Advanced
  getScores: () => request('/advanced/scores'),
  getStreak: () => request('/advanced/streak'),
  getBlacklist: () => request('/advanced/blacklist'),
  addBlacklist: (body) => request('/advanced/blacklist', { method: 'POST', body: JSON.stringify(body) }),
  deleteBlacklist: (id) => request(`/advanced/blacklist/${id}`, { method: 'DELETE' }),
  checkBlacklist: (company) => request(`/advanced/blacklist/check?company=${company}`),
  suggestBlacklist: () => request('/advanced/blacklist/suggest'),
  getInterviews: (upcoming) => request(`/advanced/interviews${upcoming ? '?upcoming=1' : ''}`),
  createInterview: (body) => request('/advanced/interviews', { method: 'POST', body: JSON.stringify(body) }),
  updateInterview: (id, body) => request(`/advanced/interviews/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getDocuments: (params = '') => request(`/advanced/documents${params ? '?' + params : ''}`),
  createDocument: (body) => request('/advanced/documents', { method: 'POST', body: JSON.stringify(body) }),
  deleteDocument: (id) => request(`/advanced/documents/${id}`, { method: 'DELETE' }),
  getActivity: (params = '') => request(`/advanced/activity${params ? '?' + params : ''}`),
  getGoals: () => request('/advanced/goals'),
  createGoal: (body) => request('/advanced/goals', { method: 'POST', body: JSON.stringify(body) }),
  deleteGoal: (id) => request(`/advanced/goals/${id}`, { method: 'DELETE' }),
  getSalaryInsights: () => request('/advanced/salary'),
  compareOffers: () => request('/advanced/compare-offers'),
  getSkillsGap: () => request('/advanced/skills-gap'),

  // Search
  search: (q) => request(`/search?q=${q}`),

  // Admin
  adminLogin: (body) => request('/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogout: () => request('/admin/logout', { method: 'POST' }),
  adminMe: () => request('/admin/me'),
  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  adminCreateUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminToggleUser: (id) => request(`/admin/users/${id}/toggle`, { method: 'PATCH' }),
  adminApps: (params = '') => request(`/admin/applications${params ? '?' + params : ''}`),
  adminUpdateApp: (id, body) => request(`/admin/applications/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteApp: (id) => request(`/admin/applications/${id}`, { method: 'DELETE' }),
  adminEmails: () => request('/admin/emails'),
};
