import Link from 'next/link';
import ConnectionBanner from '../components/ConnectionBanner';
import { markTimedOutTheatres, readMysqlStore } from '../lib/store';

export default async function HomePage() {
  await markTimedOutTheatres(Number(process.env.HEARTBEAT_TIMEOUT_SECONDS || 30));
  const store = await readMysqlStore();
  const theatre = store.theatres[0];
  return (
    <main className="min-h-screen">
      <ConnectionBanner theatreId={theatre.theatreId} />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="card p-6">
          <div className="text-cyan-300 text-sm tracking-[0.3em] uppercase">Hybrid Film Demo</div>
          <h1 className="mt-2 text-4xl font-bold">Central Online Booking</h1>
          <p className="mt-3 text-slate-300">Live theatre-aware online booking with heartbeat, policy, and print-ready ticket issue.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-4"><div className="text-slate-400 text-sm">Theatre</div><div className="mt-1 text-xl font-semibold">{theatre.name}</div></div>
            <div className="card p-4"><div className="text-slate-400 text-sm">Heartbeat</div><div className="mt-1 text-xl font-semibold">{theatre.heartbeatStatus}</div></div>
            <div className="card p-4"><div className="text-slate-400 text-sm">Authority</div><div className="mt-1 text-xl font-semibold">{theatre.currentAuthority}</div></div>
          </div>
          <div className="mt-6 flex gap-3">
            <Link href="/book" className="btn btn-primary">Start online booking</Link>
            <Link href="/reports" className="btn btn-secondary">View central reports</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
