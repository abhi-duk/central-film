'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Pricing, SeatClass, Show } from '@/lib/types';

type SeatMap = Record<string, { status: 'AVAILABLE' | 'HELD' | 'BOOKED'; holdExpiresAt?: string | null }>;
type SeatClasses = Record<string, SeatClass>;

function stableSeatMapSignature(map: SeatMap) {
  return JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([s, v]) => [s, v.status, v.holdExpiresAt || null]));
}
function money(n: number) { return `₹${n.toFixed(2)}`; }
function computePricing(selected: string[], seatClasses: SeatClasses, pricing?: Pricing | null) {
  if (!pricing) return { net: 0, gst: 0, entertainmentTax: 0, cess: 0, total: 0 };
  const net = selected.reduce((sum, seat) => sum + (seatClasses[seat] === 'PREMIUM' ? pricing.premiumRate : seatClasses[seat] === 'EXECUTIVE' ? pricing.executiveRate : pricing.economyRate), 0);
  const gst = +(net * pricing.gstPct / 100).toFixed(2);
  const entertainmentTax = +(net * pricing.entertainmentTaxPct / 100).toFixed(2);
  const cess = +(net * pricing.cessPct / 100).toFixed(2);
  const total = +(net + gst + entertainmentTax + cess).toFixed(2);
  return { net, gst, entertainmentTax, cess, total };
}

export default function BookingChooser({ theatreId, initialShows }: { theatreId: string; initialShows: Show[] }) {
  const [selectedShow, setSelectedShow] = useState<Show | null>(initialShows[0] ?? null);
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  const [seatClasses, setSeatClasses] = useState<SeatClasses>({});
  const [pricing, setPricing] = useState<Pricing | null>(initialShows[0]?.pricing || null);
  const [selected, setSelected] = useState<string[]>([]);
  const [authority, setAuthority] = useState<'LOCAL' | 'ONLINE' | 'BLOCKED'>('BLOCKED');
  const [heartbeatHealthy, setHeartbeatHealthy] = useState(false);
  const [canBookOnline, setCanBookOnline] = useState(false);
  const [message, setMessage] = useState('');
  const [showOfflineState, setShowOfflineState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const versionRef = useRef(0);
  const [actionError, setActionError] = useState('');
  const [holding, setHolding] = useState(false);
  const firstLoadRef = useRef(true);
  const seatSigRef = useRef('');

  useEffect(() => {
    let alive = true;
    firstLoadRef.current = true;
    seatSigRef.current = '';
    setSeatMap({});
    setSeatClasses({});
    setSelected([]);
    setLoading(true);
    setRefreshing(false);
    setActionError('');

    const load = async () => {
      if (!selectedShow) return;
      try {
        if (firstLoadRef.current) setLoading(true); else setRefreshing(true);
        const res = await fetch(`/api/live/show?showId=${selectedShow.showId}${versionRef.current ? `&ifVersion=${versionRef.current}` : ''}`, { cache: 'no-store' });
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }
        if (!alive) return;
        if (!res.ok || !data || !data.success) {
          setMessage('The theatre server could not be checked right now.');
          setCanBookOnline(false);
          setShowOfflineState(true);
          setLoading(false);
          setRefreshing(false);
          firstLoadRef.current = false;
          return;
        }
        if (data.versionNo) versionRef.current = data.versionNo;
        const nextSeatMap: SeatMap = data.seatMap ?? {};
        const nextSig = stableSeatMapSignature(nextSeatMap);
        if (seatSigRef.current !== nextSig) {
          seatSigRef.current = nextSig;
          setSeatMap(nextSeatMap);
          setSelected((prev) => prev.filter((seat) => nextSeatMap[seat]?.status === 'AVAILABLE'));
        }
        setSeatClasses(data.seatClasses || {});
        setPricing(data.pricing || null);
        if (data.show) setSelectedShow((prev) => prev ? ({ ...prev, ...data.show, timeIso: data.show.time }) : prev);
        setAuthority(data.authority);
        setHeartbeatHealthy(Boolean(data.heartbeatHealthy));
        setCanBookOnline(Boolean(data.canBookOnline));
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
    return () => { alive = false; clearInterval(timer); };
  }, [selectedShow?.showId]);

  const rows = useMemo(() => Array.from(new Set(Object.keys(seatMap || {}).map((seat) => seat[0]))), [seatMap]);
  const amounts = useMemo(() => computePricing(selected, seatClasses, pricing), [selected, seatClasses, pricing]);

  const toggleSeat = (seat: string) => {
    const status = seatMap[seat]?.status;
    if (status === 'BOOKED' || status === 'HELD' || holding || !canBookOnline) return;
    setSelected((prev) => prev.includes(seat) ? prev.filter((x) => x !== seat) : [...prev, seat]);
  };

  const startHold = async () => {
    if (!selectedShow || selected.length === 0 || holding) return;
    setHolding(true);
    setActionError('');
    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theatreId, showId: selectedShow.showId, movieTitle: selectedShow.movieTitle, theatreName: selectedShow.theatreName, showTimeIso: selectedShow.timeIso, seatIds: selected, pricing, seatClasses }),
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (data?.success) {
        const holdToken = data.holdToken ? `&holdToken=${encodeURIComponent(data.holdToken)}` : '';
        window.location.href = `/book/pay?holdId=${encodeURIComponent(data.holdId)}&showId=${encodeURIComponent(data.showId || selectedShow.showId)}${holdToken}`;
      }
      else setActionError(data?.message || 'Could not hold seats');
    } catch {
      setActionError('Could not hold seats right now. Please try again.');
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Online Booking</div>
          <h1 className="page-title">Choose show and seats</h1>
          <p className="page-subtitle">Live theatre seat checks, zone pricing and recovery-aware booking.</p>
        </div>
        <div className="kicker">{heartbeatHealthy ? 'LIVE THEATRE' : authority === 'ONLINE' ? 'CENTRAL FALLBACK' : 'PAUSED'}</div>
      </div>

      <div className="show-grid">
        {initialShows.map((show) => (
          <button key={show.showId} type="button" onClick={() => setSelectedShow(show)} className="show-card">
            <div className="poster" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.45)), url(${show.showId === 'SHOW_EMP_001' ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=900&auto=format&fit=crop'})` }} />
            <div className="stat-value" style={{ fontSize: 24 }}>{show.movieTitle}</div>
            <div className="mini-note">{show.theatreName}</div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}><span className="seat-pill">{show.dayLabel}</span><span className="seat-pill">{show.slot}</span><span className="seat-pill">{show.timeLabel}</span></div>
          </button>
        ))}
      </div>

      <div className="seat-page">
        <div className="seat-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="stat-value" style={{ fontSize: 26 }}>{selectedShow?.movieTitle}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><span className="seat-pill">{selectedShow?.dayLabel}</span><span className="seat-pill">{selectedShow?.dateLabel}</span><span className="seat-pill">{selectedShow?.timeLabel}</span></div>
            </div>
            <div className="seat-pill">{refreshing ? 'Refreshing live seat status…' : 'Live status stable'}</div>
          </div>
          {message ? <div className="compact-card" style={{ padding: 14, marginTop: 16 }}>{message}</div> : null}
          {showOfflineState ? (
            <div className="compact-card" style={{ padding: 24, marginTop: 22 }}>
              <div className="stat-value" style={{ fontSize: 22 }}>This theatre is offline or recovering</div>
              <div className="mini-note">Booking resumes after heartbeat, local DB and booking API checks pass.</div>
              <Link href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to dashboard</Link>
            </div>
          ) : loading ? (
            <div style={{ marginTop: 20 }}>Loading seat layout…</div>
          ) : (
            <>
              <div style={{ margin: '24px auto 18px', maxWidth: 720, borderRadius: 999, background: 'rgba(0,0,0,.25)', padding: 12, textAlign: 'center', letterSpacing: '.3em' }}>SCREEN</div>
              <div className="seat-grid-wrap"><div className="seat-grid">
                {rows.map((row) => <React.Fragment key={row}>
                  {row === 'A' && <div className="zone-row">Premium Circle • ₹{pricing?.premiumRate ?? 0} / seat</div>}
                  {row === 'D' && <div className="zone-row">Executive Circle • ₹{pricing?.executiveRate ?? 0} / seat</div>}
                  {row === 'G' && <div className="zone-row">Economy Circle • ₹{pricing?.economyRate ?? 0} / seat</div>}
                  <div style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 900 }}>{row}</div>
                  {Array.from({ length: 8 }).map((_, i) => { const seat = `${row}${i + 1}`; const status = seatMap[seat]?.status || 'AVAILABLE'; const cls = selected.includes(seat) ? 'seat seat-selected' : status === 'BOOKED' ? 'seat seat-booked' : status === 'HELD' ? 'seat seat-held' : 'seat seat-available'; return <button key={seat} type="button" className={cls} onClick={() => toggleSeat(seat)}>{i + 1}</button>; })}
                  <div />
                  {Array.from({ length: 8 }).map((_, i) => { const seat = `${row}${i + 9}`; const status = seatMap[seat]?.status || 'AVAILABLE'; const cls = selected.includes(seat) ? 'seat seat-selected' : status === 'BOOKED' ? 'seat seat-booked' : status === 'HELD' ? 'seat seat-held' : 'seat seat-available'; return <button key={seat} type="button" className={cls} onClick={() => toggleSeat(seat)}>{i + 9}</button>; })}
                </React.Fragment>)}
              </div></div>
            </>
          )}
        </div>
        <aside className="seat-panel">
          <div className="eyebrow">Selection summary</div>
          <div className="stat-value">{selected.length}</div>
          <div className="mini-note">Seat(s) selected</div>
          <div style={{ marginTop: 14, fontWeight: 800 }}>{selected.length ? selected.join(', ') : 'Choose seats to continue'}</div>
          <div style={{ marginTop: 20 }}>
            <div className="summary-line"><span>Net amount</span><strong>{money(amounts.net)}</strong></div>
            <div className="summary-line"><span>GST</span><strong>{money(amounts.gst)}</strong></div>
            <div className="summary-line"><span>Entertainment Tax</span><strong>{money(amounts.entertainmentTax)}</strong></div>
            <div className="summary-line"><span>Cess</span><strong>{money(amounts.cess)}</strong></div>
          </div>
          <div className="summary-total"><span>Total</span><span>{money(amounts.total)}</span></div>
          <div style={{ minHeight: 24, color: 'var(--danger)' }}>{actionError || '\u00A0'}</div>
          <button type="button" className="btn btn-primary" disabled={!selected.length || holding || showOfflineState} onClick={startHold} style={{ width: '100%', opacity: selected.length && !holding && !showOfflineState ? 1 : .55 }}>{holding ? 'Holding seats…' : 'Hold seats and continue'}</button>
        </aside>
      </div>
    </div>
  );
}
