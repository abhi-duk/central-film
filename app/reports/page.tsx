'use client';

import { useEffect, useState } from 'react';
import AppChrome from '../../components/AppChrome';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export default function ReportsPage() {
  const [data, setData] = useState<any>({ stats: { confirmed: 0, tickets: 0, local: 0, pendingPayments: 0 }, bookings: [] });
  const [message, setMessage] = useState('Loading reports…');

  useEffect(() => {
    let active = true;
    fetch('/api/reports', { cache: 'no-store' })
      .then(r => r.json())
      .then(out => {
        if (!active) return;
        setData(out);
        setMessage(out?.success ? '' : out?.message || 'Could not load reports');
      })
      .catch(() => active && setMessage('Could not reach central API. Check database environment variables.'));
    return () => { active = false; };
  }, []);

  const stats = data?.stats || {};
  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];

  return <AppChrome title="Reports & Reconciliation" status="CENTRAL">
    {message ? <div className="mb-4 rounded-xl border border-soft p-4 text-sm">{message}</div> : null}
    <div className="grid-cards stats-4">
      <div className="stat-card"><div className="stat-label">Confirmed bookings</div><div className="stat-value">{Number(stats.confirmed || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Tickets</div><div className="stat-value">{Number(stats.tickets || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Local synced</div><div className="stat-value">{Number(stats.local || 0)}</div></div>
      <div className="stat-card"><div className="stat-label">Pending payments</div><div className="stat-value">{Number(stats.pendingPayments || 0)}</div></div>
    </div>
    <div className="table-card mt-6"><table><thead><tr><th>Ticket</th><th>Movie</th><th>Seats</th><th>Source</th><th>Status</th><th>Confirmed</th></tr></thead><tbody>{bookings.map((b: any) => <tr key={b.bookingId}><td>{b.ticketNumber}</td><td>{b.movieTitle}</td><td>{(b.seats || []).join(', ')}</td><td>{b.bookingSource}</td><td>{b.reconciliationStatus}</td><td>{formatWhen(b.confirmedAtUtc)}</td></tr>)}</tbody></table></div>
  </AppChrome>;
}
