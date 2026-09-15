'use client';

import { AdminProvider, useAdmin } from '@/lib/context';
import { Shell } from '@/components/shell';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function AuthGuardWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, signedOut } = useAdmin();

  // AdminProvider fetches the session on mount; this only reacts to the result.
  // `refreshUser` no longer throws — it sets `signedOut` — so the redirect is driven
  // by that flag rather than by a rejected promise.
  useEffect(() => {
    if (!loading && (signedOut || !user || user.role !== 'admin')) {
      router.replace('/login');
    }
  }, [loading, signedOut, user, router]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Checking session…</div>;
  }

  if (signedOut || !user || user.role !== 'admin') {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Redirecting to sign in…</div>;
  }

  return <Shell>{children}</Shell>;
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AuthGuardWrapper>{children}</AuthGuardWrapper>
    </AdminProvider>
  );
}
