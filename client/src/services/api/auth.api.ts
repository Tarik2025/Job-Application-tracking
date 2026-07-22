import { get, post, put, del } from './client';
import type {
  AuthResponse,
  User,
} from '@/types/api.types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
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
  stacks?: string[];
}

export interface UpdateProfilePayload extends Partial<Omit<RegisterPayload, 'email' | 'password'>> {
  target_days?: number;
  target_start_date?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    post<AuthResponse>('/auth/register', payload),

  logout: () =>
    post<{ message: string }>('/auth/logout'),

  me: () =>
    get<{ user: User }>('/auth/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    put<{ message: string }>('/auth/me', payload),

  changePassword: (payload: ChangePasswordPayload) =>
    put<{ message: string }>('/auth/change-password', payload),

  deleteAccount: (payload: DeleteAccountPayload) =>
    del<{ message: string }>('/auth/me', { data: payload }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    post<{ message: string }>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    post<{ message: string }>('/auth/reset-password', payload),

  checkEmail: (email: string) =>
    post<{ exists: boolean }>('/auth/check-email', { email }),
};
