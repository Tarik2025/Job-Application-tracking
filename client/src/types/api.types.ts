/**
 * Shared API response types.
 * These mirror the backend response shapes exactly.
 */

// Generic paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Generic API error shape
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// Pagination query params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  country_code?: string;
  gender?: string;
  dob?: string;
  user_type?: 'student' | 'professional';
  college?: string;
  degree?: string;
  branch?: string;
  year_of_study?: string;
  passout_year?: string;
  company?: string;
  designation?: string;
  experience?: string;
  skills?: string;
  preferred_role?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  target_days?: number;
  target_start_date?: string;
  is_active?: number;
  created_at?: string;
  stacks?: string[];
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'name'>;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export type PriorityLevel = 'low' | 'medium' | 'high';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export interface Application {
  id: number;
  user_id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  platform?: string;
  job_url?: string;
  job_description?: string;
  salary_expected?: string;
  salary_offered?: string;
  location?: string;
  work_mode?: WorkMode;
  contact_person?: string;
  contact_email?: string;
  notes?: string;
  priority: PriorityLevel;
  score?: number;
  applied_date: string;
  last_updated: string;
  response_date?: string;
  days_since?: number;
  tags?: Tag[];
}

export interface ApplicationDetail extends Omit<Application, 'notes'> {
  notes: string | null;
  history: StatusHistory[];
  notesList: NoteEntry[];
  reminders: Reminder[];
}

export interface StatusHistory {
  id: number;
  application_id: number;
  user_id: number;
  from_status?: string;
  to_status: string;
  note?: string;
  created_at: string;
}

export interface NoteEntry {
  id: number;
  application_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id?: number;
  name: string;
  color: string;
  created_at?: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  application_id?: number;
  title: string;
  remind_at: string;
  is_done: number;
  created_at: string;
  company?: string;
  role?: string;
}

export interface ApplicationsQuery extends PaginationParams {
  status?: ApplicationStatus;
  company?: string;
  platform?: string;
  priority?: PriorityLevel;
  search?: string;
  tag?: string;
  work_mode?: WorkMode;
  days_min?: number;
  days_max?: number;
}

export interface WeeklyReport {
  period: string;
  applied: number;
  responses: number;
  interviews: number;
  offers: number;
  totalActive: number;
  overdueReminders: number;
}

export interface CompanyStat {
  company: string;
  total_apps: number;
  interviews: number;
  offers: number;
  rejections: number;
  avg_response_days?: number;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface StatusPrediction {
  prediction: 'active' | 'cold' | 'likely_rejected';
  confidence: number;
  reasoning: string;
  suggested_action: string;
  follow_up_template: string;
}

export interface FollowUpEmail {
  subject: string;
  body: string;
  tone: string;
}

// ─── Emails ───────────────────────────────────────────────────────────────────

export interface EmailRecord {
  id: number;
  user_id: number;
  application_id?: number;
  subject?: string;
  from_address?: string;
  classification?: string;
  received_at?: string;
  created_at: string;
}

export interface EmailClassification {
  classification: string;
  company?: string;
  role?: string;
  suggested_status?: ApplicationStatus;
  summary?: string;
  confidence?: number;
  company_domain?: string;
  company_logo?: string;
}

export interface ClassifyEmailResponse {
  id: number;
  classification: EmailClassification;
  applicationId?: number;
  action?: string;
}

export interface EmailAccount {
  id: number;
  email: string;
  host: string;
  port: number;
  label?: string;
  last_fetched?: string;
  created_at: string;
}

// ─── Resume ───────────────────────────────────────────────────────────────────

export interface Resume {
  id: number;
  filename: string;
  skills?: string;
  uploaded_at: string;
}

export interface ResumeAnalysis {
  skills: string[];
  experience_years?: number;
  education: string[];
  contact: {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  };
  word_count: number;
  has_projects: boolean;
  has_certifications: boolean;
}

export interface ResumeMatch {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  summary: string;
  category_breakdown?: Record<string, { required: number; matched: number }>;
}

// ─── Interview ────────────────────────────────────────────────────────────────

export interface InterviewPrepSummary {
  id: number;
  application_id?: number;
  difficulty: string;
  created_at: string;
}

export interface InterviewQuestion {
  question: string;
  type: string;
  difficulty: string;
  tip: string;
}

export interface PreparationDay {
  day: number;
  focus: string;
  tasks: string[];
}

export interface InterviewPrepDetail {
  id: number;
  application_id?: number;
  user_id: number;
  questions: string; // JSON string
  topics: string;    // JSON string
  study_plan: string; // JSON string
  company_insights?: string;
  difficulty: string;
  created_at: string;
}

export interface InterviewPrepResult {
  questions: InterviewQuestion[];
  topics: string[];
  preparation_plan: PreparationDay[];
  company_insights: string;
}

export interface Interview {
  id: number;
  application_id: number;
  user_id: number;
  round_name: string;
  interview_date: string;
  interview_type?: string;
  interviewer?: string;
  meeting_link?: string;
  notes?: string;
  outcome: string;
  created_at: string;
  company?: string;
  role?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsDashboard {
  total: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgResponseDays?: number;
  fastestResponse?: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  platformBreakdown: Array<{ platform: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  monthlyApps: Array<{ month: string; count: number }>;
  workModeBreakdown: Array<{ work_mode: string; count: number }>;
  insights: {
    total: number;
    responseRate: number;
    avgResponseDays: number;
    topPlatform?: string;
    bestDay?: string;
  };
}

export interface CompanyAnalytic {
  company: string;
  total: number;
  positive: number;
  rejected: number;
  offers: number;
  first_applied: string;
  avg_days?: number;
  response_rate: number;
}

export interface TimelineEntry {
  id: number;
  application_id: number;
  user_id: number;
  from_status?: string;
  to_status: string;
  note?: string;
  created_at: string;
  company: string;
  role: string;
}

// ─── Advanced ─────────────────────────────────────────────────────────────────

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_days_applied: number;
  this_week: number;
  this_month: number;
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  goal_type: 'applications' | 'interviews' | 'follow_ups' | 'custom';
  target_count: number;
  current_count: number;
  period: 'daily' | 'weekly' | 'monthly';
  start_date?: string;
  end_date?: string;
  is_completed: number;
  created_at: string;
  progress?: number;
}

export interface BlacklistEntry {
  id: number;
  user_id: number;
  company: string;
  reason?: string;
  created_at: string;
}

export interface Document {
  id: number;
  application_id?: number;
  user_id: number;
  doc_type: string;
  title: string;
  content?: string;
  filename?: string;
  created_at: string;
  company?: string;
  role?: string;
}

export interface ActivityEntry {
  id: number;
  user_id: number;
  type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: number;
  created_at: string;
}

export interface ApplicationScore {
  id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  score: number;
  days_since: number;
}

export interface SalaryInsights {
  expected: { min?: number; max?: number; avg?: number; count: number };
  offered: { min?: number; max?: number; avg?: number; count: number };
  offers: Array<{ company: string; role: string; salary: string }>;
  total_with_salary: number;
}

export interface SkillsGap {
  total_jds_analyzed: number;
  skills: Array<{ skill: string; demand: number; in_rejections: number }>;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalApps: number;
  totalEmails: number;
  totalResumes: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  platformBreakdown: Array<{ platform: string; count: number }>;
  recentSignups: Array<Pick<User, 'id' | 'name' | 'email' | 'user_type' | 'created_at'>>;
}

export interface AdminUser extends User {
  app_count: number;
}

export interface AuditEntry {
  id: number;
  user_id?: number;
  action: string;
  entity: string;
  entity_id?: number;
  details?: string;
  ip?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResults {
  applications: Array<Pick<Application, 'id' | 'company' | 'role' | 'status' | 'platform' | 'applied_date'>>;
  emails: Array<Pick<EmailRecord, 'id' | 'subject' | 'classification' | 'created_at'>>;
  resumes: Array<Pick<Resume, 'id' | 'filename' | 'uploaded_at'>>;
  total: number;
}
