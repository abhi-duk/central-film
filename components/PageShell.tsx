'use client';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function PageShell({ children, serverLabel = 'CENTRAL ONLINE SERVER' }: { children: ReactNode; serverLabel?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.3em] text-cyan-300">{serverLabel}</div>
            <div className="text-lg font-bold">Hybrid Ticket Demo</div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/">Home</Link>
            <Link href="/book">Book</Link>
            <Link href="/policies">Policies</Link>
            <Link href="/reports">Reports</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
