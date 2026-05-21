'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppChrome from '../../components/AppChrome';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export default function BookPage() {
  const [shows, setShows] = useState<any[]>([]);
  const [message, setMessage] = useState('Loading shows…');

  useEffect(() => {
    let active = true;
    fetch('/api/shows', { cache: 'no-store' })
      .then(r => r.json())
      .then(out => {
        if (!active) return;
        setShows(Array.isArray(out?.shows) ? out.shows : []);
        setMessage(out?.success ? '' : out?.message || 'Could not load shows');
      })
      .catch(() => active && setMessage('Could not reach central API. Check database environment variables.'));
    return () => { active = false; };
  }, []);

  return <AppChrome title="Central Online Booking" status="ONLINE MODULE">
    <div className="hero-card"><div><div className="eyebrow">Select show</div><h1 className="page-title">Central online ticket booking</h1><p className="page-subtitle">When local theatre heartbeat is healthy, central online booking is paused. When local times out and fallback policy is enabled, these pages can book seats.</p></div></div>
    {message ? <div className="mt-4 rounded-xl border border-soft p-4 text-sm">{message}</div> : null}
    <div className="show-grid mt-6">{shows.map(show => <Link key={show.showId} href={`/book/show/${show.showId}`} className="show-card"><div className="kicker">{show.screenName}</div><div className="mt-3 text-2xl font-black">{show.movieTitle}</div><div className="mt-2 mini-note">{show.theatreName}</div><div className="mt-3 badge">{formatWhen(show.showTimeUtc)}</div></Link>)}</div>
  </AppChrome>;
}
