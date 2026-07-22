'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminApi } from '@/services/api/admin.api';
import { ROUTES } from '@/constants';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === ROUTES.ADMIN_LOGIN;
  const [ready, setReady] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;
    adminApi.me()
      .then(() => setReady(true))
      .catch(() => router.replace(ROUTES.ADMIN_LOGIN));
  }, [isLoginPage, router]);

  if (!ready) return null;
  return <>{children}</>;
}
