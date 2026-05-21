import type { ReactNode } from 'react';

export default function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <section className="hero-card">
        <div>
          <div className="eyebrow">KSFDC Central</div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </section>
      {children}
    </div>
  );
}
