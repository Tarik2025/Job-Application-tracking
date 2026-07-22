import { get } from './client';
import type {
  AnalyticsDashboard,
  CompanyAnalytic,
  TimelineEntry,
  SalaryInsights,
  SkillsGap,
  Application,
} from '@/types/api.types';

export const analyticsApi = {
  dashboard: () =>
    get<AnalyticsDashboard>('/analytics'),

  companies: () =>
    get<CompanyAnalytic[]>('/analytics/companies'),

  timeline: () =>
    get<TimelineEntry[]>('/analytics/timeline'),

  salary: () =>
    get<SalaryInsights>('/advanced/salary'),

  skillsGap: () =>
    get<SkillsGap>('/advanced/skills-gap'),

  compareOffers: () =>
    get<Application[]>('/advanced/compare-offers'),
};
