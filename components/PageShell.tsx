
import { ReactNode } from 'react';
import ConnectionBanner from './ConnectionBanner';

export default function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ConnectionBanner theatreId="KSFDC_SREE_TVM" />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Central Online Server</div>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-2 text-slate-300">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
