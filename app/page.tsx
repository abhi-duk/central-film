import Link from 'next/link';
import ConnectionBanner from '../components/ConnectionBanner';
import { markTimedOutTheatres, readMysqlStore } from '../lib/store';

export default async function HomePage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  return (
    <main className="app-shell">
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="page-wrap page-animate space-y-6">
        <section className="hero-grid">
          <div className="card p-7 sm:p-8">
            <div className="kicker">Hybrid film operations</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Beautiful central online booking for a live theatre node</h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Central booking watches the theatre heartbeat, respects outage policy, and confirms seats with the theatre whenever local authority is active.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/book" className="btn btn-primary">Start online booking</Link>
              <Link href="/reports" className="btn btn-secondary">View central reports</Link>
            </div>
          </div>
          <div className="card p-6">
            <div className="kicker">Current theatre</div>
            <div className="mt-3 text-2xl font-bold">{theatre.name}</div>
            <div className="mt-1 text-slate-300">{theatre.city}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="metric"><div className="text-sm text-slate-400">Heartbeat</div><div className="metric-value">{theatre.heartbeatStatus}</div></div>
              <div className="metric"><div className="text-sm text-slate-400">Authority</div><div className="metric-value">{theatre.currentAuthority}</div></div>
              <div className="metric"><div className="text-sm text-slate-400">Working hours</div><div className="metric-value text-lg">{theatre.workingHoursStart.slice(0,5)} - {theatre.workingHoursEnd.slice(0,5)}</div></div>
              <div className="metric"><div className="text-sm text-slate-400">Connection mode</div><div className="metric-value text-lg">{theatre.health.appHealthy && theatre.health.bookingApiHealthy ? 'Ready' : 'Attention needed'}</div></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="card-soft p-5">
            <div className="kicker">Working-hours outage</div>
            <div className="mt-3 text-2xl font-bold">{theatre.outageModeWorkingHours.replace('_', ' ')}</div>
            <p className="mt-2 text-sm text-slate-300">What happens while counters are expected to be active.</p>
          </div>
          <div className="card-soft p-5">
            <div className="kicker">Off-hours outage</div>
            <div className="mt-3 text-2xl font-bold">{theatre.outageModeOffHours.replace('_', ' ')}</div>
            <p className="mt-2 text-sm text-slate-300">What happens when online sales may continue without counter activity.</p>
          </div>
          <div className="card-soft p-5">
            <div className="kicker">Local route</div>
            <div className="mt-3 break-all text-base font-semibold text-slate-100">{theatre.localPublicUrl || 'No theatre URL set yet'}</div>
            <p className="mt-2 text-sm text-slate-300">This should be your LAN URL locally or the Cloudflare tunnel URL for public access.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
