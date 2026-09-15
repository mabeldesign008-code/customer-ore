'use client';

import { ApiError, post } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await post('auth/admin/login', {
        email: String(fd.get('email') || '').trim(),
        password: String(fd.get('password') || ''),
        totpCode: String(fd.get('totpCode') || '').trim(),
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div>
          <div className="text-2xl font-extrabold text-ore-700">ore</div>
          <p className="mt-1 text-sm text-slate-500">Admin console · email, password, and authenticator code</p>
        </div>
        {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input name="email" type="email" required className="w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input name="password" type="password" required minLength={8} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Authenticator code</span>
          <input name="totpCode" inputMode="numeric" required pattern="\d{6}" maxLength={6} className="w-full rounded-lg border border-slate-200 px-3 py-2 tracking-widest" />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-ore-600 py-2.5 text-sm font-semibold text-white hover:bg-ore-700 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-400">Login stays closed until ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_TOTP_SECRET are set on auth.</p>
      </form>
    </div>
  );
}
