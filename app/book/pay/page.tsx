'use client';

import { useEffect, useMemo, useState } from 'react';

export default function PayPage() {
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const holdId = params.get('holdId') || '';
  const [seconds, setSeconds] = useState(20);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (seconds === 0 && holdId) {
      setMessage('Hold time expired. Releasing seats...');
      fetch('/api/bookings/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId }) })
        .finally(() => { window.location.href = '/book'; });
    }
  }, [seconds, holdId]);

  const act = async (kind: 'success' | 'fail') => {
    if (working) return;
    setWorking(true);
    setMessage(kind === 'success' ? 'Finalising booking…' : 'Releasing held seats…');
    try {
      const url = kind === 'success' ? '/api/bookings/confirm' : '/api/bookings/release';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdId }) });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (kind === 'success') {
        if (data?.success && data?.bookingId) {
          window.location.href = `/ticket/${encodeURIComponent(data.bookingId)}`;
          return;
        }
        setMessage(data?.message || 'Could not confirm booking. Seats are still held until timer ends or you release them.');
      } else {
        window.location.href = '/book';
        return;
      }
    } catch {
      setMessage(kind === 'success' ? 'Could not confirm booking right now. Seats are still held until timer ends.' : 'Could not release seats right now.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-xl card p-6">
        <div className="text-sm tracking-[0.3em] uppercase text-cyan-300">Payment simulation</div>
        <h1 className="mt-2 text-3xl font-bold">Complete payment within {seconds}s</h1>
        <p className="mt-3 text-slate-300">The selected seats are on hold. Other users cannot take them during this timer.</p>
        <div className="mt-4 min-h-[24px] text-sm text-amber-300">{message || '\u00A0'}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" disabled={working} onClick={() => act('success')}>Payment success and issue ticket</button>
          <button className="btn btn-danger" disabled={working} onClick={() => act('fail')}>Payment failed and release seats</button>
        </div>
      </div>
    </main>
  );
}
