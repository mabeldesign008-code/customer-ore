'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
        <h2 className="mt-2 text-xl font-bold text-slate-800">Page Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-ore-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ore-700 shadow-sm transition-colors">
          Go back to overview
        </Link>
      </div>
    </div>
  );
}
