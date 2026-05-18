import type { ReactNode } from 'react';

export default function PageShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <main className="shell-main space-y-6">
      <section className="card hero">
        {eyebrow ? <div className="kicker">{eyebrow}</div> : null}
        <h1 className="section-title mt-2">{title}</h1>
      </section>
      {children}
    </main>
  );
}
