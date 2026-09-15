'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin Error:', error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-extrabold text-red-600">Error</h1>
        <h2 className="mt-2 text-xl font-bold text-slate-800">Something went wrong!</h2>
        <p className="mt-2 text-sm text-slate-500">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="rounded-lg bg-ore-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ore-700 shadow-sm transition-all">
            Try again
          </button>
          <a href="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-all">
            Go to overview
          </a>
        </div>
      </div>
    </div>
  );
}
