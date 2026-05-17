import { ReactNode } from 'react';
import { Nav } from './Nav';
import { ConnectionBanner } from './ConnectionBanner';

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="container">
      <ConnectionBanner theatreId="KSFDC_SREE_TVM" />
      <div className="topbar">
        <div>
          <div className="kicker">Hybrid Booking Demo</div>
          <div className="title">{title}</div>
          <div className="subtitle">{subtitle}</div>
        </div>
        <Nav />
      </div>
      {children}
    </main>
  );
}
