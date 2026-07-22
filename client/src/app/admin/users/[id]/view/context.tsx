'use client';

import { createContext, useContext } from 'react';
import type { AdminUser } from '@/types/api.types';

interface AdminUserContextValue {
  userId: number;
  user: AdminUser | null;
}

export const AdminUserContext = createContext<AdminUserContextValue>({ userId: 0, user: null });

export function useAdminUser() {
  return useContext(AdminUserContext);
}
