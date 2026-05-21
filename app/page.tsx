import Link from 'next/link';
import { getReportStore } from '@/lib/store';

export default async function HomePage() {
  const store = await getReportStore();
  const statusClass = store.theatreStatus === 'ONLINE' ? 'status-online' : store.theatreStatus === 'RECOVERING' ? 'status-recovering' : store.theatreStatus === 'DEGRADED' ? 'status-degraded' : 'status-offline';
  return (
    <div>
      <section className="hero-card">
        <div>
          <div className="eyebrow">Central Theatre Platform</div>
          <h1 className="page-title">Hybrid booking control room</h1>
          <p className="page-subtitle">Public booking, theatre heartbeat, sync recovery and reconciliation in one compact prototype.</p>
        </div>
        <div className="kicker"><span className={statusClass}>{store.theatreStatus}</span></div>
      </section>

      <section className="grid grid-4">
        <div className="card"><div className="eyebrow">Pending Sync</div><div className="stat-value">{store.syncCounts.pending}</div><p>Rows waiting for central acknowledgement.</p></div>
        <div className="card"><div className="eyebrow">Synced</div><div className="stat-value">{store.syncCounts.synced}</div><p>Bookings already copied to the central audit DB.</p></div>
        <div className="card"><div className="eyebrow">Failed</div><div className="stat-value">{store.syncCounts.failed}</div><p>Rows available for retry without blocking live sales.</p></div>
        <div className="card"><div className="eyebrow">Conflicts</div><div className="stat-value">{store.syncCounts.conflicts}</div><p>Seat or booking mismatches requiring manual review.</p></div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Public booking</h3>
          <p>Choose a show, view live seat map with zones and pricing, hold seats and confirm payment.</p>
          <Link className="btn btn-primary" href="/book" style={{ marginTop: 18 }}>Open booking</Link>
        </div>
        <div className="card">
          <h3>Reports and reconciliation</h3>
          <p>Check confirmed, pending and synced records. Safe array guards prevent the earlier QueryResult type failure.</p>
          <Link className="btn btn-secondary" href="/reports" style={{ marginTop: 18 }}>Open reports</Link>
        </div>
      </section>
    </div>
  );
}
