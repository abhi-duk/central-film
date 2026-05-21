'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppChrome from '../components/AppChrome';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export default function HomePage() {
  const [data, setData] = useState<any>({ stats: { bookings: 0, tickets: 0, localSynced: 0 }, theatre: {}, shows: [] });
  const [message, setMessage] = useState('Loading central status…');

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(r => r.json())
      .then(out => {
        if (!active) return;
        setData(out);
        setMessage(out?.success ? '' : out?.message || 'Could not load dashboard');
      })
      .catch(() => active && setMessage('Could not reach central API. Check database environment variables.'));
    return () => { active = false; };
  }, []);

  const stats = data?.stats || {};
  const theatre = data?.theatre || {};
  const shows = Array.isArray(data?.shows) ? data.shows : [];

  return <AppChrome title="KSFDC Central Ticketing" status="CENTRAL">
    <div className="hero-card">
      <div>
        <div className="eyebrow">Central control room</div>
        <h1 className="page-title">Bookings, authority and reconciliation</h1>
        <p className="page-subtitle">Central app aligned with the working local theatre server. Local heartbeat controls booking authority. Central fallback can take over only when policy allows it.</p>
      </div>
      <div className="hero-actions"><Link className="btn btn-primary" href="/book">Book Online</Link><Link className="btn btn-secondary" href="/reports">Reports</Link></div>
    </div>
    {message ? <div className="mt-4 rounded-xl border border-soft p-4 text-sm">{message}</div> : null}
    <div className="grid-cards stats-4 mt-4">
      <div className="stat-card"><div className="stat-label">Total bookings</div><div className="stat-value">{Number(stats.bookings || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Tickets sold</div><div className="stat-value">{Number(stats.tickets || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Local synced</div><div className="stat-value">{Number(stats.localSynced || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Last heartbeat</div><div className="stat-value text-xl">{formatWhen(theatre.lastHeartbeatUtc)}</div><div className="stat-help">{theatre.theatreId || 'Waiting for local theatre'}</div></div>
    </div>
    <div className="show-grid mt-6">{shows.map((show: any) => <Link key={show.showId} href={`/book/show/${show.showId}`} className="show-card"><div className="kicker">{show.screenName}</div><div className="mt-3 text-2xl font-black">{show.movieTitle}</div><div className="mt-2 mini-note">{show.theatreName}</div><div className="mt-3 badge">{formatWhen(show.showTimeUtc)}</div></Link>)}</div>
  </AppChrome>;
}
