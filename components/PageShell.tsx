export default function PageShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Central Server</div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
