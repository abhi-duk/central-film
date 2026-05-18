'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Show = { showId: string; movieTitle: string; theatreName: string; timeIso: string; posterUrl?: string };
type SeatMap = Record<string, { status: 'AVAILABLE' | 'HELD' | 'BOOKED'; holdExpiresAt?: string | null }>;

function stableSeatMapSignature(map: SeatMap) {
  return JSON.stringify(
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([seat, value]) => [seat, value.status, value.holdExpiresAt || null])
  );
}

export default function BookingChooser({ theatreId, initialShows }: { theatreId: string; initialShows: Show[] }) {
  const [selectedShow, setSelectedShow] = useState<Show | null>(initialShows[0] ?? null);
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [authority, setAuthority] = useState<'LOCAL' | 'ONLINE' | 'BLOCKED'>('BLOCKED');
  const [heartbeatHealthy, setHeartbeatHealthy] = useState(false);
  const [canBookOnline, setCanBookOnline] = useState(false);
  const [message, setMessage] = useState('');
  const [showOfflineState, setShowOfflineState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [holding, setHolding] = useState(false);

  const firstLoadRef = useRef(true);
  const seatSigRef = useRef('');

  useEffect(() => {
    let alive = true;

    firstLoadRef.current = true;
    seatSigRef.current = '';
    setSeatMap({});
    setSelected([]);
    setLoading(true);
    setRefreshing(false);
    setActionError('');

    const load = async () => {
      if (!selectedShow) return;
      try {
        if (firstLoadRef.current) setLoading(true);
        else setRefreshing(true);

        const res = await fetch(`/api/live/show?showId=${selectedShow.showId}`, { cache: 'no-store' });
        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!alive) return;

        if (!res.ok || !data || !data.success) {
          setMessage('The theatre server could not be checked right now. Please try again.');
          setCanBookOnline(false);
          setShowOfflineState(true);
          setLoading(false);
          setRefreshing(false);
          firstLoadRef.current = false;
          return;
        }

        const nextSeatMap: SeatMap = data.seatMap ?? {};
        const nextSig = stableSeatMapSignature(nextSeatMap);

        if (seatSigRef.current !== nextSig) {
          seatSigRef.current = nextSig;
          setSeatMap(nextSeatMap);
          setSelected(prev => prev.filter(seat => nextSeatMap[seat]?.status === 'AVAILABLE'));
        }

        setAuthority(data.authority);
        setHeartbeatHealthy(!!data.heartbeatHealthy);
        setCanBookOnline(!!data.canBookOnline);
        setMessage(data.message || '');
        setShowOfflineState(!data.canBookOnline);
        setLoading(false);
        setRefreshing(false);
        firstLoadRef.current = false;
      } catch {
        if (!alive) return;
        setMessage('The theatre connection could not be checked right now.');
        setCanBookOnline(false);
        setShowOfflineState(true);
        setLoading(false);
        setRefreshing(false);
        firstLoadRef.current = false;
      }
    };

    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [selectedShow?.showId]);

  const rows = useMemo(() => Array.from(new Set(Object.keys(seatMap || {}).map(seat => seat[0]))), [seatMap]);

  const toggleSeat = (seat: string) => {
    const st = seatMap[seat]?.status;
    if (st === 'BOOKED' || st === 'HELD' || holding) return;
    setSelected(prev => prev.includes(seat) ? prev.filter(x => x !== seat) : [...prev, seat]);
  };

  const startHold = async () => {
    if (!selectedShow || selected.length === 0 || holding) return;
    setHolding(true);
    setActionError('');
    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theatreId, showId: selectedShow.showId, movieTitle: selectedShow.movieTitle, theatreName: selectedShow.theatreName, showTimeIso: selectedShow.timeIso, seatIds: selected })
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (data?.success) window.location.href = `/book/pay?holdId=${encodeURIComponent(data.holdId)}`;
      else setActionError(data?.message || 'Could not hold seats');
    } catch {
      setActionError('Could not hold seats right now. Please try again.');
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-7">
        <div className="kicker">Central online server</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Choose a show and book online</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Pick a show, watch the live seat map, and hold seats safely while payment is being completed.</p>
          </div>
          <div className="nav-chip">Real-time theatre aware</div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {initialShows.map(show => (
            <button key={show.showId} type="button" onClick={() => setSelectedShow(show)} className={`movie-card ${selectedShow?.showId === show.showId ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''}`}>
              <div className="poster-overlay">
                {show.posterUrl ? <img src={show.posterUrl} alt={show.movieTitle} className="poster" /> : <div className="poster bg-slate-800" />}
              </div>
              <div className="relative p-5">
                <div className="text-xl font-semibold">{show.movieTitle}</div>
                <div className="mt-1 text-slate-300">{show.theatreName}</div>
                <div className="mt-2 text-sm text-slate-400">{new Date(show.timeIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">{selectedShow?.movieTitle}</div>
            <div className="text-slate-300">{selectedShow?.theatreName} • {selectedShow ? new Date(selectedShow.timeIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</div>
          </div>
          <div className="nav-chip transition-opacity duration-300">
            {heartbeatHealthy ? 'Healthy via theatre' : authority === 'ONLINE' ? 'Central fallback mode' : 'Offline / blocked'}
          </div>
        </div>
        {message ? <div className="mt-4 rounded-xl bg-slate-800/70 px-4 py-3 text-slate-200 transition-opacity duration-300">{message}</div> : null}

        {showOfflineState ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 transition-all duration-300">
            <div className="text-xl font-bold">This theatre is offline right now</div>
            <div className="mt-2 text-red-100/90">Please go back and try again later or choose another theatre once the connection is stable.</div>
            <Link href="/" className="btn btn-secondary mt-5 inline-block">Back to theatre selection</Link>
          </div>
        ) : loading ? (
          <div className="mt-6 text-slate-300">Loading seat layout...</div>
        ) : (
          <>
            <div className="mx-auto mt-6 mb-5 max-w-3xl rounded-full bg-slate-700 py-3 text-center text-sm tracking-[0.3em] text-slate-200">SCREEN</div>
            <div className="mb-3 min-h-[20px] text-xs text-slate-400">{refreshing ? 'Refreshing live seat status…' : '\u00A0'}</div>
            <div className="seat-grid-wrap">
              <div className="seat-grid">
                {rows.map(row => (
                  <React.Fragment key={row}>
                    <div className="flex items-center justify-center text-slate-400 font-bold">{row}</div>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const seat = `${row}${i + 1}`;
                      const status = seatMap[seat]?.status || 'AVAILABLE';
                      const cls = selected.includes(seat) ? 'seat seat-selected' : status === 'BOOKED' ? 'seat seat-booked' : status === 'HELD' ? 'seat seat-held' : 'seat seat-available';
                      return <button key={seat} type="button" className={cls} onClick={() => toggleSeat(seat)}>{i + 1}</button>;
                    })}
                    <div />
                    {Array.from({ length: 8 }).map((_, i) => {
                      const seat = `${row}${i + 9}`;
                      const status = seatMap[seat]?.status || 'AVAILABLE';
                      const cls = selected.includes(seat) ? 'seat seat-selected' : status === 'BOOKED' ? 'seat seat-booked' : status === 'HELD' ? 'seat seat-held' : 'seat seat-available';
                      return <button key={seat} type="button" className={cls} onClick={() => toggleSeat(seat)}>{i + 9}</button>;
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="mt-3 min-h-[24px] text-sm text-red-300">{actionError || '\u00A0'}</div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950 p-4">
              <div><div className="text-slate-400 text-sm">Selected seats</div><div className="mt-1 font-semibold">{selected.length ? selected.join(', ') : 'None selected'}</div></div>
              <button type="button" className={`btn ${selected.length && !holding ? 'btn-primary' : 'btn-secondary opacity-60 cursor-not-allowed'}`} disabled={!selected.length || holding} onClick={startHold}>
                {holding ? 'Holding seats…' : 'Hold seats and continue to payment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
