'use client';

import PageShell from '@/components/PageShell';
import { useEffect, useMemo, useState } from 'react';

export default function PaymentPage() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const holdId = params.get('holdId') || '';
  const sessionId = params.get('sessionId') || '';
  const showId = params.get('showId') || '';
  const [remaining, setRemaining] = useState(20);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setRemaining(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining !== 0) return;
    fetch('/api/bookings/release', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ holdId, sessionId }) }).catch(()=>{});
  }, [remaining, holdId, sessionId]);

  const act = async (success: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(success ? '/api/bookings/confirm' : '/api/bookings/release', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ holdId, sessionId, showId })
      });
      const data = await res.json();
      if (!data.success) { setMessage(data.message || 'Could not complete action'); return; }
      if (success) window.location.href = `/ticket/${encodeURIComponent(data.bookingId)}`;
      else window.location.href = '/book';
    } catch {
      setMessage('The request could not be completed.');
    } finally { setBusy(false); }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.3em] text-cyan-300">Payment simulation</div>
        <h1 className="mt-3 text-4xl font-black">Seats are held for {remaining} seconds</h1>
        <p className="mt-3 text-slate-300">Use this page to simulate payment success or failure. If you do nothing, the hold expires and the seats go back on sale.</p>
        <div className="mt-6 grid gap-4 rounded-3xl bg-slate-800/60 p-6 sm:grid-cols-3">
          <div><div className="text-sm text-slate-400">Hold ID</div><div className="mt-1 font-bold break-all">{holdId}</div></div>
          <div><div className="text-sm text-slate-400">Session</div><div className="mt-1 font-bold break-all">{sessionId}</div></div>
          <div><div className="text-sm text-slate-400">Time left</div><div className="mt-1 text-3xl font-black text-cyan-300">{remaining}s</div></div>
        </div>
        {message && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">{message}</div>}
        <div className="mt-6 flex flex-wrap gap-4">
          <button disabled={busy || remaining===0} onClick={() => act(true)} className="rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400">Payment success and issue ticket</button>
          <button disabled={busy} onClick={() => act(false)} className="rounded-2xl border border-white/15 px-6 py-4 font-black text-white">Payment failed. Release seats</button>
        </div>
      </div>
    </PageShell>
  );
}
