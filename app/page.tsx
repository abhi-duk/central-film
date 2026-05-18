import Link from 'next/link';
import ConnectionBanner from '../components/ConnectionBanner';
import { markTimedOutTheatres, readMysqlStore } from '../lib/store';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  return (
    <main>
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="shell-main space-y-6">
        <section className="card hero">
          <div className="kicker">Enterprise Ticketing Control Centre</div>
          <h1 className="heading-xl mt-3">Live booking operations with theatre-aware control</h1>
          <p className="subtle mt-4 max-w-3xl">Manage online ticketing, live theatre availability, outage policies, and audit-ready transaction flow from a single command centre.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="btn btn-primary">Book New Tickets</Link>
            <Link href="/reports" className="btn btn-secondary">Open Reports</Link>
            <Link href="/policies" className="btn btn-secondary">Policy Configuration</Link>
          </div>
        </section>
        <section className="stat-grid">
          <div className="card stat-card"><div className="stat-label">Theatre</div><div className="stat-value">{theatre.name}</div><div className="subtle mt-1">{theatre.city}</div></div>
          <div className="card stat-card"><div className="stat-label">Heartbeat</div><div className="stat-value">{theatre.heartbeatStatus}</div><div className="subtle mt-1">Last update monitored live</div></div>
          <div className="card stat-card"><div className="stat-label">Current Authority</div><div className="stat-value">{theatre.currentAuthority}</div><div className="subtle mt-1">Single active booking authority</div></div>
          <div className="card stat-card"><div className="stat-label">Local Endpoint</div><div className="stat-value" style={{fontSize:'17px'}}>{theatre.localPublicUrl || 'Not configured'}</div></div>
        </section>
      </div>
    </main>
  );
}
